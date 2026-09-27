import type { ServiceStatusInfo, ServiceType } from '../../src/types/index.js';
import { testGitHubToken } from './github.js';
import { testResendToken } from './resend.js';
import { testSupabaseConnection } from './supabaseService.js';
import { testCloudflareConnection } from './cloudflareService.js';
import { runtimeEnv } from '../runtimeEnv.js';

export async function getServicesStatus(): Promise<{
  services: Record<ServiceType, ServiceStatusInfo>;
  systemSummary: {
    overallStatus: 'all_operational' | 'degraded_performance' | 'action_required';
    primaryAiProvider: string;
    fallbackAiProvider: string;
    totalActiveDeployments: number;
    securedSecretsCount: number;
    timestamp: string;
  };
}> {
  const timestamp = new Date().toISOString();

  // 1. Cloudflare Check
  const cfStart = Date.now();
  const cfRes = await testCloudflareConnection(runtimeEnv('CLOUDFLARE_API_TOKEN'), runtimeEnv('CLOUDFLARE_ACCOUNT_ID'));
  const cfLatency = Date.now() - cfStart;
  const cfStatus: ServiceStatusInfo = {
    id: 'cloudflare',
    name: 'Cloudflare',
    role: 'Cloudflare account API and Workers AI check',
    status: cfRes.valid ? 'operational' : 'degraded',
    latencyMs: cfLatency,
    lastChecked: timestamp,
    version: cfRes.model || 'Workers AI',
    details: cfRes.message,
    features: cfRes.valid ? ['Workers AI API verified'] : [],
  };

  // 2. Supabase Check
  const sbStart = Date.now();
  const sbRes = await testSupabaseConnection(runtimeEnv('SUPABASE_URL'), runtimeEnv('SUPABASE_SERVICE_ROLE_KEY') || runtimeEnv('SUPABASE_SERVICE_KEY'));
  const sbLatency = Date.now() - sbStart;
  const sbStatus: ServiceStatusInfo = {
    id: 'supabase',
    name: 'Supabase',
    role: 'Optional database persistence',
    status: sbRes.valid ? 'operational' : 'degraded',
    latencyMs: sbLatency,
    lastChecked: timestamp,
    version: '',
    details: sbRes.message || 'Supabase connection status unavailable.',
    features: sbRes.valid ? ['Required database table readable'] : [],
  };

  // 3. GitHub Check
  const ghStart = Date.now();
  const ghRes = await testGitHubToken(runtimeEnv('GITHUB_TOKEN'));
  const ghLatency = Date.now() - ghStart;
  const ghStatus: ServiceStatusInfo = {
    id: 'github',
    name: 'GitHub',
    role: 'GitHub account connection',
    status: ghRes.valid ? 'operational' : 'offline',
    latencyMs: ghLatency,
    lastChecked: timestamp,
    version: 'REST API v3',
    details: ghRes.user
      ? `Authenticated as @${ghRes.user}.${ghRes.scopes?.length ? ` Reported OAuth scopes: ${ghRes.scopes.join(', ')}.` : ' GitHub did not report OAuth scopes for this token type.'}`
      : (ghRes.message || 'GitHub connection is unavailable.'),
    features: ghRes.valid ? ['Authenticated GitHub API access'] : [],
  };

  // 4. Resend Check
  const reStart = Date.now();
  const reRes = await testResendToken(runtimeEnv('RESEND_API_KEY'));
  const reLatency = Date.now() - reStart;
  const reStatus: ServiceStatusInfo = {
    id: 'resend',
    name: 'Resend',
    role: 'Transactional Email & Notifications',
    status: reRes.valid ? 'operational' : 'offline',
    latencyMs: reLatency,
    lastChecked: timestamp,
    version: 'Resend API v1',
    details: reRes.message || 'Resend connection status unavailable.',
    features: reRes.valid ? ['Resend API authenticated'] : [],
  };

  // 5. OpenAI Check (Fallback Provider)
  const openAiKey = runtimeEnv('OPENAI_API_KEY');
  const openAiStatus: ServiceStatusInfo = {
    id: 'openai',
    name: 'OpenAI (Fallback)',
    role: 'Secondary / Fallback AI Provider',
    status: openAiKey ? 'standby' : 'offline',
    latencyMs: 0,
    lastChecked: timestamp,
    version: openAiKey ? 'Configured; not probed' : '',
    details: openAiKey
      ? 'OpenAI fallback credentials are configured. This status check does not make a model request.'
      : 'OpenAI fallback is not configured.',
    isFallback: true,
    features: openAiKey ? ['Fallback credential configured'] : [],
  };

  const allOperational = [cfStatus, sbStatus, ghStatus, reStatus].every(
    (s) => s.status === 'operational'
  );

  return {
    services: {
      cloudflare: cfStatus,
      supabase: sbStatus,
      github: ghStatus,
      resend: reStatus,
      openai: openAiStatus,
    },
    systemSummary: {
      overallStatus: allOperational ? 'all_operational' : 'degraded_performance',
      primaryAiProvider: cfRes.valid ? 'Cloudflare Workers AI' : 'Not verified',
      fallbackAiProvider: openAiKey ? 'OpenAI configured; not probed' : 'Not configured',
      totalActiveDeployments: 0,
      securedSecretsCount: ['CLOUDFLARE_API_TOKEN', 'SUPABASE_SERVICE_ROLE_KEY', 'GITHUB_TOKEN', 'RESEND_API_KEY', 'OPENAI_API_KEY'].filter(k => Boolean(runtimeEnv(k))).length,
      timestamp,
    },
  };
}
