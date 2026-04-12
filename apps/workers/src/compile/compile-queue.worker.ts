import { Worker, type Job } from 'bullmq';
import { QUEUE_NAMES, connection } from '../queues.js';
import { processPageCreateJob } from './page-create.worker.js';
import { processEmbeddingJob } from './embedding.worker.js';

async function dispatchCompileJob(job: Job): Promise<unknown> {
  switch (job.name) {
    case 'page-create':
      return processPageCreateJob(job);
    case 'embedding':
      return processEmbeddingJob(job);
    default:
      throw new Error(`Unsupported ai-page-compile job name: ${job.name}`);
  }
}

export const compileWorker = new Worker(QUEUE_NAMES.AI_PAGE_COMPILE, dispatchCompileJob, {
  connection,
  concurrency: 3,
});