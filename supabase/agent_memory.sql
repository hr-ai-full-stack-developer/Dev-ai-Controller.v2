-- Durable agent memory is intentionally separate from chat history and audit logs.
create table if not exists public.agent_memory (
  id uuid primary key,
  tenant_id text not null,
  agent_id text,
  kind text not null check (kind in ('process','knowledge','episodic')),
  title text not null,
  content text not null,
  importance text not null check (importance in ('normal','important','critical')),
  source text not null check (source in ('operator','agent','system')),
  status text not null default 'active' check (status in ('active','superseded')),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists agent_memory_scope_idx on public.agent_memory (tenant_id, agent_id, kind, status);
create index if not exists agent_memory_expiry_idx on public.agent_memory (expires_at) where expires_at is not null;
alter table public.agent_memory enable row level security;
-- Dev'ai accesses this table only from the server with a service-role key.
-- Do not expose the service-role key or this table directly to browser clients.
