import { Worker, type Job } from 'bullmq';
import { QUEUE_NAMES, connection } from '../queues.js';
import { processParseJob } from './parse.worker.js';
import { processClassifyJob } from './classify.worker.js';
import { processSummarizeJob } from './summarize.worker.js';
import { processExtractEntitiesJob } from './extract-entities.worker.js';

async function dispatchIngestJob(job: Job): Promise<unknown> {
  switch (job.name) {
    case 'parse':
      return processParseJob(job);
    case 'classify':
      return processClassifyJob(job);
    case 'summarize':
      return processSummarizeJob(job);
    case 'extract-entities':
      return processExtractEntitiesJob(job);
    default:
      throw new Error(`Unsupported ai-ingest job name: ${job.name}`);
  }
}

export const ingestWorker = new Worker(QUEUE_NAMES.AI_INGEST, dispatchIngestJob, {
  connection,
  concurrency: 5,
});