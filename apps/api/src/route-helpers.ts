import { eq, and, type Column } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import { db } from '@kaibase/db/client';
import { AppError } from './middleware/error-handler.js';

type TableWithTenant = PgTable & {
  id: Column;
  workspaceId: Column;
};

/**
 * Fetch a single row by id + workspaceId, or throw 404.
 */
export async function findOne<T extends TableWithTenant>(
  table: T,
  id: string,
  workspaceId: string,
): Promise<Record<string, unknown>> {
  const rows = await db
    .select()
    .from(table as PgTable)
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
): Promise<Record<string, unknown>> {
  const updated = await db
    .update(table as PgTable)
    .set({ ...values, updatedAt: new Date() } as never)
    .where(and(eq(table.id, id), eq(table.workspaceId, workspaceId)))
    .returning();

  if (updated.length === 0) {
    throw new AppError(404, 'NOT_FOUND', 'errors.notFound');
  }

  return updated[0];
}
