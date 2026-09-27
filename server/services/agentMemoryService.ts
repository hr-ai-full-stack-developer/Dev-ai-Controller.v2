import crypto from 'crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AgentMemoryRecord, AgentMemoryKind, AgentMemoryImportance } from '../../src/types/index.js';

const temporaryMemory = new Map<string, AgentMemoryRecord>();
let client: SupabaseClient | null = null;

function supabase(): SupabaseClient | null {
  const url = process.env.AGENT_MEMORY_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.AGENT_MEMORY_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  if (!client) client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}

export function isDurableAgentMemoryConfigured() {
  return Boolean(supabase());
}

function defaultExpiry(kind: AgentMemoryKind, importance: AgentMemoryImportance): string | undefined {
  if (kind === 'process' || importance === 'critical') return undefined;
  const days = importance === 'important' ? 30 : 7;
  return new Date(Date.now() + days * 86400000).toISOString();
}

function fromRow(row: any): AgentMemoryRecord {
  return {
    id: row.id, tenantId: row.tenant_id, agentId: row.agent_id || undefined, kind: row.kind,
    title: row.title, content: row.content, importance: row.importance, source: row.source,
    status: row.status, version: row.version, createdAt: row.created_at, updatedAt: row.updated_at,
    expiresAt: row.expires_at || undefined, metadata: row.metadata || {},
  };
}

export async function rememberAgentMemory(input: {
  tenantId: string; agentId?: string; kind: AgentMemoryKind; title: string; content: string;
  importance?: AgentMemoryImportance; source?: 'operator' | 'agent' | 'system';
  expiresAt?: string; metadata?: Record<string, string | number | boolean>;
}): Promise<AgentMemoryRecord> {
  const importance = input.importance || (input.kind === 'process' ? 'important' : 'normal');
  const now = new Date().toISOString();
  const record: AgentMemoryRecord = {
    id: crypto.randomUUID(), tenantId: input.tenantId, agentId: input.agentId, kind: input.kind,
    title: input.title.trim(), content: input.content.trim(), importance, source: input.source || 'operator',
    status: 'active', version: 1, createdAt: now, updatedAt: now,
    expiresAt: input.expiresAt || defaultExpiry(input.kind, importance), metadata: input.metadata || {},
  };
  if (!record.title || !record.content) throw new Error('Memory title and content are required.');

  const sb = supabase();
  if (sb) {
    const { data, error } = await sb.from('agent_memory').insert({
      id: record.id, tenant_id: record.tenantId, agent_id: record.agentId || null, kind: record.kind,
      title: record.title, content: record.content, importance: record.importance, source: record.source,
      status: record.status, version: record.version, created_at: record.createdAt, updated_at: record.updatedAt,
      expires_at: record.expiresAt || null, metadata: record.metadata,
    }).select('*').single();
    if (error) throw new Error(`Agent memory persistence failed: ${error.message}`);
    return fromRow(data);
  }
  temporaryMemory.set(record.id, record);
  return record;
}

export async function listAgentMemory(params: {
  tenantId: string; agentId?: string; kind?: AgentMemoryKind; limit?: number;
}): Promise<AgentMemoryRecord[]> {
  const now = new Date().toISOString();
  const sb = supabase();
  if (sb) {
    let query = sb.from('agent_memory').select('*').eq('tenant_id', params.tenantId).eq('status', 'active')
      .or(`expires_at.is.null,expires_at.gt.${now}`).order('importance', { ascending: true })
      .order('updated_at', { ascending: false }).limit(Math.min(params.limit || 100, 200));
    if (params.agentId) query = query.or(`agent_id.is.null,agent_id.eq.${params.agentId}`);
    if (params.kind) query = query.eq('kind', params.kind);
    const { data, error } = await query;
    if (error) throw new Error(`Agent memory read failed: ${error.message}`);
    return (data || []).map(fromRow);
  }
  return [...temporaryMemory.values()].filter((m) =>
    m.tenantId === params.tenantId && m.status === 'active' &&
    (!params.agentId || !m.agentId || m.agentId === params.agentId) &&
    (!params.kind || m.kind === params.kind) && (!m.expiresAt || m.expiresAt > now)
  ).sort((a,b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, params.limit || 100);
}
