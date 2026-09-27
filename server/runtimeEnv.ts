let workerEnv: Record<string, unknown> | null = null;

export function setWorkerEnv(env: Record<string, unknown> | null | undefined) {
  workerEnv = env || null;
}

export function runtimeEnv(name: string): string {
  const bound = workerEnv?.[name];
  if (typeof bound === 'string' && bound.length > 0) return bound;
  return process.env[name] || '';
}
