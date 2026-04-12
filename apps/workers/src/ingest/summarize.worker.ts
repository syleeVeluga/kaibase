import { Worker } from 'bullmq';
import { QUEUE_NAMES, connection } from '../queues.js';
import pino from 'pino';

const logger = pino({ name: 'summarize-worker' });

export const summarizeWorker = new Worker(
  QUEUE_NAMES.AI_INGEST,
  async (job) => {
    if (job.name !== 'summarize') return;

    const { sourceId, workspaceId } = job.data as { sourceId: string; workspaceId: string };
    logger.info({ sourceId, workspaceId }, 'Summarizing source');

    // TODO: Implement summarization using @kaibase/ai summarize prompt
    // 1. Fetch source content from DB
    // 2. Call LLM with summarize prompt
    // 3. Store summary

    return { sourceId, summarized: true };
  },
  {
    connection,
    concurrency: 3,
  },
);
