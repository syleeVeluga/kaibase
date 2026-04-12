import { serve } from '@hono/node-server';
import { app } from './app.js';
import { logger } from './logger.js';

const port = Number(process.env['PORT'] ?? 3001);

serve({ fetch: app.fetch, port }, (info) => {
  logger.info(`API server running on http://localhost:${info.port}`);
});
