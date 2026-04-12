import {
  pgTable,
  pgEnum,
  uuid,
  boolean,
  jsonb,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { workspaces } from './workspace.js';

// Enums

export const channelTypeEnum = pgEnum('channel_type', [
  'email',
  'slack',
  'discord',
  'mcp',
  'webhook',
]);

export const channelDirectionEnum = pgEnum('channel_direction', [
  'inbound',
  'outbound',
  'bidirectional',
]);

// Table

export const channelEndpoints = pgTable(
  'channel_endpoints',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    channelType: channelTypeEnum('channel_type').notNull(),
    direction: channelDirectionEnum('direction').notNull(),
    // config holds encrypted credentials / webhook URLs
    config: jsonb('config').notNull().default({}),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_channel_workspace_type').on(t.workspaceId, t.channelType),
    index('idx_channel_active').on(t.workspaceId, t.isActive),
  ],
);

export type ChannelEndpoint = typeof channelEndpoints.$inferSelect;
export type NewChannelEndpoint = typeof channelEndpoints.$inferInsert;
