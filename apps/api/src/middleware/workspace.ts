import type { MiddlewareHandler } from 'hono';
import { AppError } from './error-handler.js';
import { db } from '@kaibase/db/client';
import { workspaceMembers } from '@kaibase/db/schema';
import { and, eq } from 'drizzle-orm';
import type { AppEnv } from '../types.js';

export function workspaceMiddleware(): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const workspaceId = c.req.param('wid');
    if (!workspaceId) {
      throw new AppError(400, 'MISSING_WORKSPACE', 'errors.missingWorkspace');
    }

    const user = c.get('user');
    const membership = await db
      .select({ role: workspaceMembers.role })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, user.userId),
        ),
      )
      .limit(1);

    if (membership.length === 0) {
      throw new AppError(403, 'NOT_MEMBER', 'errors.notWorkspaceMember');
    }

    c.set('workspaceId', workspaceId);
    await next();
  };
}
