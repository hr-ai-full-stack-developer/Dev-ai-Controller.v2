# Devai Controller v2 deployment

Repository: `hr-ai-full-stack-developer/Dev-ai-Controller.v2`

## Runtime

- `server/app.ts`: shared Express API for local Node and Cloudflare.
- `worker/index.ts`: Cloudflare Node HTTP adapter and static assets handler.
- `server.ts`: local development and standalone Node server.
- `dist/`: browser assets only. The Node build is in `build/`, outside public assets.
- `wrangler.toml`: deploys the existing configured Worker name `devai-controller`.

## Required configuration

Set these as **Cloudflare Worker secrets** before signing in:

- `ADMIN_EMAIL`: administrator email.
- `ADMIN_PASSWORD`: strong administrator password.
- `ADMIN_JWT_KEY`: random signing key, at least 32 bytes. The legacy `ADMIN_WJT_KEY` name remains supported.

The application fails closed when login secrets are absent. Existing demonstration passwords and local-storage tokens do not grant access.

Optional provider secrets:

- `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`: Worker listing, deployment, rollback, and REST AI fallback.
- `GITHUB_TOKEN`: repository reads and draft pull requests; grant only intended repositories.
- `OPENAI_API_KEY`: AI fallback.
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`: existing audit/token storage integration.
- `RESEND_API_KEY`: existing email integration; automation scheduling is not implemented.

Workers AI uses the `AI` binding. No API token is required for native AI inference.

## GitHub deployment

Set repository Actions secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. These allow CI to deploy; they do not automatically configure Worker runtime secrets.

Pushing `main` runs `.github/workflows/deploy.yml`: install from lockfile, typecheck, API tests, frontend build, Worker packaging check, then deployment. Pull requests run verification only. A failed credentials check means nothing has been deployed.

Manual commands:

```sh
npm ci
npm run lint
npm test
npm run deploy
```

Use `npm run dev` locally, or `npm run build && npm start` for the Node production server. Configure local values in `.env`, and Wrangler-local values in `.dev.vars`; neither is committed.

## Verification

Check the deployed `/api/health`, then sign in and verify chat session creation, agent lists, and API errors. Anonymous private API requests must return 401. Unknown authenticated API paths return JSON 404, not the SPA.

## Remaining limitations

- Automation approval/execution and password recovery return explicit unavailable errors. They no longer claim to schedule cron jobs, deliver emails, or send reset links.
- Chat, agent configuration, knowledge edits, coding-task lists, and automation drafts still use process memory. They are not durable across Worker isolate restarts. A durable storage migration is required before relying on these records in production.
- Coding requests inspect a bounded set of repository files and create draft PRs. CI tests on generated code are not run by the coding endpoint; its result says so.
- Deploy controls promote the latest uploaded Worker version or restore a prior deployment. They do not build new source from GitHub.
- Provider-dependent operations need the corresponding runtime credentials and must be verified against the real account after deployment.
