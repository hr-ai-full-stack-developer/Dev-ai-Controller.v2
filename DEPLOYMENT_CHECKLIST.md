# Dev’ai Controller v2 — Production Checklist

Use this checklist with [DEPLOYMENT.md](DEPLOYMENT.md). Items describe the current implementation, not aspirational architecture.

## Repository verification

- [ ] `npm ci` succeeds from `package-lock.json`.
- [ ] `npm run lint` passes.
- [ ] `npm test` passes.
- [ ] `npm run build:web` passes.
- [ ] `npx wrangler deploy --dry-run` passes.
- [ ] Pull-request GitHub Actions verification is green.

## Cloudflare runtime

- [ ] Deployment target is the intended Cloudflare account.
- [ ] Worker name is `devai-controller`.
- [ ] Workers AI binding `AI` is present.
- [ ] Cloudflare Email Service binding `EMAIL` is present and restricted to `notification@app.jelvan.pro`.
- [ ] `app.jelvan.pro` is onboarded for Cloudflare Email Sending.
- [ ] Static assets are served from `./dist`.
- [ ] API routes run through the Worker before SPA fallback.
- [ ] `ADMIN_EMAIL` is configured as a Worker secret.
- [ ] `ADMIN_PASSWORD` is configured as a Worker secret.
- [ ] `ADMIN_JWT_KEY` is configured as a Worker secret.
- [ ] GitHub Actions has `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
- [ ] GitHub Actions has `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_JWT_KEY`; the deploy job provisions them to the Worker.

## Optional providers

Configure and test only providers actually required:

- [ ] GitHub: `GITHUB_TOKEN`.
- [ ] OpenAI fallback: `OPENAI_API_KEY`.
- [ ] Gemini: `GEMINI_API_KEY`.
- [ ] Legacy Supabase persistence: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
- [ ] Provider-token encryption: `WORKER_SECRET`.

An unchecked optional provider must be shown as unavailable/offline, never simulated as healthy.

## Authentication and API smoke test

- [ ] `GET /api/health` returns HTTP 200.
- [ ] `GET /api/auth/readiness` returns `configured: true` with email/password/jwtKey all true.
- [ ] Anonymous `GET /api/deployments` returns HTTP 401.
- [ ] Invalid credentials return HTTP 401 and do not set a session cookie.
- [ ] Valid credentials set an HTTP-only session cookie.
- [ ] `GET /api/auth/verify-session` confirms the session.
- [ ] Cross-origin state-changing admin requests return HTTP 403.
- [ ] Unknown API routes return JSON HTTP 404.
- [ ] Logout expires the browser session.

## UI verification

- [ ] Operator login loads without a fake/local fallback session.
- [ ] Status dashboard distinguishes configured, unavailable and degraded integrations.
- [ ] Chat history begins from real activity; no fabricated success incidents are displayed.
- [ ] API errors are visible and actionable.
- [ ] No server secrets appear in the browser bundle or network payloads.

## Capability boundary

The following are **not current production bindings** unless `wrangler.toml` is deliberately changed and corresponding code/tests are added:

- D1
- R2
- Vectorize
- KV
- Durable Objects
- Cron triggers

Current process-memory state is not durable across Worker isolate restarts. Do not sign off durable automations, durable chat history, or durable agent state until a persistence migration is implemented.

## Release sign-off

- [ ] PR verification is green.
- [ ] PR review is complete.
- [ ] PR is merged to `main`.
- [ ] Main-branch deployment job succeeds.
- [ ] Live smoke tests pass.
- [ ] Any account-side deployment failure is recorded as an operational incident rather than represented as application success.
