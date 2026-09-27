# Incident Review: Repository and Runtime Drift

## Summary

A production-readiness review identified drift between documentation, seeded UI data, environment configuration, and the Cloudflare runtime. The application could present example success history and documentation could imply infrastructure bindings that were not actually configured.

## Impact

No evidence from this repository review proves that an unauthorized production action occurred. The risk was operational ambiguity: operators could mistake demonstration records or aspirational architecture for verified external activity.

## Contributing factors

- Example chat sessions contained successful Cloudflare, Resend and database claims.
- Legacy and canonical admin signing-key names coexisted in the environment template.
- Historical deployment documentation listed D1, R2, Vectorize, KV, Durable Objects and cron as required despite those bindings being absent from the active Wrangler configuration.
- Some application state is process-memory only, while high-level architecture text describes a more durable target platform.
- Repository CI existed but the reviewed main commit had no recorded workflow run.

## Corrective actions in this change

- Removed fabricated production chat/activity seeds.
- Removed the default operator email fallback so missing identity configuration fails closed.
- Standardized documentation on `ADMIN_JWT_KEY` while retaining a temporary code compatibility alias.
- Replaced the environment template with an explicit required/optional contract.
- Rewrote deployment documentation and checklist to match the active Cloudflare configuration.
- Added a canonical repository structure guide.
- Documented current persistence limitations and release gates.

## Prevention

Future changes must keep `wrangler.toml`, tests, and deployment documentation synchronized. New external actions need explicit unavailable/error states and tests; examples must be clearly labeled fixtures and must not appear as production history.

## Verification

The completion PR must pass typecheck, API tests, Vite build, and Wrangler dry-run. Live deployment/account-side verification remains a separate release step because repository access alone cannot prove Cloudflare secrets or account configuration.
