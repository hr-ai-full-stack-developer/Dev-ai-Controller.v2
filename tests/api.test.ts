import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
process.env.ADMIN_EMAIL = 'test@example.com';
process.env.ADMIN_PASSWORD = 'test-password-for-local-checks';
process.env.ADMIN_JWT_KEY = 'local-test-signing-key-not-a-production-secret';
const { createApp } = await import('../server/app.js');
let server: any;
let base: string;
let cookie: string;
before(async () => {
  server = createApp().listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => new Promise<void>(resolve => server.close(resolve)));
async function request(path: string, method = 'GET', body?: any, session = true) {
  return fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(session && cookie ? { Cookie: cookie } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
}
test('protected controls reject unauthenticated callers', async () => {
  for (const path of ['/api/deployments', '/api/chat/sessions', '/v1/agents', '/api/auth/authenticator-setup']) assert.equal((await request(path, 'GET', undefined, false)).status, 401);
});
test('invalid credentials cannot open an operator session', async () => {
  const r = await request('/api/auth/login', 'POST', { email: 'test@example.com', password: 'incorrect' });
  assert.equal(r.status, 401); assert.equal(r.headers.get('set-cookie'), null);
});
test('valid credentials establish an HTTP-only session', async () => {
  const r = await request('/api/auth/login', 'POST', { email: 'test@example.com', password: process.env.ADMIN_PASSWORD });
  assert.equal(r.status, 200);
  assert.match(r.headers.get('set-cookie')!, /HttpOnly/);
  cookie = r.headers.get('set-cookie')!.split(';')[0];
  assert.equal((await (await request('/api/auth/verify-session')).json()).valid, true);
});
test('frontend chat controls create, load, clear and delete sessions', async () => {
  const made = await (await request('/api/chat/sessions', 'POST', { title: 'Integration check' })).json();
  assert.equal(made.success, true);
  const id = made.session.id;
  assert.equal((await request(`/api/chat/sessions/${id}`)).status, 200);
  assert.equal((await request(`/api/chat/sessions/${id}/clear`, 'POST')).status, 200);
  assert.equal((await request(`/api/chat/sessions/${id}`, 'DELETE')).status, 200);
  assert.equal((await request(`/api/chat/sessions/${id}`)).status, 404);
});
test('frontend registries and worker controls have JSON routes', async () => {
  for (const path of ['/v1/agents','/v1/tools','/v1/mcp','/v1/knowledge','/v1/automations','/v1/executions','/v1/widget/config','/api/worker-agent/config','/api/worker-agent/knowledge','/api/coding/tasks','/api/notifications','/api/logs']) {
    const r = await request(path); assert.equal(r.status, 200, path); assert.match(r.headers.get('content-type')!, /json/);
  }
});
test('unknown API routes and unconfigured reset never return a fake success', async () => {
  assert.equal((await request('/api/not-a-route')).status, 404);
  assert.equal((await request('/api/auth/reset-password', 'POST', { email: 'test@example.com' })).status, 501);
});
test('cross-origin mutations are rejected', async () => {
  const r = await fetch(base+'/api/chat/sessions', { method: 'POST', headers: { Cookie: cookie, Origin: 'https://other.example', 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(r.status, 403);
});
test('logout expires the browser cookie', async () => {
  const r = await request('/api/auth/logout','POST'); assert.equal(r.status,200);
  assert.match(r.headers.get('set-cookie')!, /Expires=Thu, 01 Jan 1970/);
});

test('health reports configuration truthfully without claiming optional providers', async () => {
  const r = await request('/api/health', 'GET', undefined, false);
  assert.equal(r.status, 200);
  const body = await r.json();
  assert.equal(body.adminConfigured, true);
  assert.equal(body.integrations.github, false);
  assert.equal(body.integrations.resend, false);
  assert.equal(body.integrations.supabase, false);
  assert.equal(body.integrations.openaiFallback, false);
  assert.equal(typeof body.database, 'undefined');
  assert.equal(typeof body.secretsSecured, 'undefined');
});
test('authenticated identity comes from configured environment rather than a UI fixture', async () => {
  const body = await (await request('/api/auth/me')).json();
  assert.equal(body.user.email, 'test@example.com');
  assert.equal(body.user.sessionValid, true);
});

test('agent capabilities report configuration truthfully', async () => {
  const res = await fetch(baseUrl + '/api/agents/capabilities', { headers: authHeaders });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.success, true);
  assert.ok(body.capabilities.some((c: any) => c.id === 'github.repository'));
  assert.ok(body.capabilities.some((c: any) => c.id === 'supabase.database'));
});

test('agent process memory can be retained without automatic expiry', async () => {
  const create = await fetch(baseUrl + '/api/agents/memory', {
    method: 'POST', headers: { ...authHeaders, 'content-type': 'application/json' },
    body: JSON.stringify({ kind: 'process', title: 'Safe repair process', content: 'Inspect, propose, verify, then request approval.', importance: 'important' }),
  });
  assert.equal(create.status, 200);
  const created = await create.json();
  assert.equal(created.memory.kind, 'process');
  assert.equal(created.memory.expiresAt, undefined);
  const list = await fetch(baseUrl + '/api/agents/memory?kind=process', { headers: authHeaders });
  assert.equal(list.status, 200);
  const listed = await list.json();
  assert.ok(listed.memories.some((m: any) => m.title === 'Safe repair process'));
});
