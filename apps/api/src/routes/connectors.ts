import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createConnectorSchema, generateId } from '@kaibase/shared';
import { authMiddleware } from '../middleware/auth.js';
import { workspaceMiddleware } from '../middleware/workspace.js';
import { AppError } from '../middleware/error-handler.js';
import { db } from '@kaibase/db/client';
import { sourceConnectors } from '@kaibase/db/schema';
import { eq, and } from 'drizzle-orm';
import type { AppEnv } from '../types.js';

export const connectorRoutes = new Hono<AppEnv>();

connectorRoutes.use('*', authMiddleware());
connectorRoutes.use('*', workspaceMiddleware());

connectorRoutes.get('/', async (c) => {
  const workspaceId = c.get('workspaceId');

  const result = await db
    .select()
    .from(sourceConnectors)
    .where(eq(sourceConnectors.workspaceId, workspaceId));

  return c.json({ connectors: result });
});

connectorRoutes.post('/', zValidator('json', createConnectorSchema), async (c) => {
  const workspaceId = c.get('workspaceId');
  const user = c.get('user');
  const input = c.req.valid('json');

  const id = generateId();

  await db.insert(sourceConnectors).values({
    id,
    workspaceId,
    connectorType: input.connectorType,
    name: input.name,
    config: input.config,
    syncStatus: 'active',
    createdBy: user.userId,
  });

  return c.json({ id }, 201);
});

connectorRoutes.delete('/:id', async (c) => {
  const workspaceId = c.get('workspaceId');
  const id = c.req.param('id');

  const deleted = await db
    .delete(sourceConnectors)
    .where(and(eq(sourceConnectors.id, id), eq(sourceConnectors.workspaceId, workspaceId)))
    .returning();

  if (deleted.length === 0) {
    throw new AppError(404, 'NOT_FOUND', 'errors.notFound');
  }

  return c.json({ deleted: true });
});
