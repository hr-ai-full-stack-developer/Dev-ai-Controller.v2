import { httpServerHandler } from 'cloudflare:node';
import { createApp } from '../server/app.js';
import { setAiBinding } from '../server/services/aiProvider.js';
import { setWorkerEnv } from '../server/runtimeEnv.js';
import { setCloudflareEmailBinding } from '../server/services/emailDeliveryService.js';
const app = createApp();
app.listen(3000);
const api = httpServerHandler({ port: 3000 });
export default {
  async fetch(request: Request, env: any, ctx: any) {
    setWorkerEnv(env);
    setAiBinding(env.AI);
    setCloudflareEmailBinding(env.EMAIL);
    const path = new URL(request.url).pathname;
    if (path.startsWith('/api/') || path.startsWith('/v1/')) return api.fetch(request, env, ctx);
    return env.ASSETS.fetch(request);
  },
  async email(message: any, env: Env): Promise<void> {
    setWorkerEnv(env);
    setCloudflareEmailBinding(env.EMAIL);
    const forwardTo = env.EMAIL_FORWARD_TO;
    if (!forwardTo) throw new Error('EMAIL_FORWARD_TO is not configured for inbound email routing.');
    await message.forward(forwardTo);
  },
};
