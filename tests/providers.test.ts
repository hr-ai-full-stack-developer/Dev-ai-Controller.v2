import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateCompletion, setAiBinding } from '../server/services/aiProvider.js';
import { triggerDeployment, rollbackDeployment } from '../server/services/deploymentsService.js';
import { executeAiAction } from '../server/aiRouter.js';

test('Workers AI binding preserves source code in structured coding responses', async () => {
  const source = '{"files":[{"content":"const x = 2 * 3; // ---"}]}';
  setAiBinding({ run: async () => ({ response: source }) });
  const result = await generateCompletion({ prompt: 'local test', preserveFormatting: true });
  assert.equal(result.text, source); assert.equal(result.provider, 'cloudflare_ai');
  setAiBinding(undefined);
});

test('deployment controls use provider version IDs and report provider rejection', async () => {
  const originalFetch = globalThis.fetch;
  process.env.CLOUDFLARE_ACCOUNT_ID = 'local-test-account';
  process.env.CLOUDFLARE_API_TOKEN = 'local-test-token';
  const posts: any[] = [];
  globalThis.fetch = (async (url: any, init: any) => {
    if (init?.method === 'POST') { posts.push(JSON.parse(init.body)); return Response.json({ success: true, result: { id: 'real-provider-deployment-id' } }); }
    if (String(url).endsWith('/versions')) return Response.json({ success: true, result: { items: [{ id: 'uploaded-version' }] } });
    return Response.json({ success: true, result: { deployments: [{ versions: [{ version_id: 'current', percentage: 100 }] }, { versions: [{ version_id: 'previous', percentage: 100 }] }] } });
  }) as typeof fetch;
  try {
    const result = await triggerDeployment('test-worker');
    assert.equal(result.deploymentId, 'real-provider-deployment-id');
    assert.equal(posts[0].versions[0].version_id, 'uploaded-version');
    await rollbackDeployment('test-worker');
    assert.equal(posts[1].versions[0].version_id, 'previous');
    globalThis.fetch = (async () => Response.json({ success: false, errors: [{ message: 'Denied' }] }, { status: 403 })) as typeof fetch;
    await assert.rejects(() => triggerDeployment('test-worker'), /Denied/);
  } finally {
    globalThis.fetch = originalFetch; delete process.env.CLOUDFLARE_ACCOUNT_ID; delete process.env.CLOUDFLARE_API_TOKEN;
  }
});

test('assistant prompt requires plain language and forbids invented actions', async () => {
  let captured: any;
  setAiBinding({ run: async (_model: string, input: any) => { captured = input; return { response: 'I can explain that simply.' }; } });
  try {
    const result = await executeAiAction('What can you help me with?');
    assert.equal(result.message, 'I can explain that simply.');
    const system = captured.messages?.find((m: any) => m.role === 'system')?.content || '';
    assert.match(system, /everyday words/i);
    assert.match(system, /technical term/i);
    assert.match(system, /Never claim/i);
    assert.match(system, /do not know/i);
  } finally {
    setAiBinding(undefined);
  }
});

test('common service question returns real status path instead of invented AI status', async () => {
  const result = await executeAiAction('Can you check service status and connections?');
  assert.equal(result.actionExecuted, 'services.status');
  assert.equal(result.provider, 'system');
  assert.ok(result.message.length > 0);
});

test('GitHub token check does not invent repository scope when header is absent', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => Response.json({ login: 'developer', public_repos: 3 }, { status: 200 })) as typeof fetch;
  try {
    const { testGitHubToken } = await import('../server/services/github.js');
    const result = await testGitHubToken('test-token');
    assert.equal(result.valid, true);
    assert.equal(result.user, 'developer');
    assert.deepEqual(result.scopes, []);
    assert.doesNotMatch(result.message || '', /scopes: repo/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('worker agent starts without fabricated organization knowledge', async () => {
  const { listKnowledgeDocuments, getWorkerAgentConfig } = await import('../server/services/workerAgentService.js');
  assert.deepEqual(listKnowledgeDocuments(), []);
  assert.deepEqual(getWorkerAgentConfig().activeKnowledgeDocIds, []);
  assert.equal(getWorkerAgentConfig().cloudflareRoute, '');
});
