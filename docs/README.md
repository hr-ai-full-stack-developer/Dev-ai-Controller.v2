# Resources and Ownership

This directory contains maintained guidance. Runtime source belongs in `src/`, `server/`, or `worker/`; generated files do not belong here.

## Authoritative resources

- [Repository structure](REPOSITORY_STRUCTURE.md) — where code and new files belong.
- [Conversation guide](CONVERSATION_GUIDE.md) — AI language, terminology, and response quality.
- [Incident review](INCIDENT_REVIEW.md) — repository/runtime drift history and prevention.

Deployment documentation intentionally remains at repository root because operators need it immediately:
- [Deployment guide](../DEPLOYMENT.md)
- [Deployment checklist](../DEPLOYMENT_CHECKLIST.md)

## Source-of-truth order

When two documents disagree, use this order:

1. Executable code and tests.
2. `wrangler.toml` for Cloudflare bindings.
3. `DEPLOYMENT.md` for operator instructions.
4. Maintained files in `docs/`.
5. Git history for obsolete/historical specifications.

Do not restore old architecture prompts as current instructions without implementing and testing the resources they describe.
