import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  real,
  jsonb,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { workspaces } from './workspace.js';

// Enums

export const graphNodeTypeEnum = pgEnum('graph_node_type', [
  'page',
  'entity',
  'concept',
  'source',
]);

export const graphEdgeTypeEnum = pgEnum('graph_edge_type', [
  'cites',
  'mentions',
  'related_to',
  'parent_of',
  'derived_from',
  'contradicts',
]);

// Tables — graph is derived (read-only, computed async); never treat as source of truth

export const graphNodes = pgTable(
  'graph_nodes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    nodeType: graphNodeTypeEnum('node_type').notNull(),
    refId: uuid('ref_id').notNull(),
    label: varchar('label', { length: 500 }).notNull(),
    metadata: jsonb('metadata').notNull().default({}),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_graph_node_workspace').on(t.workspaceId, t.nodeType),
    index('idx_graph_node_ref').on(t.workspaceId, t.refId),
  ],
);

export const graphEdges = pgTable(
  'graph_edges',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    edgeType: graphEdgeTypeEnum('edge_type').notNull(),
    sourceNodeId: uuid('source_node_id')
      .notNull()
      .references(() => graphNodes.id, { onDelete: 'cascade' }),
    targetNodeId: uuid('target_node_id')
      .notNull()
      .references(() => graphNodes.id, { onDelete: 'cascade' }),
    weight: real('weight'),
    metadata: jsonb('metadata').notNull().default({}),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_graph_edge_source').on(t.sourceNodeId),
    index('idx_graph_edge_target').on(t.targetNodeId),
    index('idx_graph_edge_workspace_type').on(t.workspaceId, t.edgeType),
  ],
);

export type GraphNode = typeof graphNodes.$inferSelect;
export type NewGraphNode = typeof graphNodes.$inferInsert;
export type GraphEdge = typeof graphEdges.$inferSelect;
export type NewGraphEdge = typeof graphEdges.$inferInsert;
