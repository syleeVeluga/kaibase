import { logger } from '../logger.js';

const PG_UNIQUE_VIOLATION = '23505';
const PG_FOREIGN_KEY_VIOLATION = '23503';

export interface DbErrorResult {
  status: number;
  code: string;
  message: string;
}

interface PgError {
  code: string;
  constraint_name?: string;
  detail?: string;
}

function extractPgError(err: unknown): PgError | null {
  // Drizzle wraps postgres.js errors in DrizzleQueryError with .cause
  const cause = (err as { cause?: unknown }).cause;
  if (cause && typeof cause === 'object' && 'code' in cause) {
    return cause as PgError;
  }
  // Direct postgres.js error (outside Drizzle)
  if (err && typeof err === 'object' && 'code' in err) {
    return err as PgError;
  }
  return null;
}

const CONSTRAINT_MAP: Record<string, DbErrorResult> = {
  workspaces_slug_unique: { status: 409, code: 'SLUG_TAKEN', message: 'errors.slugTaken' },
  idx_source_content_hash: { status: 409, code: 'DUPLICATE_SOURCE', message: 'errors.duplicateSource' },
  uq_entity_workspace_name_type: { status: 409, code: 'DUPLICATE_ENTITY', message: 'errors.duplicate' },
  uq_concept_workspace_name: { status: 409, code: 'DUPLICATE_CONCEPT', message: 'errors.duplicate' },
  users_email_unique: { status: 409, code: 'EMAIL_EXISTS', message: 'errors.emailExists' },
};

export function isPgUniqueViolation(err: unknown): boolean {
  const pg = extractPgError(err);
  return pg?.code === PG_UNIQUE_VIOLATION;
}

/**
 * Maps a DB error to a structured result if it's a known PG error code.
 * Returns null for non-DB errors so the caller can fall through.
 */
export function mapDbError(err: unknown): DbErrorResult | null {
  const pg = extractPgError(err);
  if (!pg) return null;

  if (pg.code === PG_UNIQUE_VIOLATION) {
    const mapped = pg.constraint_name ? CONSTRAINT_MAP[pg.constraint_name] : undefined;
    if (mapped) return mapped;
    logger.warn({ constraint: pg.constraint_name, detail: pg.detail }, 'Unmapped unique constraint violation');
    return { status: 409, code: 'DUPLICATE', message: 'errors.duplicate' };
  }

  if (pg.code === PG_FOREIGN_KEY_VIOLATION) {
    logger.warn({ constraint: pg.constraint_name, detail: pg.detail }, 'Foreign key violation');
    return { status: 400, code: 'INVALID_REFERENCE', message: 'errors.invalidReference' };
  }

  return null;
}
