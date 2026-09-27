import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateCompletion, setAiBinding } from '../server/services/aiProvider.js';
import { triggerDeployment, rollbackDeployment } from '../server/services/deploymentsService.js';

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
