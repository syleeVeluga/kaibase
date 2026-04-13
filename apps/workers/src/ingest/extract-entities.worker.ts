import type { Job } from 'bullmq';
import { eq, and, desc, sql } from 'drizzle-orm';
import { queues } from '../queues.js';
import { db } from '@kaibase/db';
import { sources, entities, concepts, activityEvents, workspaces } from '@kaibase/db';
import {
  OpenAIProvider,
  extractEntitiesPrompt,
  EXTRACT_ENTITIES_PROMPT_VERSION,
} from '@kaibase/ai';
import type {
  ExtractEntitiesResult,
  ExtractedEntity,
  ExtractedConcept,
  LLMReasoningEffort,
} from '@kaibase/ai';
import { detectLanguage, resolveGenerationLanguage } from '@kaibase/shared';
import type { EntityType } from '@kaibase/shared';
import pino from 'pino';

const logger = pino({ name: 'extract-entities-worker' });

/** Lazily initialized LLM provider (fast/cheap tier for extraction). */
let llm: OpenAIProvider | undefined;

function getLLM(): OpenAIProvider {
  if (!llm) {
    llm = new OpenAIProvider({
      apiKey: process.env['OPENAI_API_KEY'] ?? '',
      model: process.env['EXTRACT_ENTITIES_MODEL'] ?? 'gpt-5.4-mini',
    });
  }
  return llm;
}

const EXTRACT_ENTITIES_REASONING_EFFORT =
  (process.env['EXTRACT_ENTITIES_REASONING'] as LLMReasoningEffort | undefined) ?? 'low';

/** Maximum character length of source text sent to the LLM. */
const MAX_SOURCE_CHARS = 100_000;

/** Maximum known entities to include in prompt context. */
const MAX_KNOWN_ENTITIES = 200;

/** Valid entity types matching the DB enum. */
const VALID_ENTITY_TYPES: ReadonlySet<string> = new Set([
  'person', 'organization', 'product', 'technology', 'location', 'event', 'custom',
]);

function validateEntityType(type: string): EntityType {
  if (!VALID_ENTITY_TYPES.has(type)) {
    throw new Error(`Invalid entity type from LLM: "${type}"`);
  }
  return type as EntityType;
}

/**
 * Upsert an entity record via ON CONFLICT DO UPDATE.
 * On conflict (workspace + name + type), merges aliases and keeps the longer description.
 */
async function upsertEntity(
  workspaceId: string,
  extracted: ExtractedEntity,
  language: 'en' | 'ko',
): Promise<string> {
  const entityType = validateEntityType(extracted.type);

  const [row] = await db
    .insert(entities)
    .values({
      workspaceId,
      entityType,
      name: extracted.name,
      nameKo: language === 'ko' ? extracted.name : null,
      aliases: extracted.aliases,
      description: extracted.description,
      metadata: {},
    })
    .onConflictDoUpdate({
      target: [entities.workspaceId, entities.name, entities.entityType],
      set: {
        aliases: sql`(SELECT ARRAY(SELECT DISTINCT unnest(${entities.aliases} || excluded.aliases) ORDER BY 1))`,
        description: sql`CASE WHEN COALESCE(length(excluded.description), 0) > COALESCE(length(${entities.description}), 0) THEN excluded.description ELSE ${entities.description} END`,
        updatedAt: sql`now()`,
      },
    })
    .returning({ id: entities.id });

  if (!row) throw new Error('Entity upsert returned no rows');
  return row.id;
}

/**
 * Upsert a concept record via ON CONFLICT DO UPDATE.
 * On conflict (workspace + name), keeps the longer description.
 */
async function upsertConcept(
  workspaceId: string,
  extracted: ExtractedConcept,
  language: 'en' | 'ko',
): Promise<string> {
  const [row] = await db
    .insert(concepts)
    .values({
      workspaceId,
      name: extracted.name,
      nameKo: language === 'ko' ? extracted.name : null,
      description: extracted.description,
    })
    .onConflictDoUpdate({
      target: [concepts.workspaceId, concepts.name],
      set: {
        description: sql`CASE WHEN COALESCE(length(excluded.description), 0) > COALESCE(length(${concepts.description}), 0) THEN excluded.description ELSE ${concepts.description} END`,
        updatedAt: sql`now()`,
      },
    })
    .returning({ id: concepts.id });

  if (!row) throw new Error('Concept upsert returned no rows');
  return row.id;
}

export async function processExtractEntitiesJob(job: Job): Promise<{ sourceId: string; extracted: boolean; entityCount?: number; conceptCount?: number; reason?: string }> {
    const { sourceId, workspaceId, classification } = job.data as {
      sourceId: string;
      workspaceId: string;
      classification: { section: string; contentType: string };
    };
    logger.info(
      { sourceId, workspaceId, jobId: job.id },
      'Extracting entities and concepts',
    );

    // 1. Fetch source from DB (workspace-scoped)
    const [source] = await db
      .select({
        id: sources.id,
        contentText: sources.contentText,
        title: sources.title,
      })
      .from(sources)
      .where(
        and(eq(sources.id, sourceId), eq(sources.workspaceId, workspaceId)),
      );

    if (!source) {
      logger.warn({ sourceId, workspaceId }, 'Source not found, skipping');
      return { sourceId, extracted: false, reason: 'source_not_found' };
    }

    const contentText = source.contentText;
    if (!contentText || contentText.trim().length === 0) {
      logger.warn({ sourceId }, 'Source has no content text, skipping');
      // Still enqueue page-create even without entity extraction
      await queues.aiPageCompile.add('page-create', {
        sourceIds: [sourceId],
        workspaceId,
        pageType: classification.section,
        extractedEntityIds: [],
        extractedConceptIds: [],
      });
      return { sourceId, extracted: false, reason: 'empty_content' };
    }

    // 2. Fetch existing entities as known context (limit to most recent)
    const knownEntities = await db
      .select({
        name: entities.name,
        entityType: entities.entityType,
        aliases: entities.aliases,
      })
      .from(entities)
      .where(eq(entities.workspaceId, workspaceId))
      .orderBy(desc(entities.updatedAt))
      .limit(MAX_KNOWN_ENTITIES);

    const knownEntitiesInput = knownEntities.map((e) => ({
      name: e.name,
      type: e.entityType,
      aliases: (e.aliases ?? []) as string[],
    }));

    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.id, workspaceId),
      columns: {
        defaultLanguage: true,
      },
    });

    // 3. Detect language and build prompt
    const detectedLang = detectLanguage(contentText);
    const language = resolveGenerationLanguage(
      detectedLang,
      workspace?.defaultLanguage ?? 'en',
    );

    const truncatedText =
      contentText.length > MAX_SOURCE_CHARS
        ? contentText.slice(0, MAX_SOURCE_CHARS)
        : contentText;

    const messages = extractEntitiesPrompt({
      sourceText: truncatedText,
      sourceTitle: source.title ?? undefined,
      language,
      knownEntities: knownEntitiesInput,
    });

    // 4. Call LLM
    const provider = getLLM();
    const response = await provider.complete(messages, {
      jsonMode: true,
      reasoningEffort: EXTRACT_ENTITIES_REASONING_EFFORT,
    });

    logger.info(
      {
        sourceId,
        model: response.model,
        inputTokens: response.tokenUsage.input,
        outputTokens: response.tokenUsage.output,
      },
      'LLM entity extraction complete',
    );

    // 5. Parse response
    let result: ExtractEntitiesResult;
    try {
      result = JSON.parse(response.content) as ExtractEntitiesResult;
    } catch (parseError: unknown) {
      logger.error(
        { sourceId, content: response.content },
        'Failed to parse LLM response as JSON',
      );
      throw new Error(
        `Extract entities LLM response is not valid JSON: ${
          parseError instanceof Error ? parseError.message : String(parseError)
        }`,
        { cause: parseError },
      );
    }

    if (!Array.isArray(result.entities) || !Array.isArray(result.concepts)) {
      logger.error(
        { sourceId, result },
        'LLM response missing required fields',
      );
      throw new Error(
        'Extract entities LLM response missing required fields (entities, concepts)',
      );
    }

    // 6. Upsert entities and concepts to DB (parallel within each group)
    const [entityIds, conceptIds] = await Promise.all([
      Promise.all(result.entities.map((entity) => upsertEntity(workspaceId, entity, language))),
      Promise.all(result.concepts.map((concept) => upsertConcept(workspaceId, concept, language))),
    ]);

    logger.info(
      {
        sourceId,
        entityCount: entityIds.length,
        conceptCount: conceptIds.length,
      },
      'Entities and concepts upserted',
    );

    // 7. Append activity event + enqueue page-create (independent, run in parallel)
    await Promise.all([
      db.insert(activityEvents).values({
        workspaceId,
        eventType: 'ingest',
        actorType: 'ai',
        actorId: response.model,
        targetType: 'source',
        targetId: sourceId,
        detail: {
          step: 'extract_entities',
          promptVersion: EXTRACT_ENTITIES_PROMPT_VERSION,
          model: response.model,
          tokenUsage: {
            input: response.tokenUsage.input,
            output: response.tokenUsage.output,
          },
          entityCount: result.entities.length,
          conceptCount: result.concepts.length,
          entityNames: result.entities.map((e) => e.name),
          conceptNames: result.concepts.map((c) => c.name),
        },
      }),
      queues.aiPageCompile.add('page-create', {
        sourceIds: [sourceId],
        workspaceId,
        pageType: classification.section,
        extractedEntityIds: entityIds,
        extractedConceptIds: conceptIds,
      }),
    ]);

    logger.info(
      { sourceId, workspaceId },
      'Enqueued page-create job with entity context',
    );

    return {
      sourceId,
      extracted: true,
      entityCount: entityIds.length,
      conceptCount: conceptIds.length,
    };
}
