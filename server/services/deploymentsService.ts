import type { DeployedApp } from '../../src/types/index.js';
import { addAuditLog } from '../storage.js';

async function cloudflare(path: string, init: RequestInit = {}) {
  const { CLOUDFLARE_ACCOUNT_ID: account, CLOUDFLARE_API_TOKEN: token } = process.env;
  if (!account || !token) throw new Error('Cloudflare deployment access has not been configured.');
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}${path}`, {
    ...init, signal: AbortSignal.timeout(20000),
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  const data = await response.json();
  if (!response.ok || !data.success) throw new Error(data.errors?.[0]?.message || `Cloudflare request failed (${response.status}).`);
  return data.result;
}

export async function listDeployedApps(): Promise<DeployedApp[]> {
  const scripts = await cloudflare('/workers/scripts');
  return scripts.map((script: any) => ({
    id: script.id, name: script.id, platform: 'Cloudflare Workers', environment: 'production',
    status: 'active', url: '', commitSha: script.etag || '', commitMessage: 'Worker exists; traffic health has not been measured.',
    branch: '', deployedAt: script.modified_on, latencyMs: 0, uptime: 'Not measured', requests24h: 0,
  }));
}

async function deployVersion(appId: string, rollback: boolean, user: string) {
  if (!/^[a-zA-Z0-9_-]+$/.test(appId)) throw new Error('Invalid Worker name.');
  const base = `/workers/scripts/${encodeURIComponent(appId)}`;
  const current = await cloudflare(`${base}/deployments`);
  const deployments = current.deployments || current;
  if (!Array.isArray(deployments) || !deployments.length) throw new Error('No deployment history exists for this Worker.');
  let versions = deployments[0].versions;
  if (rollback) {
    const previous = deployments.slice(1).find((d: any) => JSON.stringify(d.versions) !== JSON.stringify(versions));
    if (!previous) throw new Error('No previous deployment is available to restore.');
    versions = previous.versions;
  } else {
    const uploaded = await cloudflare(`${base}/versions`);
    const latest = (uploaded.items || uploaded)[0];
    if (!latest?.id) throw new Error('No uploaded Worker version is available to deploy.');
    versions = [{ version_id: latest.id, percentage: 100 }];
  }
  const deployment = await cloudflare(`${base}/deployments`, {
    method: 'POST', body: JSON.stringify({ strategy: 'percentage', versions,
      annotations: { 'workers/message': `${rollback ? 'Rollback' : 'Deploy uploaded version'} requested by ${user}` } }),
  });
  await addAuditLog({ action: rollback ? 'deploy.rollback' : 'deploy.trigger', provider: 'cloudflare', status: 'success', durationMs: 0,
    summary: `Cloudflare accepted deployment for ${appId}`, details: `Deployment ID: ${deployment.id}`, user });
  return { success: true, deploymentId: deployment.id, message: 'Cloudflare accepted the deployment. Refresh to check its status.' };
}
export const triggerDeployment = (appId: string, user = 'operator') => deployVersion(appId, false, user);
export const rollbackDeployment = (appId: string, user = 'operator') => deployVersion(appId, true, user);
