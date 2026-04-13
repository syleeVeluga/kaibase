import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { askQuestionSchema, promoteAnswerSchema, generateId, type PolicyPack } from '@kaibase/shared';
import { detectLanguage, resolveGenerationLanguage } from '@kaibase/shared';
import { authMiddleware } from '../middleware/auth.js';
import { workspaceMiddleware } from '../middleware/workspace.js';
import { AppError } from '../middleware/error-handler.js';
import { db } from '@kaibase/db/client';
import {
  getCollectionTypeForPageType,
  resolveCollectionIdByType,
} from '@kaibase/db';
import {
  canonicalPages,
  activityEvents,
  compilationTraces,
  policyPacks,
  workspaces,
} from '@kaibase/db/schema';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import {
  answerQuestionPrompt,
  type AnswerQuestionResult,
  type AnswerContextPage,
  type LLMReasoningEffort,
} from '@kaibase/ai';
import { PolicyEngine } from '@kaibase/policy';
import { getEmbeddingProvider, getQALLM as getLLM } from '../providers.js';
import { compileQueue } from '../queues.js';
import { logger } from '../logger.js';
import type { AppEnv } from '../types.js';

export const qaRoutes = new Hono<AppEnv>();

const QA_REASONING_EFFORT =
  (process.env['QA_REASONING'] as LLMReasoningEffort | undefined) ?? 'medium';

qaRoutes.use('*', authMiddleware());
qaRoutes.use('*', workspaceMiddleware());

// ---------------------------------------------------------------------------
// POST /ask — answer a question using canonical pages (+ raw sources fallback)
// ---------------------------------------------------------------------------
qaRoutes.post('/ask', zValidator('json', askQuestionSchema), async (c) => {
  const workspaceId = c.get('workspaceId');
  const user = c.get('user');
  const { question, language, pageFilter } = c.req.valid('json');

  const detectedLang = language ?? 'en';

  // 1. Embed the question
  const queryEmbedding = await getEmbeddingProvider().generateEmbedding(question);
  const vecLiteral = `[${queryEmbedding.join(',')}]`;

  // 2. Semantic search on page embeddings (cosine distance via pgvector <=> operator)
  //    Join with canonical_pages for workspace scoping and to fetch page content.
  const pageFilterCondition =
    pageFilter && pageFilter.length > 0
      ? sql`AND cp.id IN (${sql.join(
          pageFilter.map((id) => sql`${id}::uuid`),
          sql`, `,
        )})`
      : sql``;

  const semanticResults = await db.execute<{
    page_id: string;
    title: string;
    content_snapshot: string;
    score: number;
  }>(sql`
    SELECT
      cp.id AS page_id,
      cp.title,
      cp.content_snapshot,
      1 - (pe.embedding <=> ${vecLiteral}::vector) AS score
    FROM page_embeddings pe
    JOIN canonical_pages cp ON cp.id = pe.page_id
    WHERE cp.workspace_id = ${workspaceId}
      AND cp.status IN ('published', 'draft')
      ${pageFilterCondition}
    ORDER BY pe.embedding <=> ${vecLiteral}::vector
    LIMIT 10
  `);

  // Deduplicate by page_id (a page may have multiple chunk matches)
  const seenPages = new Set<string>();
  const contextPages: AnswerContextPage[] = [];
  for (const row of semanticResults) {
    if (seenPages.has(row.page_id)) continue;
    seenPages.add(row.page_id);
    contextPages.push({
      pageId: row.page_id,
      title: row.title,
      content: row.content_snapshot.slice(0, 8000),
    });
    if (contextPages.length >= 5) break;
  }

  // 3. Call LLM to generate answer
  const messages = answerQuestionPrompt({
    question,
    language: detectedLang,
    contextPages,
  });

  let llmResponse;
  try {
    llmResponse = await getLLM().complete(messages, {
      jsonMode: true,
      temperature: 0.3,
      maxTokens: 2000,
      reasoningEffort: QA_REASONING_EFFORT,
    });
  } catch (err) {
    logger.error({ err }, 'LLM call failed');
    throw new AppError(502, 'LLM_UNAVAILABLE', 'errors.llmUnavailable');
  }

  let result: AnswerQuestionResult;
  try {
    result = JSON.parse(llmResponse.content) as AnswerQuestionResult;
  } catch {
    throw new AppError(500, 'LLM_PARSE_ERROR', 'errors.llmParseError');
  }

  // 4. Log activity events (query + answer)
  const answerId = generateId();
  await db.insert(activityEvents).values([
    {
      id: generateId(),
      workspaceId,
      eventType: 'query',
      actorType: 'user',
      actorId: user.userId,
      targetType: 'workspace',
      targetId: workspaceId,
      detail: { question, language: detectedLang, pageFilter: pageFilter ?? null },
    },
    {
      id: answerId,
      workspaceId,
      eventType: 'answer',
      actorType: 'ai',
      actorId: llmResponse.model ?? 'gpt-4o',
      targetType: 'workspace',
      targetId: workspaceId,
      detail: {
        question,
        answer: result.answer,
        citations: result.citations,
        confidence: result.confidence,
        intentType: result.intentType,
        canonicalOnly: result.canonicalOnly,
        tokenUsage: llmResponse.tokenUsage,
      },
    },
  ]);

  return c.json({
    answerId,
    answer: result.answer,
    citations: result.citations,
    confidence: result.confidence,
    intentType: result.intentType,
    canonicalOnly: result.canonicalOnly,
  });
});

// ---------------------------------------------------------------------------
// GET /history — Q&A conversation history
// ---------------------------------------------------------------------------
qaRoutes.get('/history', async (c) => {
  const workspaceId = c.get('workspaceId');
  const limit = Math.min(parseInt(c.req.query('limit') ?? '50') || 50, 100);
  const cursor = c.req.query('cursor');

  const conditions = [
    eq(activityEvents.workspaceId, workspaceId),
    inArray(activityEvents.eventType, ['query', 'answer']),
  ];

  if (cursor) {
    conditions.push(sql`${activityEvents.createdAt} < ${cursor}::timestamptz`);
  }

  const events = await db
    .select()
    .from(activityEvents)
    .where(and(...conditions))
    .orderBy(desc(activityEvents.createdAt))
    .limit(limit + 1);

  const hasMore = events.length > limit;
  if (hasMore) events.pop();

  const nextCursor =
    hasMore && events.length > 0
      ? events[events.length - 1]?.createdAt.toISOString() ?? null
      : null;

  return c.json({ events, nextCursor });
});

// ---------------------------------------------------------------------------
// POST /answers/:aid/promote — promote an answer to a canonical page
// ---------------------------------------------------------------------------
qaRoutes.post(
  '/answers/:aid/promote',
  zValidator('json', promoteAnswerSchema),
  async (c) => {
    const workspaceId = c.get('workspaceId');
    const user = c.get('user');
    const answerId = c.req.param('aid');
    const input = c.req.valid('json');

    // 1. Fetch the answer activity event
    const answerRows = await db
      .select()
      .from(activityEvents)
      .where(
        and(
          eq(activityEvents.id, answerId),
          eq(activityEvents.workspaceId, workspaceId),
          eq(activityEvents.eventType, 'answer'),
        ),
      )
      .limit(1);

    const answerEvent = answerRows[0];
    if (!answerEvent) {
      throw new AppError(404, 'ANSWER_NOT_FOUND', 'errors.notFound');
    }
    const detail = answerEvent.detail as {
      question: string;
      answer: string;
      citations: Array<{ type: string; refId: string; title: string; excerpt: string }>;
      confidence: number;
    };

    // 2. Evaluate policy
    const policyRows = await db
      .select()
      .from(policyPacks)
      .where(and(eq(policyPacks.workspaceId, workspaceId), eq(policyPacks.isActive, true)))
      .limit(1);

    const activePack = policyRows[0];
    let outcome = 'REVIEW_REQUIRED';
    let matchedRuleId: string | undefined;
    let targetCollectionType = getCollectionTypeForPageType(input.pageType);

    if (activePack) {
      const policyContext = {
        actor_type: 'ai',
        action_type: 'page_create',
        source_type: 'qa_answer',
        confidence: detail.confidence,
      };
      const engine = new PolicyEngine(activePack as unknown as PolicyPack);
      const decision = engine.evaluate(policyContext);
      outcome = decision.outcome;
      matchedRuleId = decision.matchedRuleId ?? undefined;
      targetCollectionType = decision.targetCollectionType ?? targetCollectionType;
    }

    if (outcome === 'BLOCKED') {
      throw new AppError(403, 'POLICY_BLOCKED', 'errors.policyBlocked');
    }

    // 3. Determine page status based on policy
    const pageStatus =
      outcome === 'AUTO_PUBLISH'
        ? 'published'
        : outcome === 'DRAFT_ONLY'
          ? 'draft'
          : 'review_pending';

    const collectionId = input.collectionId ?? await resolveCollectionIdByType({
      workspaceId,
      collectionType: targetCollectionType,
    });

    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.id, workspaceId),
      columns: {
        defaultLanguage: true,
      },
    });

    // 5. Create page in a transaction
    const pageId = generateId();
    const title = input.title ?? detail.question;
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 100);
    const traceId = generateId();
    const detectedPageLanguage = detectLanguage(
      `${title}\n${detail.answer ?? ''}`,
    );
    const pageLanguage = input.language
      ?? resolveGenerationLanguage(
        detectedPageLanguage,
        workspace?.defaultLanguage ?? 'en',
      );

    // Build content blocks from answer
    const contentBlocks = [
      { type: 'heading', level: 1, content: title },
      { type: 'paragraph', content: detail.answer },
    ];

    await db.transaction(async (tx) => {
      await tx.insert(canonicalPages).values({
        id: pageId,
        workspaceId,
        pageType: input.pageType,
        title,
        slug,
        contentSnapshot: JSON.stringify(contentBlocks),
        status: pageStatus,
        createdBy: 'ai',
        createdByUserId: user.userId,
        collectionId,
        compilationTraceId: traceId,
        language: pageLanguage,
        publishedAt: pageStatus === 'published' ? new Date() : null,
      });

      await tx.insert(compilationTraces).values({
        id: traceId,
        pageId,
        sourceIds: [],
        compilationLevel: 'L0',
        reasoning: `Answer promotion from Q&A. Question: ${detail.question}`,
        decisions: { policyOutcome: outcome, matchedRuleId },
        modelUsed: 'qa-promotion',
        tokenUsage: {},
      });

      await tx.insert(activityEvents).values({
        id: generateId(),
        workspaceId,
        eventType: 'page_create',
        actorType: 'ai',
        actorId: user.userId,
        targetType: 'canonical_page',
        targetId: pageId,
        detail: {
          promotedFromAnswer: answerId,
          policyOutcome: outcome,
          pageType: input.pageType,
          targetCollectionType,
        },
      });
    });

    // 6. Enqueue embedding job
    await compileQueue.add('embedding', { pageId, workspaceId });

    return c.json({ pageId, slug, status: pageStatus, policyOutcome: outcome }, 201);
  },
);
