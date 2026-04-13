import type { Job } from 'bullmq';
import { eq, and, inArray } from 'drizzle-orm';
import { db } from '@kaibase/db';
import {
  sources,
  canonicalPages,
  citations,
  compilationTraces,
  reviewTasks,
  activityEvents,
  policyPacks,
  entities,
  concepts,
  pageTemplates,
  workspaces,
} from '@kaibase/db';
import {
  OpenAIProvider,
  createPagePrompt,
  CREATE_PAGE_PROMPT_VERSION,
} from '@kaibase/ai';
import type {
  CreatePageInput,
  CreatePageSource,
  CreatePageResult,
  LLMReasoningEffort,
  LLMResponse,
} from '@kaibase/ai';
import { PolicyEngine } from '@kaibase/policy';
import type { Language, PolicyPack, PolicyEvaluationResult } from '@kaibase/shared';
import {
  generateId,
  detectLanguage,
  resolveGenerationLanguage,
} from '@kaibase/shared';
import { queues } from '../queues.js';
import pino from 'pino';

const logger = pino({ name: 'page-create-worker' });

// ---------------------------------------------------------------------------
// LLM provider — lazy singleton (capable model tier for page creation)
// ---------------------------------------------------------------------------

let llmInstance: OpenAIProvider | undefined;

function getLLM(): OpenAIProvider {
  if (!llmInstance) {
    const apiKey = process.env['OPENAI_API_KEY'];
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    llmInstance = new OpenAIProvider({
      apiKey,
      model: process.env['PAGE_CREATE_MODEL'] ?? 'gpt-5.4',
    });
  }
  return llmInstance;
}

const PAGE_CREATE_REASONING_EFFORT =
  (process.env['PAGE_CREATE_REASONING'] as LLMReasoningEffort | undefined) ?? 'medium';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100);
}

/**
 * Map a policy outcome to the canonical page status column value.
 */
function statusFromOutcome(
  outcome: PolicyEvaluationResult['outcome'],
): 'published' | 'draft' | 'review_pending' {
  switch (outcome) {
    case 'AUTO_PUBLISH':
      return 'published';
    case 'DRAFT_ONLY':
      return 'draft';
    case 'REVIEW_REQUIRED':
      return 'review_pending';
    default:
      // Should never be called for BLOCKED — caller returns early.
      return 'draft';
  }
}

/**
 * Collect the unique set of source IDs referenced in block citations.
 */
function collectCitedSourceIds(blocks: CreatePageResult['blocks']): Set<string> {
  const cited = new Set<string>();
  for (const block of blocks) {
    if (block.citations) {
      for (const sid of block.citations) {
        cited.add(sid);
      }
    }
  }
  return cited;
}

// ---------------------------------------------------------------------------
// Worker
// ---------------------------------------------------------------------------

export async function processPageCreateJob(job: Job): Promise<Record<string, unknown>> {
    const {
      sourceIds,
      workspaceId,
      pageType,
      extractedEntityIds,
      extractedConceptIds,
      pageLanguage,
    } = job.data as {
      sourceIds: string[];
      workspaceId: string;
      pageType: string;
      extractedEntityIds?: string[];
      extractedConceptIds?: string[];
      pageLanguage?: Language;
    };
    logger.info(
      { sourceIds, workspaceId, pageType, jobId: job.id },
      'Creating page from sources',
    );

    // -----------------------------------------------------------------
    // 1. Fetch sources from DB (workspace-scoped)
    // -----------------------------------------------------------------
    const fetchedSources = await db.query.sources.findMany({
      where: and(
        inArray(sources.id, sourceIds),
        eq(sources.workspaceId, workspaceId),
      ),
    });

    if (fetchedSources.length === 0) {
      logger.warn({ sourceIds, workspaceId }, 'No sources found, skipping');
      return { sourceIds, pageCreated: false, reason: 'no_sources_found' };
    }

    // Filter to sources that have extractable text content
    const usableSources = fetchedSources.filter((s) => s.contentText);
    if (usableSources.length === 0) {
      logger.warn(
        { sourceIds, workspaceId },
        'All sources lack contentText, skipping',
      );
      return { sourceIds, pageCreated: false, reason: 'no_content' };
    }

    // -----------------------------------------------------------------
    // 2. Evaluate policy (AUTO_PUBLISH | DRAFT_ONLY | REVIEW_REQUIRED | BLOCKED)
    // -----------------------------------------------------------------
    const activePack = await db.query.policyPacks.findFirst({
      where: and(
        eq(policyPacks.workspaceId, workspaceId),
        eq(policyPacks.isActive, true),
      ),
    });

    let policyResult: PolicyEvaluationResult;

    if (activePack) {
      // The DB row stores rules as jsonb; cast to the shared PolicyPack type.
      const pack: PolicyPack = {
        id: activePack.id,
        workspaceId: activePack.workspaceId,
        name: activePack.name,
        version: activePack.version,
        isActive: activePack.isActive,
        defaultOutcome: activePack.defaultOutcome as PolicyPack['defaultOutcome'],
        rules: activePack.rules as PolicyPack['rules'],
        createdAt: activePack.createdAt,
        updatedAt: activePack.updatedAt,
        createdBy: activePack.createdBy,
      };
      const engine = new PolicyEngine(pack);
      policyResult = engine.evaluate({
        actor_type: 'ai',
        action_type: 'page_create',
        source_type: (usableSources[0] as (typeof usableSources)[number]).sourceType,
      });
    } else {
      // No active policy pack — default to REVIEW_REQUIRED (safest)
      policyResult = {
        outcome: 'REVIEW_REQUIRED',
        matchedRuleId: null,
        matchedRuleName: null,
        reasoning: 'No active policy pack found for workspace. Defaulting to REVIEW_REQUIRED.',
      };
    }

    logger.info(
      { workspaceId, outcome: policyResult.outcome, reasoning: policyResult.reasoning },
      'Policy evaluation complete',
    );

    // BLOCKED: log and exit — do not create any page
    if (policyResult.outcome === 'BLOCKED') {
      logger.warn(
        { workspaceId, sourceIds, reasoning: policyResult.reasoning },
        'Page creation blocked by policy',
      );

      await db.insert(activityEvents).values({
        workspaceId,
        eventType: 'page_create',
        actorType: 'ai',
        targetType: 'canonical_page',
        detail: {
          sourceIds,
          pageType,
          policyOutcome: policyResult.outcome,
          policyReasoning: policyResult.reasoning,
          blocked: true,
        },
      });

      return { sourceIds, pageCreated: false, reason: 'blocked_by_policy' };
    }

    // -----------------------------------------------------------------
    // 3. Call LLM with create-page prompt (capable model tier)
    // -----------------------------------------------------------------
    const combinedText = usableSources.map((s) => s.contentText).join('\n\n');
    const detectedLang = detectLanguage(combinedText);

    const createPageSources: CreatePageSource[] = usableSources.map((s) => ({
      sourceId: s.id,
      title: s.title ?? undefined,
      text: s.contentText ?? '',
    }));

    // Fetch extracted entities/concepts and active template in parallel
    let workspaceContext: string | undefined;
    const [entityRecords, conceptRecords, activeTemplate, workspace] = await Promise.all([
      extractedEntityIds?.length
        ? db
            .select({ name: entities.name, entityType: entities.entityType, description: entities.description })
            .from(entities)
            .where(inArray(entities.id, extractedEntityIds))
        : Promise.resolve([]),
      extractedConceptIds?.length
        ? db
            .select({ name: concepts.name, description: concepts.description })
            .from(concepts)
            .where(inArray(concepts.id, extractedConceptIds))
        : Promise.resolve([]),
      db.query.pageTemplates.findFirst({
        where: and(
          eq(pageTemplates.workspaceId, workspaceId),
          eq(pageTemplates.pageType, pageType as 'project' | 'entity' | 'concept' | 'brief' | 'answer' | 'summary' | 'comparison' | 'custom'),
          eq(pageTemplates.isActive, true),
        ),
      }),
      db.query.workspaces.findFirst({
        where: eq(workspaces.id, workspaceId),
        columns: {
          defaultLanguage: true,
        },
      }),
    ]);

    const language = pageLanguage
      ?? resolveGenerationLanguage(detectedLang, workspace?.defaultLanguage ?? 'en');

    const contextParts: string[] = [];
    if (entityRecords.length > 0) {
      const entityLines = entityRecords
        .map((e) => `- ${e.name} (${e.entityType}): ${e.description ?? 'no description'}`)
        .join('\n');
      contextParts.push(`Entities extracted from the source:\n${entityLines}`);
    }
    if (conceptRecords.length > 0) {
      const conceptLines = conceptRecords
        .map((c) => `- ${c.name}: ${c.description ?? 'no description'}`)
        .join('\n');
      contextParts.push(`Concepts extracted from the source:\n${conceptLines}`);
    }
    if (contextParts.length > 0) {
      workspaceContext = contextParts.join('\n\n');
    }

    // -----------------------------------------------------------------
    // 3a. Process active template for this page type
    // -----------------------------------------------------------------
    let templateSections: CreatePageInput['templateSections'];
    let templateInstructions: string | undefined;
    let matchedTemplateId: string | undefined;

    if (activeTemplate) {
      matchedTemplateId = activeTemplate.id;
      const sections = activeTemplate.sections as Array<{ name: string; description?: string; required?: boolean }>;
      if (Array.isArray(sections) && sections.length > 0) {
        templateSections = sections.map((s) => ({
          heading: s.name,
          description: s.description ?? '',
          required: s.required ?? true,
        }));
      }
      if (activeTemplate.aiInstructions) {
        templateInstructions = activeTemplate.aiInstructions;
      }
      logger.info(
        { workspaceId, templateId: activeTemplate.id, pageType },
        'Using page template for compilation',
      );
    }

    // Merge template instructions with workspace context
    if (templateInstructions) {
      workspaceContext = workspaceContext
        ? `${workspaceContext}\n\nTemplate instructions:\n${templateInstructions}`
        : `Template instructions:\n${templateInstructions}`;
    }

    const promptInput: CreatePageInput = {
      sources: createPageSources,
      pageType: pageType as CreatePageInput['pageType'],
      language,
      templateSections,
      workspaceContext,
    };

    const messages = createPagePrompt(promptInput);
    const llm = getLLM();
    const response: LLMResponse = await llm.complete(messages, {
      jsonMode: true,
      reasoningEffort: PAGE_CREATE_REASONING_EFFORT,
    });

    const result = JSON.parse(response.content) as CreatePageResult;

    logger.info(
      {
        workspaceId,
        title: result.title,
        blockCount: result.blocks.length,
        model: response.model,
        tokenUsage: response.tokenUsage,
      },
      'LLM page creation complete',
    );

    // -----------------------------------------------------------------
    // 4-7. Create all DB records in a single transaction
    // -----------------------------------------------------------------
    const pageId = generateId();
    const pageStatus = statusFromOutcome(policyResult.outcome);

    await db.transaction(async (tx) => {
      // 4. Create CanonicalPage record
      await tx.insert(canonicalPages).values({
        id: pageId,
        workspaceId,
        pageType: pageType as 'project' | 'entity' | 'concept' | 'brief' | 'answer' | 'summary' | 'comparison' | 'custom',
        title: result.title,
        titleKo: result.titleKo ?? null,
        slug: generateSlug(result.title),
        contentSnapshot: JSON.stringify(result.blocks),
        status: pageStatus,
        createdBy: 'ai',
        language,
        templateId: matchedTemplateId ?? null,
      });

      // 5. Create Citation records for each source referenced in blocks
      const citedSourceIds = collectCitedSourceIds(result.blocks);

      // Also include all usable sources — they contributed even if the LLM
      // did not explicitly cite every one in block-level citations.
      for (const s of usableSources) {
        citedSourceIds.add(s.id);
      }

      if (citedSourceIds.size > 0) {
        const citationValues = [...citedSourceIds].map((sourceId) => {
          // Find a block that cites this source to get an excerpt
          const relevantBlock = result.blocks.find(
            (b) => b.citations?.includes(sourceId),
          );
          const excerpt = relevantBlock?.content?.slice(0, 200) ?? '';
          return {
            pageId,
            sourceId,
            excerpt,
            confidence: 1.0,
          };
        });

        await tx.insert(citations).values(citationValues);
      }

      // 6. Create CompilationTrace record
      await tx.insert(compilationTraces).values({
        pageId,
        sourceIds: usableSources.map((s) => s.id),
        templateId: matchedTemplateId ?? null,
        compilationLevel: 'L0',
        reasoning: result.reasoning,
        modelUsed: response.model,
        tokenUsage: {
          input: response.tokenUsage.input,
          output: response.tokenUsage.output,
          total: response.tokenUsage.input + response.tokenUsage.output,
        },
      });

      // 7a. If REVIEW_REQUIRED, create ReviewTask
      if (policyResult.outcome === 'REVIEW_REQUIRED') {
        await tx.insert(reviewTasks).values({
          workspaceId,
          taskType: 'page_creation',
          status: 'pending',
          targetPageId: pageId,
          proposedChange: { blocks: result.blocks },
          aiReasoning: result.reasoning,
          policyRuleId: policyResult.matchedRuleId ?? undefined,
        });
      }

      // 7b. Log activity event (append-only)
      await tx.insert(activityEvents).values({
        workspaceId,
        eventType: 'page_create',
        actorType: 'ai',
        actorId: response.model,
        targetType: 'canonical_page',
        targetId: pageId,
        detail: {
          sourceIds: usableSources.map((s) => s.id),
          pageType,
          policyOutcome: policyResult.outcome,
          title: result.title,
          blockCount: result.blocks.length,
          promptVersion: CREATE_PAGE_PROMPT_VERSION,
          model: response.model,
          tokenUsage: response.tokenUsage,
        },
      });
    });

    // -----------------------------------------------------------------
    // 8. Fan out: enqueue embedding job
    // -----------------------------------------------------------------
    await queues.aiPageCompile.add('embedding', { pageId, workspaceId });

    logger.info(
      { pageId, workspaceId, status: pageStatus },
      'Page created successfully, enqueued embedding job',
    );

    return {
      sourceIds: usableSources.map((s) => s.id),
      pageId,
      pageCreated: true,
      status: pageStatus,
      policyOutcome: policyResult.outcome,
    };
}
