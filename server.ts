import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { createApp } from './server/app.js';
async function start() {
const app = createApp();
if (process.env.NODE_ENV !== 'production') {
  const { createServer } = await import('vite');
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.resolve('dist')));
  app.get('*', (_req, res) => res.sendFile(path.resolve('dist/index.html')));
}
app.listen(Number(process.env.PORT || 3000), '0.0.0.0');
}
start();
