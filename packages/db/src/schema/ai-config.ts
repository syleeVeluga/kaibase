import {
  pgTable,
  uuid,
  varchar,
  text,
  real,
  boolean,
  timestamp,
  unique,
  index,
} from 'drizzle-orm/pg-core';
import { workspaces } from './workspace.js';

export const aiPromptConfigs = pgTable(
  'ai_prompt_configs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    functionId: varchar('function_id', { length: 50 }).notNull(),
    model: varchar('model', { length: 100 }),
    temperature: real('temperature'),
    reasoningEffort: varchar('reasoning_effort', { length: 20 }),
    systemPromptOverride: text('system_prompt_override'),
    userPromptOverride: text('user_prompt_override'),
    isActive: boolean('is_active').notNull().default(true),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    updatedBy: uuid('updated_by').notNull(),
  },
  (table) => [
    unique('ai_prompt_configs_workspace_function').on(
      table.workspaceId,
      table.functionId,
    ),
    index('ai_prompt_configs_workspace_idx').on(table.workspaceId),
  ],
);

export type AiPromptConfigRow = typeof aiPromptConfigs.$inferSelect;
export type NewAiPromptConfigRow = typeof aiPromptConfigs.$inferInsert;
