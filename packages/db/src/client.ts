import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';

const DEFAULT_DATABASE_URL = 'postgresql://lwc:lwc_dev@localhost:5432/kaibase';

/**
 * Create a new Drizzle client for the given connection URL.
 * Caller is responsible for closing the underlying connection when done.
 */
export function createClient(connectionUrl?: string) {
  const url = connectionUrl ?? process.env['DATABASE_URL'] ?? DEFAULT_DATABASE_URL;
  const sql = postgres(url, {
    max: 10,
    idle_timeout: 30,
    connect_timeout: 10,
  });
  const db = drizzle(sql, { schema });
  return { db, sql };
}

// Singleton client for long-running server processes
const { db, sql } = createClient();

export { db, sql };
export type Db = typeof db;
