import { httpServerHandler } from 'cloudflare:node';
import { createApp } from '../server/app.js';
import { setAiBinding } from '../server/services/aiProvider.js';
const app = createApp();
app.listen(3000);
const api = httpServerHandler({ port: 3000 });
export default {
  async fetch(request: Request, env: any, ctx: any) {
    setAiBinding(env.AI);
    const path = new URL(request.url).pathname;
    if (path.startsWith('/api/') || path.startsWith('/v1/')) return api.fetch(request, env, ctx);
    return env.ASSETS.fetch(request);
  },
};
