import { Queue } from 'bullmq';
import type { ConnectionOptions } from 'bullmq';

const connection: ConnectionOptions = {
  host: process.env['REDIS_HOST'] ?? 'localhost',
  port: Number(process.env['REDIS_PORT'] ?? 6379),
};

export const QUEUE_NAMES = {
  AI_INGEST: 'ai-ingest',
  AI_PAGE_COMPILE: 'ai-page-compile',
} as const;

export const ingestQueue = new Queue(QUEUE_NAMES.AI_INGEST, { connection });
export const compileQueue = new Queue(QUEUE_NAMES.AI_PAGE_COMPILE, { connection });
