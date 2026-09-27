# Agent Capabilities and Memory

Agents use one capability contract regardless of provider. A capability declares the provider, transport (API/MCP/native), allowed operations, whether it is configured, and whether writes/actions require approval. The runtime must not display an integration as connected merely because a registry entry exists.

## Action model

- Supabase: server-side database read/write when credentials are configured.
- GitHub: repository reads and isolated draft pull-request creation through the GitHub REST API.
- Cloudflare: deployment inspection and explicitly approved operations through implemented Cloudflare API adapters.
- Resend: server-side transactional email through its API adapter.
- MCP: may be added as another transport for the same capability contract. An MCP server is not considered connected until a real client/session is configured and verified.

Provider credentials stay server-side. Read actions may be autonomous when permitted. External writes, deployments, email delivery, destructive changes, and merges require an explicit approval boundary unless a narrower approved automation policy exists.

## Memory model

Agent memory is separate from chat history and audit logs. Production durable memory uses the `agent_memory` table in the dedicated Supabase connection configured by `AGENT_MEMORY_SUPABASE_URL` and `AGENT_MEMORY_SUPABASE_SERVICE_ROLE_KEY`. Apply `supabase/agent_memory.sql` to that database.

Memory kinds:
- `process`: learned/approved operating procedures. No automatic expiry by default.
- `knowledge`: verified facts/reference material. Normal entries expire after 7 days; important entries after 30 days; critical entries do not auto-expire.
- `episodic`: recent execution context/outcomes. Normal entries expire after 7 days; important entries after 30 days.

Importance is `normal`, `important`, or `critical`. Critical memory and process memory are retained until explicitly superseded. A future adaptation should create a new version/supersede the old process rather than silently overwriting an important procedure.

If the dedicated Supabase memory database is not configured, the service falls back to process-local temporary memory and reports `durable: false`. That fallback is for development only and disappears on restart.

## API

Authenticated operators can inspect `GET /api/agents/capabilities`, read `GET /api/agents/memory`, and add approved memory with `POST /api/agents/memory`.

The memory write body accepts `tenantId`, optional `agentId`, `kind`, `title`, `content`, optional `importance`, optional `expiresAt`, and metadata.
