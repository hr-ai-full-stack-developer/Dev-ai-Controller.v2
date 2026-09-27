import type { NotificationItem } from '../../src/types/index.js';

let notificationsList: NotificationItem[] = [];

function merge(items: NotificationItem[]) {
  const seen = new Set(notificationsList.map((n) => n.sourceId || n.id));
  for (const item of items) if (!seen.has(item.sourceId || item.id)) notificationsList.push(item);
  notificationsList.sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
  notificationsList = notificationsList.slice(0, 200);
}

async function githubNotifications(): Promise<NotificationItem[]> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return [];
  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'Devai-Controller/2' };
  const me = await fetch('https://api.github.com/user', { headers });
  if (!me.ok) return [];
  const user = await me.json() as any;
  const res = await fetch(`https://api.github.com/users/${encodeURIComponent(user.login)}/events?per_page=50`, { headers });
  if (!res.ok) return [];
  const events = await res.json() as any[];
  return events.map((event): NotificationItem => {
    const repo = event.repo?.name || '';
    const action = event.payload?.action;
    const type = event.type === 'PushEvent' ? 'push' : event.type === 'PullRequestEvent' ? 'pull_request' : event.type === 'IssuesEvent' ? 'issue' : event.type === 'ReleaseEvent' ? 'release' : event.type === 'CreateEvent' ? 'repository' : 'provider_event';
    const friendly = event.type.replace(/Event$/, '').replace(/([a-z])([A-Z])/g, '$1 $2');
    return {
      id: `github-${event.id}`, sourceId: `github:${event.id}`, service: 'github', type,
      title: action ? `${friendly}: ${action}` : friendly,
      message: repo ? `${event.actor?.login || user.login} · ${repo}` : `${event.actor?.login || user.login}`,
      timestamp: event.created_at, status: 'acknowledged', actor: event.actor?.login, repository: repo,
      linkUrl: repo ? `https://github.com/${repo}` : undefined,
      metadata: { public: Boolean(event.public) },
    };
  });
}

async function cloudflareNotifications(): Promise<NotificationItem[]> {
  const token = process.env.CLOUDFLARE_API_TOKEN, account = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!token || !account) return [];
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const scriptsRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts`, { headers });
  const scriptsBody = await scriptsRes.json() as any;
  if (!scriptsRes.ok || !scriptsBody.success) return [];
  const scripts = (scriptsBody.result || []).slice(0, 20);
  const batches = await Promise.all(scripts.map(async (script: any) => {
    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/${encodeURIComponent(script.id)}/deployments`, { headers });
    const body = await res.json() as any;
    if (!res.ok || !body.success) return [];
    const deployments = body.result?.deployments || body.result || [];
    return deployments.slice(0, 10).map((d: any): NotificationItem => ({
      id: `cloudflare-${d.id}`, sourceId: `cloudflare:${d.id}`, service: 'cloudflare', type: 'deployment_success',
      title: 'Worker deployment', message: `${script.id} · ${d.annotations?.['workers/message'] || d.source || 'deployment'}`,
      timestamp: d.created_on, status: 'acknowledged', actor: d.author_email,
      metadata: { worker: script.id, source: d.source || '', versions: Array.isArray(d.versions) ? d.versions.length : 0 },
    }));
  }));
  return batches.flat();
}

export async function listNotifications(limit: number = 30): Promise<NotificationItem[]> {
  const settled = await Promise.allSettled([githubNotifications(), cloudflareNotifications()]);
  for (const result of settled) if (result.status === 'fulfilled') merge(result.value);
  return notificationsList.slice(0, limit);
}

export async function createNotification(item: Omit<NotificationItem, 'id' | 'timestamp'>): Promise<NotificationItem> {
  const newNotif: NotificationItem = { ...item, id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, timestamp: new Date().toISOString() };
  merge([newNotif]);
  return newNotif;
}
