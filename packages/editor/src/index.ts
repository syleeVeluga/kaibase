/**
 * @kaibase/editor — BlockSuite integration package for Kaibase.
 *
 * Provides:
 * - BlockSuite editor setup (Schema + DocCollection + PageEditor/EdgelessEditor)
 * - Custom lwc:* block schemas (citation, entity-mention, review-status, source-panel)
 * - Y.Doc WebSocket sync provider (Yjs MIT, custom implementation)
 *
 * License: All files in this package are proprietary Kaibase code.
 * BlockSuite packages (@blocksuite/*) are MPL 2.0 dependencies used
 * without modification. Yjs is MIT licensed.
 */

// --- Setup: BlockSuite initialization ---
export {
  createSchema,
  createDocCollection,
  createEditor,
} from './setup.js';
export type {
  CreateDocCollectionOptions,
  CreateEditorOptions,
} from './setup.js';

// --- Custom blocks (lwc:* namespace) ---
export {
  lwcBlockSchemas,
  CitationBlockSchema,
  CITATION_BLOCK_FLAVOUR,
  citationBlockDefaultProps,
  EntityMentionBlockSchema,
  ENTITY_MENTION_BLOCK_FLAVOUR,
  entityMentionBlockDefaultProps,
  ReviewStatusBlockSchema,
  REVIEW_STATUS_BLOCK_FLAVOUR,
  reviewStatusBlockDefaultProps,
  SourcePanelBlockSchema,
  SOURCE_PANEL_BLOCK_FLAVOUR,
  sourcePanelBlockDefaultProps,
} from './blocks/index.js';

export type {
  CitationBlockProps,
  EntityMentionBlockProps,
  ReviewStatusBlockProps,
  ReviewStatus,
  SourcePanelBlockProps,
} from './blocks/index.js';

// --- Sync: Y.Doc WebSocket provider ---
export {
  SyncProvider,
  createSyncProvider,
} from './sync.js';
export type {
  SyncConnectionState,
  ConnectionStateListener,
  SyncProviderOptions,
} from './sync.js';
