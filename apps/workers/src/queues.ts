import { Queue } from 'bullmq';
import type { ConnectionOptions } from 'bullmq';

const connection: ConnectionOptions = {
  host: process.env['REDIS_HOST'] ?? 'localhost',
  port: Number(process.env['REDIS_PORT'] ?? 6379),
};

export const QUEUE_NAMES = {
  AI_INGEST: 'ai-ingest',
  AI_PAGE_COMPILE: 'ai-page-compile',
  AI_QUERY: 'ai-query',
  AI_LINT: 'ai-lint',
  AI_CHANNEL: 'ai-channel',
  GRAPH_RECOMPUTE: 'graph-recompute',
  NOTIFICATION_SEND: 'notification-send',
} as const;

export const queues = {
  aiIngest: new Queue(QUEUE_NAMES.AI_INGEST, { connection }),
  aiPageCompile: new Queue(QUEUE_NAMES.AI_PAGE_COMPILE, { connection }),
  aiQuery: new Queue(QUEUE_NAMES.AI_QUERY, { connection }),
  aiLint: new Queue(QUEUE_NAMES.AI_LINT, { connection }),
  aiChannel: new Queue(QUEUE_NAMES.AI_CHANNEL, { connection }),
  graphRecompute: new Queue(QUEUE_NAMES.GRAPH_RECOMPUTE, { connection }),
  notificationSend: new Queue(QUEUE_NAMES.NOTIFICATION_SEND, { connection }),
};

export { connection };
