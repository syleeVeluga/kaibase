import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  integer,
  bigint,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { workspaces } from './workspace.js';
import { users } from './user.js';

// Enums

export const connectorTypeEnum = pgEnum('connector_type', [
  'local_folder',
  'google_drive',
  's3',
  'gcs',
  'dropbox',
  'onedrive',
]);

export const syncStatusEnum = pgEnum('sync_status', ['active', 'paused', 'error']);

export const sourceTypeEnum = pgEnum('source_type', [
  'file_upload',
  'url',
  'email',
  'slack_message',
  'discord_message',
  'mcp_input',
  'text_input',
  'connector',
]);

export const sourceStatusEnum = pgEnum('source_status', [
  'pending',
  'processing',
  'processed',
  'failed',
]);

// Tables

export const sourceConnectors = pgTable(
  'source_connectors',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    connectorType: connectorTypeEnum('connector_type').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    config: jsonb('config').notNull().default({}),
    syncStatus: syncStatusEnum('sync_status').notNull().default('active'),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
    fileCount: integer('file_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
  },
  (t) => [index('idx_source_connector_workspace').on(t.workspaceId)],
);

export const sources = pgTable(
  'sources',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    sourceType: sourceTypeEnum('source_type').notNull(),
    channel: varchar('channel', { length: 255 }).notNull(),
    connectorId: uuid('connector_id').references(() => sourceConnectors.id, {
      onDelete: 'set null',
    }),
    sourceUri: text('source_uri'),
    title: varchar('title', { length: 500 }),
    contentText: text('content_text'),
    contentHash: varchar('content_hash', { length: 64 }).notNull(),
    rawMetadata: jsonb('raw_metadata').notNull().default({}),
    ingestedAt: timestamp('ingested_at', { withTimezone: true }).notNull().defaultNow(),
    ingestedBy: uuid('ingested_by').references(() => users.id, { onDelete: 'set null' }),
    status: sourceStatusEnum('status').notNull().default('pending'),
    version: integer('version').notNull().default(1),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('idx_source_content_hash').on(t.workspaceId, t.contentHash),
    index('idx_source_workspace_status').on(t.workspaceId, t.status),
    index('idx_source_connector').on(t.connectorId),
  ],
);

export const sourceAttachments = pgTable(
  'source_attachments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => sources.id, { onDelete: 'cascade' }),
    filename: varchar('filename', { length: 500 }).notNull(),
    mimeType: varchar('mime_type', { length: 255 }).notNull(),
    // drizzle bigint returns string in JS for precision; use 'number' mode for bigint < 2^53
    sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
    storageKey: text('storage_key').notNull(),
    contentText: text('content_text'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_source_attachment_source').on(t.sourceId)],
);

export type SourceConnector = typeof sourceConnectors.$inferSelect;
export type NewSourceConnector = typeof sourceConnectors.$inferInsert;
export type Source = typeof sources.$inferSelect;
export type NewSource = typeof sources.$inferInsert;
export type SourceAttachment = typeof sourceAttachments.$inferSelect;
export type NewSourceAttachment = typeof sourceAttachments.$inferInsert;
