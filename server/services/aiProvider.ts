import { cleanResponseText } from '../responseText.js';

export interface AiCompletionOptions {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  forceFallback?: boolean;
  preserveFormatting?: boolean;
}

export interface AiCompletionResult {
  text: string;
  provider: 'cloudflare_ai' | 'openai_fallback';
  model: string;
  latencyMs: number;
  tokensUsed?: number;
}

let aiBinding: { run(model: string, input: any): Promise<any> } | undefined;
export function setAiBinding(binding: typeof aiBinding) { aiBinding = binding; }

const CLEAN_FORMAT_INSTRUCTION = `
CRITICAL FORMATTING INSTRUCTIONS:
1. NEVER use markdown asterisks (no ***, no **, no *).
2. NEVER use raw divider dashes (no ---, no - -).
3. Use clean capitalized section titles, clear paragraph line breaks, numbered steps (1. 2. 3.), or clean bullet dots (•).
4. Provide structured, immaculate responses.`;

/**
 * Universal AI Completion function
 * Primary: Cloudflare Workers AI
 * Secondary/Fallback: OpenAI (or server fallback)
 */
export async function generateCompletion(
  options: AiCompletionOptions
): Promise<AiCompletionResult> {
  const startTime = Date.now();
  const cfAccount = process.env.CLOUDFLARE_ACCOUNT_ID;
  const cfToken = process.env.CLOUDFLARE_API_TOKEN;
  const openAiKey = process.env.OPENAI_API_KEY;

  const augmentedSystemPrompt = (options.systemPrompt || '') + (options.preserveFormatting ? '' : CLEAN_FORMAT_INSTRUCTION);

  if (!options.forceFallback && aiBinding) {
    try {
      const model = process.env.PRIMARY_AI_MODEL || '@cf/meta/llama-3.3-70b-instruct';
      const result = await aiBinding.run(model, { messages: [{ role: 'system', content: augmentedSystemPrompt }, { role: 'user', content: options.prompt }], max_tokens: options.maxTokens || 2048 });
      if (result.response) return { text: (options.preserveFormatting ? result.response : cleanResponseText(result.response)), provider: 'cloudflare_ai', model, latencyMs: Date.now() - startTime };
    } catch (error) { console.warn('Workers AI request failed'); }
  }

  // 1. Try Primary Cloudflare AI (unless forceFallback requested)
  if (!options.forceFallback && cfAccount && cfToken && !cfToken.includes('Demo')) {
    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${cfAccount}/ai/run/@cf/meta/llama-3.3-70b-instruct`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${cfToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [
              { role: 'system', content: augmentedSystemPrompt },
              { role: 'user', content: options.prompt },
            ],
            max_tokens: options.maxTokens || 2048,
            temperature: options.temperature ?? 0.2,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const text = data.result?.response || data.result?.text || '';
        if (text) {
          return {
            text: (options.preserveFormatting ? text : cleanResponseText(text)),
            provider: 'cloudflare_ai',
            model: '@cf/meta/llama-3.3-70b-instruct',
            latencyMs: Date.now() - startTime,
          };
        }
      }
      console.warn('Cloudflare AI primary returned non-OK, invoking fallback...');
    } catch (cfErr) {
      console.warn('Cloudflare AI call failed, invoking fallback:', cfErr);
    }
  }

  // 2. Try Secondary/Fallback: OpenAI
  if (openAiKey && !openAiKey.includes('Demo')) {
    try {
      const openAiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openAiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: augmentedSystemPrompt },
            { role: 'user', content: options.prompt },
          ],
          temperature: options.temperature ?? 0.2,
          max_tokens: options.maxTokens || 2048,
        }),
      });

      if (openAiRes.ok) {
        const data = await openAiRes.json();
        const text = data.choices?.[0]?.message?.content || '';
        return {
          text: (options.preserveFormatting ? text : cleanResponseText(text)),
          provider: 'openai_fallback',
          model: 'gpt-4o-mini',
          latencyMs: Date.now() - startTime,
          tokensUsed: data.usage?.total_tokens,
        };
      }
    } catch (openAiErr) {
      console.warn('OpenAI fallback call failed:', openAiErr);
    }
  }

  throw new Error('No AI provider could complete the request. Check your configured AI connection and try again.');
}
