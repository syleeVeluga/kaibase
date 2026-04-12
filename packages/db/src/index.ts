// Re-export the database client
export { db, sql, createClient } from './client.js';
export type { Db } from './client.js';

// Re-export all schema tables, enums, and types
export * from './schema/index.js';
