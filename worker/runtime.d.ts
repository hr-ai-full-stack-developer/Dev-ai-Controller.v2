declare module 'cloudflare:node' {
  export function httpServerHandler(options: { port: number }): { fetch(request: Request, env: any, ctx: any): Promise<Response> };
}
