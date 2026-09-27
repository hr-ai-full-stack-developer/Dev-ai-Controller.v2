# Dev’ai Controller v2

Dev’ai Controller is a React operator interface with a shared Express API deployed through a Cloudflare Worker. The repository is intentionally organized so local Node development and the Cloudflare runtime use the same API implementation.

## Start here

- **Deploy or configure production:** [DEPLOYMENT.md](DEPLOYMENT.md)
- **Release verification:** [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)
- **Repository map:** [docs/REPOSITORY_STRUCTURE.md](docs/REPOSITORY_STRUCTURE.md)
- **AI conversation standard:** [docs/CONVERSATION_GUIDE.md](docs/CONVERSATION_GUIDE.md)
- **Incident/drift history:** [docs/INCIDENT_REVIEW.md](docs/INCIDENT_REVIEW.md)

## Current implementation

### Runtime
- Cloudflare Worker entrypoint: `worker/index.ts`
- Shared API: `server/app.ts`
- Local Node entrypoint: `server.ts`
- React UI: `src/`
- Static browser assets: `public/`
- Cloudflare configuration: `wrangler.toml`

### Connected services
The backend has adapters for Cloudflare, GitHub, Resend, optional Supabase persistence, and AI providers. A service is shown as available only when its configured API check succeeds.

Notifications can refresh from authenticated GitHub activity and accessible Cloudflare Worker deployment history. These are provider-backed records; they are not seeded success messages.

### Authentication
Administrative API routes use the shared server-side session/authentication boundary. Production requires `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_JWT_KEY`.

### Agents
The Agents workspace provides Flows, Automations, Chat, and System views. Normal chat is informational and must not claim an external action occurred unless a real provider action performed and verified it. Coding and deployment actions use their dedicated reviewed paths.

## Cloudflare bindings actually configured

`wrangler.toml` is authoritative. The current Worker config includes:
- Workers AI binding `AI`
- static assets binding `ASSETS`
- observability

D1, R2, Vectorize, KV, Durable Objects, and Cron are **not current production bindings**. Do not treat older architecture ideas as deployed infrastructure.

## Development

```bash
npm ci
npm run lint
npm test
npm run build:web
npx wrangler deploy --dry-run
```

Local development:

```bash
cp .env.example .env
npm run dev
```

## Repository rules

1. Production behavior is defined by code, tests, `wrangler.toml`, and the deployment guide—not aspirational diagrams.
2. Never put provider secrets in browser code.
3. Never seed UI data that looks like a successful production action.
4. New privileged routes must use the shared authentication boundary.
5. External actions must expose truthful unavailable/error states.
6. Keep generated output (`dist/`, `build/`, coverage, logs, local env files, Wrangler state) out of Git.
