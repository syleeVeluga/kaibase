import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware } from '../middleware/auth.js';
import { workspaceMiddleware } from '../middleware/workspace.js';
import { AppError } from '../middleware/error-handler.js';
import { db } from '@kaibase/db/client';
import { policyPacks, activityEvents } from '@kaibase/db/schema';
import { eq, and, desc, lt } from 'drizzle-orm';
import { PolicyEngine } from '@kaibase/policy';
import {
  updatePolicyPackSchema,
  evaluatePolicySchema,
  generateId,
} from '@kaibase/shared';
import type { PolicyPack } from '@kaibase/shared';
import type { AppEnv } from '../types.js';

export const policyRoutes = new Hono<AppEnv>();

policyRoutes.use('*', authMiddleware());
policyRoutes.use('*', workspaceMiddleware());

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getActivePack(workspaceId: string): Promise<typeof policyPacks.$inferSelect> {
  const [row] = await db
    .select()
    .from(policyPacks)
    .where(and(eq(policyPacks.workspaceId, workspaceId), eq(policyPacks.isActive, true)))
    .limit(1);
  if (!row) throw new AppError(404, 'POLICY_NOT_FOUND', 'errors.policyNotFound');
  return row;
}

function toPolicyPack(row: typeof policyPacks.$inferSelect): PolicyPack {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    name: row.name,
    version: row.version,
    isActive: row.isActive,
    defaultOutcome: row.defaultOutcome as PolicyPack['defaultOutcome'],
    rules: row.rules as PolicyPack['rules'],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    createdBy: row.createdBy,
  };
}

// ---------------------------------------------------------------------------
// GET / — get the active policy pack for this workspace
// ---------------------------------------------------------------------------

policyRoutes.get('/', async (c) => {
  const activePack = await getActivePack(c.get('workspaceId'));
  return c.json(activePack);
});

// ---------------------------------------------------------------------------
// PUT / — update policy pack (creates new version, deactivates old)
// ---------------------------------------------------------------------------

policyRoutes.put('/', zValidator('json', updatePolicyPackSchema), async (c) => {
  const workspaceId = c.get('workspaceId');
  const user = c.get('user');
  const input = c.req.valid('json');

  const currentPack = await getActivePack(workspaceId);

  const newId = generateId();
  const newVersion = currentPack.version + 1;

  const newPack = await db.transaction(async (tx) => {
    // Deactivate current pack
    await tx
      .update(policyPacks)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(policyPacks.id, currentPack.id));

    // Insert new version
    const [inserted] = await tx.insert(policyPacks).values({
      id: newId,
      workspaceId,
      name: input.name ?? currentPack.name,
      version: newVersion,
      isActive: true,
      rules: input.rules ?? currentPack.rules,
      defaultOutcome: input.defaultOutcome ?? currentPack.defaultOutcome,
      createdBy: user.userId,
    }).returning();

    // Log activity event
    await tx.insert(activityEvents).values({
      workspaceId,
      eventType: 'policy_update',
      actorType: 'user',
      actorId: user.userId,
      targetType: 'policy_pack',
      targetId: newId,
      detail: {
        previousVersion: currentPack.version,
        newVersion,
        previousPackId: currentPack.id,
      },
    });

    return inserted;
  });

  return c.json(newPack);
});

// ---------------------------------------------------------------------------
// GET /versions — list all policy pack versions for this workspace
// ---------------------------------------------------------------------------

policyRoutes.get('/versions', async (c) => {
  const workspaceId = c.get('workspaceId');
  const limit = Math.min(parseInt(c.req.query('limit') ?? '50', 10) || 50, 100);
  const cursor = c.req.query('cursor');

  const conditions = [eq(policyPacks.workspaceId, workspaceId)];
  if (cursor) {
    const cursorVersion = parseInt(cursor, 10);
    if (!isNaN(cursorVersion)) {
      conditions.push(lt(policyPacks.version, cursorVersion));
    }
  }

  const versions = await db
    .select()
    .from(policyPacks)
    .where(and(...conditions))
    .orderBy(desc(policyPacks.version))
    .limit(limit + 1);

  const hasMore = versions.length > limit;
  if (hasMore) versions.pop();

  const lastVersion = versions[versions.length - 1];
  const nextCursor = hasMore && lastVersion ? String(lastVersion.version) : null;

  return c.json({ versions, nextCursor });
});

// ---------------------------------------------------------------------------
// GET /versions/:v — get a specific policy pack version
// ---------------------------------------------------------------------------

policyRoutes.get('/versions/:v', async (c) => {
  const workspaceId = c.get('workspaceId');
  const version = parseInt(c.req.param('v'), 10);

  if (isNaN(version)) {
    throw new AppError(400, 'INVALID_VERSION', 'errors.invalidInput');
  }

  const [pack] = await db
    .select()
    .from(policyPacks)
    .where(
      and(
        eq(policyPacks.workspaceId, workspaceId),
        eq(policyPacks.version, version),
      ),
    )
    .limit(1);

  if (!pack) {
    throw new AppError(404, 'POLICY_VERSION_NOT_FOUND', 'errors.policyVersionNotFound');
  }

  return c.json(pack);
});

// ---------------------------------------------------------------------------
// POST /evaluate — dry-run policy evaluation (no side effects)
// ---------------------------------------------------------------------------

policyRoutes.post('/evaluate', zValidator('json', evaluatePolicySchema), async (c) => {
  const { context } = c.req.valid('json');

  const activePack = await getActivePack(c.get('workspaceId'));
  const engine = new PolicyEngine(toPolicyPack(activePack));
  const result = engine.evaluate(context);

  return c.json(result);
});
