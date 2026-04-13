import type { Job } from 'bullmq';
import { eq, and } from 'drizzle-orm';
import { db } from '@kaibase/db';
import { sources, activityEvents, workspaces } from '@kaibase/db';
import {
  classifySourcePrompt,
  CLASSIFY_PROMPT_VERSION,
} from '@kaibase/ai';
import type {
  ClassifySourceInput,
  ClassifySourceResult,
} from '@kaibase/ai';
import { queues } from '../queues.js';
import { resolveLanguageFromText } from '@kaibase/shared';
import { getOrCreateProvider } from '../provider-cache.js';
import { resolveAiConfig, applyPromptOverrides } from '../resolve-ai-config.js';
import pino from 'pino';

const logger = pino({ name: 'classify-worker' });

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

    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.id, workspaceId),
      columns: {
        defaultLanguage: true,
      },
    });

    // ---------------------------------------------------------------
    // 2. Call LLM with classify prompt (fast model tier)
    // ---------------------------------------------------------------
    const promptInput: ClassifySourceInput = {
      sourceText: source.contentText,
      sourceTitle: source.title ?? undefined,
      sourceTypeHint: source.sourceType,
      language: resolveLanguageFromText(
        source.contentText,
        workspace?.defaultLanguage ?? 'en',
      ),
    };

    const aiConfig = await resolveAiConfig('classify', workspaceId);
    const rawMessages = classifySourcePrompt(promptInput);
    const messages = applyPromptOverrides(rawMessages, aiConfig);
    const llm = getOrCreateProvider(aiConfig.model);
    const response = await llm.complete(messages, {
      jsonMode: true,
      temperature: aiConfig.temperature,
      reasoningEffort: aiConfig.reasoningEffort,
    });

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
