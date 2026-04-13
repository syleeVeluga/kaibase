import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import {
  aiPromptFunctionIdSchema,
  upsertAiPromptConfigSchema,
  generateId,
} from '@kaibase/shared';
import type { AiPromptFunctionId, AiPromptConfigMerged } from '@kaibase/shared';
import { getPromptFunctionDefaults, resolvePromptConfig } from '@kaibase/ai';
import { authMiddleware } from '../middleware/auth.js';
import { workspaceMiddleware } from '../middleware/workspace.js';
import { AppError } from '../middleware/error-handler.js';
import { db } from '@kaibase/db/client';
import { aiPromptConfigs } from '@kaibase/db/schema';
import { eq, and } from 'drizzle-orm';
import type { AppEnv } from '../types.js';

export const aiConfigRoutes = new Hono<AppEnv>();

aiConfigRoutes.use('*', authMiddleware());
aiConfigRoutes.use('*', workspaceMiddleware());

const ALL_FUNCTION_IDS: AiPromptFunctionId[] = aiPromptFunctionIdSchema.options;

/**
 * GET / — List all 5 function configs (DB overrides merged with defaults).
 */
aiConfigRoutes.get('/', async (c) => {
  const workspaceId = c.get('workspaceId');

  const rows = await db
    .select()
    .from(aiPromptConfigs)
    .where(eq(aiPromptConfigs.workspaceId, workspaceId));

  const rowMap = new Map(rows.map((r) => [r.functionId, r]));

  const configs: AiPromptConfigMerged[] = ALL_FUNCTION_IDS.map((functionId) => {
    const dbRow = rowMap.get(functionId) ?? null;
    const resolved = resolvePromptConfig(functionId, dbRow);

    return {
      functionId,
      model: resolved.model,
      temperature: resolved.temperature ?? null,
      reasoningEffort: resolved.reasoningEffort,
      systemPromptOverride: resolved.systemPromptOverride,
      userPromptOverride: resolved.userPromptOverride,
      isActive: dbRow?.isActive ?? true,
      hasOverride: dbRow !== null,
      updatedAt: dbRow?.updatedAt?.toISOString() ?? null,
      updatedBy: dbRow?.updatedBy ?? null,
    };
  });

  return c.json({ configs });
});

/**
 * GET /defaults — Return code-level defaults (for Reset UI).
 */
aiConfigRoutes.get('/defaults', async (c) => {
  const defaults = getPromptFunctionDefaults();
  return c.json({ defaults });
});

/**
 * GET /:functionId — Single function config (merged).
 */
aiConfigRoutes.get('/:functionId', async (c) => {
  const functionId = c.req.param('functionId');
  const parseResult = aiPromptFunctionIdSchema.safeParse(functionId);
  if (!parseResult.success) {
    throw new AppError(400, 'INVALID_FUNCTION_ID', 'errors.invalidInput');
  }

  const workspaceId = c.get('workspaceId');
  const validFunctionId = parseResult.data;

  const rows = await db
    .select()
    .from(aiPromptConfigs)
    .where(
      and(
        eq(aiPromptConfigs.workspaceId, workspaceId),
        eq(aiPromptConfigs.functionId, validFunctionId),
      ),
    )
    .limit(1);

  const dbRow = rows[0] ?? null;
  const resolved = resolvePromptConfig(validFunctionId, dbRow);

  const config: AiPromptConfigMerged = {
    functionId: validFunctionId,
    model: resolved.model,
    temperature: resolved.temperature ?? null,
    reasoningEffort: resolved.reasoningEffort,
    systemPromptOverride: resolved.systemPromptOverride,
    userPromptOverride: resolved.userPromptOverride,
    isActive: dbRow?.isActive ?? true,
    hasOverride: dbRow !== null,
    updatedAt: dbRow?.updatedAt?.toISOString() ?? null,
    updatedBy: dbRow?.updatedBy ?? null,
  };

  return c.json(config);
});

/**
 * PUT /:functionId — Upsert config override for a function.
 */
aiConfigRoutes.put(
  '/:functionId',
  zValidator('json', upsertAiPromptConfigSchema),
  async (c) => {
    const functionId = c.req.param('functionId');
    const parseResult = aiPromptFunctionIdSchema.safeParse(functionId);
    if (!parseResult.success) {
      throw new AppError(400, 'INVALID_FUNCTION_ID', 'errors.invalidInput');
    }

    const workspaceId = c.get('workspaceId');
    const user = c.get('user');
    const input = c.req.valid('json');
    const validFunctionId = parseResult.data;

    const [dbRow] = await db
      .insert(aiPromptConfigs)
      .values({
        id: generateId(),
        workspaceId,
        functionId: validFunctionId,
        model: input.model ?? null,
        temperature: input.temperature ?? null,
        reasoningEffort: input.reasoningEffort ?? null,
        systemPromptOverride: input.systemPromptOverride ?? null,
        userPromptOverride: input.userPromptOverride ?? null,
        isActive: input.isActive ?? true,
        updatedBy: user.userId,
      })
      .onConflictDoUpdate({
        target: [aiPromptConfigs.workspaceId, aiPromptConfigs.functionId],
        set: {
          ...(input.model !== undefined && { model: input.model }),
          ...(input.temperature !== undefined && { temperature: input.temperature }),
          ...(input.reasoningEffort !== undefined && { reasoningEffort: input.reasoningEffort }),
          ...(input.systemPromptOverride !== undefined && { systemPromptOverride: input.systemPromptOverride }),
          ...(input.userPromptOverride !== undefined && { userPromptOverride: input.userPromptOverride }),
          ...(input.isActive !== undefined && { isActive: input.isActive }),
          updatedAt: new Date(),
          updatedBy: user.userId,
        },
      })
      .returning();

    if (!dbRow) {
      throw new AppError(500, 'UPSERT_FAILED', 'errors.internal');
    }
    const resolved = resolvePromptConfig(validFunctionId, dbRow);

    return c.json({
      functionId: validFunctionId,
      model: resolved.model,
      temperature: resolved.temperature ?? null,
      reasoningEffort: resolved.reasoningEffort,
      systemPromptOverride: resolved.systemPromptOverride,
      userPromptOverride: resolved.userPromptOverride,
      isActive: dbRow.isActive,
      hasOverride: true,
      updatedAt: dbRow.updatedAt.toISOString(),
      updatedBy: dbRow.updatedBy,
    });
  },
);

/**
 * DELETE /:functionId — Reset to defaults (delete override row).
 */
aiConfigRoutes.delete('/:functionId', async (c) => {
  const functionId = c.req.param('functionId');
  const parseResult = aiPromptFunctionIdSchema.safeParse(functionId);
  if (!parseResult.success) {
    throw new AppError(400, 'INVALID_FUNCTION_ID', 'errors.invalidInput');
  }

  const workspaceId = c.get('workspaceId');
  const validFunctionId = parseResult.data;

  const deleted = await db
    .delete(aiPromptConfigs)
    .where(
      and(
        eq(aiPromptConfigs.workspaceId, workspaceId),
        eq(aiPromptConfigs.functionId, validFunctionId),
      ),
    )
    .returning({ id: aiPromptConfigs.id });

  if (deleted.length === 0) {
    throw new AppError(404, 'NOT_FOUND', 'errors.notFound');
  }

  return c.json({ deleted: true });
});
