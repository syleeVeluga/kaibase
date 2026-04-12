import { eq, and } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';
import { db } from '@kaibase/db/client';
import { AppError } from './middleware/error-handler.js';

type TableWithTenant = {
  id: PgColumn<any, any, any>;
  workspaceId: PgColumn<any, any, any>;
  [key: string]: any;
};

/**
 * Fetch a single row by id + workspaceId, or throw 404.
 */
export async function findOne<T extends TableWithTenant>(
  table: T,
  id: string,
  workspaceId: string,
) {
  const rows = await db
    .select()
    .from(table as any)
    .where(and(eq(table.id, id), eq(table.workspaceId, workspaceId)))
    .limit(1);

  if (rows.length === 0) {
    throw new AppError(404, 'NOT_FOUND', 'errors.notFound');
  }

  return rows[0];
}

/**
 * Update a single row by id + workspaceId with the given values, or throw 404.
 * Automatically sets `updatedAt` to now.
 */
export async function updateOne<T extends TableWithTenant>(
  table: T,
  id: string,
  workspaceId: string,
  values: Record<string, unknown>,
) {
  const updated = await db
    .update(table as any)
    .set({ ...values, updatedAt: new Date() } as any)
    .where(and(eq(table.id, id), eq(table.workspaceId, workspaceId)))
    .returning();

  if (updated.length === 0) {
    throw new AppError(404, 'NOT_FOUND', 'errors.notFound');
  }

  return updated[0];
}
