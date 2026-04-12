import { Worker } from 'bullmq';
import { QUEUE_NAMES, connection } from '../queues.js';
import pino from 'pino';

const logger = pino({ name: 'parse-worker' });

export const parseWorker = new Worker(
  QUEUE_NAMES.AI_INGEST,
  async (job) => {
    if (job.name !== 'parse') return;

    const { sourceId, filePath, mimeType: _mimeType, workspaceId } = job.data as {
      sourceId: string;
      filePath: string;
      mimeType: string;
      workspaceId: string;
    };
    logger.info({ sourceId, filePath, workspaceId }, 'Parsing file');

    // TODO: Use @kaibase/connectors parsers to extract text
    // 1. Parse file using parseFile(filePath, mimeType)
    // 2. Update source.content_text in DB
    // 3. Update source.status to 'processed'
    // 4. Add classify job to queue

    return { sourceId, parsed: true };
  },
  {
    connection,
    concurrency: 3,
  },
);
