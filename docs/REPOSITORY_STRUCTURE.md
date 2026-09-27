# Repository Structure

This file is the map for contributors and operators. The production behavior is defined by code, `wrangler.toml`, tests, and [DEPLOYMENT.md](../DEPLOYMENT.md).

```text
.
├── .github/workflows/       # CI verification and Cloudflare deployment
├── public/                  # Public browser assets, including embeddable widget
├── server/
│   ├── app.ts               # Shared authenticated HTTP API
│   ├── auth.ts              # Operator credentials, TOTP/email OTP, signed sessions
│   ├── storage.ts           # Application storage facade; partly optional Supabase, partly memory
│   └── services/            # Cloudflare/GitHub/Resend/AI/agent capability + memory adapters
├── supabase/                # Explicit SQL schemas, including separate durable agent memory
├── src/
│   ├── components/          # React operator UI
│   ├── context/             # Client authentication/session context
│   ├── data/                # UI/export data definitions
│   └── types/               # Shared TypeScript contracts
├── tests/                   # Node API integration tests
├── worker/
│   └── index.ts             # Cloudflare Worker adapter + static asset routing
├── server.ts                # Local/standalone Node entrypoint
├── wrangler.toml            # Authoritative Cloudflare runtime bindings
├── package.json             # Scripts and dependencies
├── package-lock.json        # Reproducible dependency lock
├── DEPLOYMENT.md            # Authoritative setup/operations guide
├── DEPLOYMENT_CHECKLIST.md  # Release sign-off checklist
└── docs/                    # Maintained contributor, incident, and AI guidance
```

## Runtime flow

Browser → Cloudflare Worker → `worker/index.ts` → `server/app.ts` for `/api/*` and `/v1/*`.

Non-API requests are served by the Cloudflare static-assets binding from the Vite `dist/` output.

Local development runs the same Express application through `server.ts`, reducing API drift between local Node and Cloudflare.

## Where new code belongs

- HTTP route or middleware: `server/app.ts` (extract a router when a domain becomes large).
- External provider integration: `server/services/<provider>Service.ts`.
- Shared backend persistence behavior: `server/storage.ts` until a dedicated persistence layer replaces it.
- Cloudflare-specific request adaptation/bindings: `worker/`.
- UI feature: `src/components/`.
- Shared contract: `src/types/`.
- Integration/regression test: `tests/`.
- Operator/deployment instructions: `DEPLOYMENT.md` or `docs/`.

## Rules

1. Do not add a second independent production API implementation.
2. Do not put secrets or privileged provider calls in `src/` or `public/`.
3. Do not document a Cloudflare binding as active until it exists in `wrangler.toml`.
4. Do not seed production-visible data that claims an external action succeeded.
5. Every new privileged API route must use the shared authentication boundary and receive a regression test.
6. Every production capability must have a truthful failure/unavailable state.


## Documentation ownership

| Resource | Purpose |
| --- | --- |
| `README.md` | Short project entry point and current implementation summary |
| `DEPLOYMENT.md` | Production configuration, secrets, deployment and operations |
| `DEPLOYMENT_CHECKLIST.md` | Pre-release and post-release verification |
| `docs/REPOSITORY_STRUCTURE.md` | Source tree ownership and placement rules |
| `docs/CONVERSATION_GUIDE.md` | Plain-language AI response and terminology standard |
| `docs/INCIDENT_REVIEW.md` | Historical drift findings and prevention controls |
| `docs/AGENT_CAPABILITIES_MEMORY.md` | Agent provider actions, approval boundaries, retention and durable memory |

Old architecture prompts/specifications that claimed unconfigured Cloudflare resources were removed. Git history remains available when historical context is needed.

## Intentionally retained compatibility files

- `cloudflare-worker.js` is a small compatibility re-export to `worker/index.ts`. It is not the authoritative Worker entrypoint; `wrangler.toml` points directly to `worker/index.ts`.
