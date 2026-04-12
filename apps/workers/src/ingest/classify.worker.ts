import type { Job } from 'bullmq';
import { eq, and } from 'drizzle-orm';
import { db } from '@kaibase/db';
import { sources, activityEvents } from '@kaibase/db';
import {
  OpenAIProvider,
  classifySourcePrompt,
  CLASSIFY_PROMPT_VERSION,
} from '@kaibase/ai';
import type { ClassifySourceInput, ClassifySourceResult } from '@kaibase/ai';
import { queues } from '../queues.js';
import pino from 'pino';

const logger = pino({ name: 'classify-worker' });

/**
 * Lazy-initialized singleton LLM provider.
 * Uses the fast/cheap model tier for classification (GPT-4o-mini).
 */
let llmInstance: OpenAIProvider | undefined;

function getLLM(): OpenAIProvider {
  if (!llmInstance) {
    const apiKey = process.env['OPENAI_API_KEY'];
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    llmInstance = new OpenAIProvider({
      apiKey,
      model: process.env['CLASSIFY_MODEL'] ?? 'gpt-4o-mini',
    });
  }
  return llmInstance;
}

export async function processClassifyJob(job: Job): Promise<{ sourceId: string; classified: boolean; classification?: ClassifySourceResult; reason?: string }> {
    const { sourceId, workspaceId } = job.data as {
      sourceId: string;
      workspaceId: string;
    };
    logger.info({ sourceId, workspaceId, jobId: job.id }, 'Classifying source');

    // ---------------------------------------------------------------
    // 1. Fetch source from DB (workspace-scoped)
    // ---------------------------------------------------------------
    const source = await db.query.sources.findFirst({
      where: and(eq(sources.id, sourceId), eq(sources.workspaceId, workspaceId)),
    });

    if (!source) {
      logger.warn({ sourceId, workspaceId }, 'Source not found, skipping');
      return { sourceId, classified: false, reason: 'source_not_found' };
    }

    if (!source.contentText) {
      logger.warn({ sourceId, workspaceId }, 'Source has no contentText, skipping');
      return { sourceId, classified: false, reason: 'no_content' };
    }

    // ---------------------------------------------------------------
    // 2. Call LLM with classify prompt (fast model tier)
    // ---------------------------------------------------------------
    const promptInput: ClassifySourceInput = {
      sourceText: source.contentText,
      sourceTitle: source.title ?? undefined,
      sourceTypeHint: source.sourceType,
      language: (process.env['WORKSPACE_LANGUAGE'] as 'en' | 'ko') ?? 'en',
    };

    const messages = classifySourcePrompt(promptInput);
    const llm = getLLM();
    const response = await llm.complete(messages, { jsonMode: true });

    const classification = JSON.parse(response.content) as ClassifySourceResult;

    logger.info(
      {
        sourceId,
        workspaceId,
        contentType: classification.contentType,
        section: classification.section,
        urgency: classification.urgency,
        topics: classification.topics,
        model: response.model,
        tokenUsage: response.tokenUsage,
      },
      'Classification complete',
    );

    // ---------------------------------------------------------------
    // 3. Update source rawMetadata with classification result
    //    Merge with existing metadata to preserve prior fields.
    // ---------------------------------------------------------------
    const existingMetadata =
      (source.rawMetadata as Record<string, unknown>) ?? {};

    await db
      .update(sources)
      .set({
        rawMetadata: {
          ...existingMetadata,
          classification,
          classifyPromptVersion: CLASSIFY_PROMPT_VERSION,
          classifyModel: response.model,
          classifyTokenUsage: response.tokenUsage,
          classifiedAt: new Date().toISOString(),
        },
      })
      .where(
        and(eq(sources.id, sourceId), eq(sources.workspaceId, workspaceId)),
      );

    // ---------------------------------------------------------------
    // 3b. Append activity event (append-only log)
    // ---------------------------------------------------------------
    await db.insert(activityEvents).values({
      workspaceId,
      eventType: 'classify',
      actorType: 'ai',
      actorId: response.model,
      targetType: 'source',
      targetId: sourceId,
      detail: {
        contentType: classification.contentType,
        section: classification.section,
        urgency: classification.urgency,
        topics: classification.topics,
        promptVersion: CLASSIFY_PROMPT_VERSION,
        model: response.model,
        tokenUsage: response.tokenUsage,
      },
    });

    // ---------------------------------------------------------------
    // 4. Fan out: summarize (parallel) + extract-entities (which
    //    enqueues page-create after extraction completes)
    // ---------------------------------------------------------------
    await Promise.all([
      queues.aiIngest.add('summarize', { sourceId, workspaceId }),
      queues.aiIngest.add('extract-entities', {
        sourceId,
        workspaceId,
        classification: {
          section: classification.section,
          contentType: classification.contentType,
        },
      }),
    ]);

    logger.info(
      { sourceId, workspaceId },
      'Enqueued summarize and extract-entities jobs',
    );

    return {
      sourceId,
      classified: true,
      classification,
    };
}
