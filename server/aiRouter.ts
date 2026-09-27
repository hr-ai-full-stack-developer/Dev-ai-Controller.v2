import { generateCompletion } from './services/aiProvider.js';
import { listGitHubRepos } from './services/github.js';
import { getServicesStatus } from './services/statusService.js';
export { cleanResponseText } from './responseText.js';

export async function executeAiAction(prompt: string, _selectedTokenId?: string): Promise<{
  message: string; actionExecuted: string; provider: string; status: 'success'; resultData?: unknown; logId?: string;
  steps: Array<{ title: string; status: 'completed' }>; aiProvider?: 'cloudflare_ai' | 'openai_fallback'; model?: string;
}> {
  if (/(list|show|get).*(repositories|repos)/i.test(prompt)) {
    if (!process.env.GITHUB_TOKEN) throw new Error('GitHub access is not configured.');
    const repositories = await listGitHubRepos(process.env.GITHUB_TOKEN);
    return { message: repositories.length ? repositories.map(r => `${r.fullName}: ${r.htmlUrl}`).join('\n') : 'No repositories were returned by GitHub.', actionExecuted: 'github.list_repos', provider: 'github', status: 'success' as const,
      resultData: repositories, steps: [{ title: 'Read repositories from GitHub', status: 'completed' as const }] };
  }
  if (/(check|show|verify).*(service status|system health|connections)/i.test(prompt)) {
    const result = await getServicesStatus();
    return { message: Object.values(result.services).map(s => `${s.name}: ${s.status}. ${s.details}`).join('\n'), actionExecuted: 'services.status', provider: 'system', status: 'success' as const,
      resultData: result, steps: [{ title: 'Read service connection results', status: 'completed' as const }] };
  }
  const completion = await generateCompletion({ prompt,
    systemPrompt: `You are Dev’ai, a helpful assistant for people with any level of technical experience.

Response style:
- Start with the direct answer. Use natural, friendly English and correct grammar.
- Prefer everyday words. If a technical term is necessary, explain it briefly the first time.
- Keep paragraphs short and use bullets only when they make the answer easier to scan.
- Do not dump internal architecture, implementation details, acronyms, model names, IDs, logs, or step-by-step reasoning unless the user asks for them.
- Match the user's level of detail. For a simple question, give a simple answer.
- Say what the user can do next when that is useful.
- Never say an action succeeded unless this request actually performed and verified it.
- You have no action tools in this chat response. Never claim to have sent email, edited files, deployed, scheduled, tested, or changed an account.
- For code changes, direct the user to Coding Agent, which can prepare a draft pull request for review.
- For releases, direct the user to Deployments.
- Scheduling and password recovery are currently unavailable.
- Never invent service status, repository data, provider results, knowledge, or account configuration.
- If you do not know, say so plainly and suggest the safest way to check.
` });
  return { aiProvider: completion.provider, model: completion.model, message: completion.text, actionExecuted: 'ai.respond', provider: 'system', status: 'success' as const,
    steps: [{ title: 'Generated a response', status: 'completed' as const }] };
}
