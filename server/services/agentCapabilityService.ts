import type { AgentCapability } from '../../src/types/index.js';
import { runtimeEnv } from '../runtimeEnv.js';

export function listAgentCapabilities(): AgentCapability[] {
  return [
    {
      id: 'supabase.database', provider: 'supabase', transport: 'api', operations: ['read','write'],
      configured: Boolean((runtimeEnv('AGENT_MEMORY_SUPABASE_URL') || runtimeEnv('SUPABASE_URL')) &&
        (runtimeEnv('AGENT_MEMORY_SUPABASE_SERVICE_ROLE_KEY') || runtimeEnv('SUPABASE_SERVICE_ROLE_KEY') || runtimeEnv('SUPABASE_SERVICE_KEY'))),
      requiresApprovalForWrite: true,
      description: 'Server-side Supabase database access for durable agent process, knowledge, and episodic memory.',
    },
    {
      id: 'github.repository', provider: 'github', transport: 'api', operations: ['read','write'],
      configured: Boolean(runtimeEnv('GITHUB_TOKEN')), requiresApprovalForWrite: true,
      description: 'GitHub REST API repository inspection and isolated draft pull-request creation.',
    },
    {
      id: 'cloudflare.workers', provider: 'cloudflare', transport: 'api', operations: ['read','execute'],
      configured: Boolean(runtimeEnv('CLOUDFLARE_ACCOUNT_ID') && runtimeEnv('CLOUDFLARE_API_TOKEN')),
      requiresApprovalForWrite: true,
      description: 'Cloudflare API deployment inspection and explicitly approved deployment operations implemented by the deployment service.',
    },
    {
      id: 'agent.memory', provider: 'native', transport: 'native', operations: ['read','write'],
      configured: true, requiresApprovalForWrite: true,
      description: 'Standard memory contract. Durable when the dedicated Supabase memory connection is configured; otherwise process-local only.',
    },
  ];
}
