import type { Job } from 'bullmq';
import { eq, and } from 'drizzle-orm';
import { db } from '@kaibase/db';
import { sources, activityEvents, workspaces } from '@kaibase/db';
import {
  OpenAIProvider,
  summarizeSourcePrompt,
  SUMMARIZE_PROMPT_VERSION,
} from '@kaibase/ai';
import type { LLMReasoningEffort, SummarizeSourceResult } from '@kaibase/ai';
import { resolveLanguageFromText } from '@kaibase/shared';
import pino from 'pino';

const logger = pino({ name: 'summarize-worker' });

/** Lazily initialized LLM provider (one per worker process). */
let llm: OpenAIProvider | undefined;

function getLLM(): OpenAIProvider {
  if (!llm) {
    llm = new OpenAIProvider({
      apiKey: process.env['OPENAI_API_KEY'] ?? '',
      model: process.env['SUMMARIZE_MODEL'] ?? 'gpt-5.4',
    });
  }
  return llm;
}

const SUMMARIZE_REASONING_EFFORT =
  (process.env['SUMMARIZE_REASONING'] as LLMReasoningEffort | undefined) ?? 'medium';

/** Maximum character length of source text sent to the LLM. */
const MAX_SOURCE_CHARS = 100_000;

export async function processSummarizeJob(job: Job): Promise<{ sourceId: string; summarized: boolean; language?: string; keyPointsCount?: number; reason?: string }> {
    const { sourceId, workspaceId } = job.data as {
      sourceId: string;
      workspaceId: string;
    };
    logger.info({ sourceId, workspaceId, jobId: job.id }, 'Summarizing source');

    // 1. Fetch source from DB (workspace-scoped)
    const [source] = await db
      .select({
        id: sources.id,
        contentText: sources.contentText,
        title: sources.title,
        rawMetadata: sources.rawMetadata,
      })
      .from(sources)
      .where(
        and(eq(sources.id, sourceId), eq(sources.workspaceId, workspaceId)),
      );

    if (!source) {
      logger.warn({ sourceId, workspaceId }, 'Source not found, skipping');
      return { sourceId, summarized: false, reason: 'source_not_found' };
    }

    const contentText = source.contentText;
    if (!contentText || contentText.trim().length === 0) {
      logger.warn({ sourceId }, 'Source has no content text, skipping');
      return { sourceId, summarized: false, reason: 'empty_content' };
    }

    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.id, workspaceId),
      columns: {
        defaultLanguage: true,
      },
    });

    // 2. Resolve generation language from content before using workspace fallback
    const language = resolveLanguageFromText(
      contentText,
      workspace?.defaultLanguage ?? 'en',
    );

    // Truncate very long sources to stay within model context window
    const truncatedText =
      contentText.length > MAX_SOURCE_CHARS
        ? contentText.slice(0, MAX_SOURCE_CHARS)
        : contentText;

    // 3. Build prompt and call LLM
    const messages = summarizeSourcePrompt({
      sourceText: truncatedText,
      sourceTitle: source.title ?? undefined,
      language,
    });

    const provider = getLLM();
    const response = await provider.complete(messages, {
      jsonMode: true,
      reasoningEffort: SUMMARIZE_REASONING_EFFORT,
    });

    logger.info(
      {
        sourceId,
        model: response.model,
        inputTokens: response.tokenUsage.input,
        outputTokens: response.tokenUsage.output,
      },
      'LLM summarization complete',
    );

    // 4. Parse response
    let result: SummarizeSourceResult;
    try {
      result = JSON.parse(response.content) as SummarizeSourceResult;
    } catch (parseError: unknown) {
      logger.error(
        { sourceId, content: response.content },
        'Failed to parse LLM response as JSON',
      );
      throw new Error(
        `Summarize LLM response is not valid JSON: ${
          parseError instanceof Error ? parseError.message : String(parseError)
        }`,
        { cause: parseError },
      );
    }

    // Validate required fields
    if (!result.summary || !Array.isArray(result.keyPoints)) {
      logger.error(
        { sourceId, result },
        'LLM response missing required fields',
      );
      throw new Error(
        'Summarize LLM response missing required fields (summary, keyPoints)',
      );
    }

    // 5. Merge summary into source rawMetadata and persist
    const existingMetadata =
      (source.rawMetadata as Record<string, unknown>) ?? {};

    await db
      .update(sources)
      .set({
        rawMetadata: {
          ...existingMetadata,
          summary: {
            text: result.summary,
            keyPoints: result.keyPoints,
            language: result.language,
            promptVersion: SUMMARIZE_PROMPT_VERSION,
            model: response.model,
            tokenUsage: {
              input: response.tokenUsage.input,
              output: response.tokenUsage.output,
            },
            generatedAt: new Date().toISOString(),
          },
        },
      })
      .where(
        and(eq(sources.id, sourceId), eq(sources.workspaceId, workspaceId)),
      );

    // 6. Append activity event (append-only log)
    await db.insert(activityEvents).values({
      workspaceId,
      eventType: 'ingest',
      actorType: 'ai',
      actorId: response.model,
      targetType: 'source',
      targetId: sourceId,
      detail: {
        step: 'summarize',
        promptVersion: SUMMARIZE_PROMPT_VERSION,
        model: response.model,
        tokenUsage: {
          input: response.tokenUsage.input,
          output: response.tokenUsage.output,
        },
        summaryLength: result.summary.length,
        keyPointsCount: result.keyPoints.length,
        language: result.language,
      },
    });

    logger.info(
      {
        sourceId,
        summaryLength: result.summary.length,
        keyPointsCount: result.keyPoints.length,
      },
      'Source summarized successfully',
    );

    return {
      sourceId,
      summarized: true,
      language: result.language,
      keyPointsCount: result.keyPoints.length,
    };
}
