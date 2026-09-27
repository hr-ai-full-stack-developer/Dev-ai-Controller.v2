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
    systemPrompt: 'You are Devai Controller. Answer clearly. You have no action tools in this chat response. Never claim to have sent email, edited files, deployed, scheduled, or tested anything. Direct users to the Coding Agent for draft pull requests and Deployments for release actions. The automation scheduler and password recovery are not configured. Do not invent service status, repository data, or provider results.' });
  return { aiProvider: completion.provider, model: completion.model, message: completion.text, actionExecuted: 'ai.respond', provider: 'system', status: 'success' as const,
    steps: [{ title: 'Generated a response', status: 'completed' as const }] };
}
