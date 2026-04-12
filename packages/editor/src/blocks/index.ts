/**
 * Custom lwc:* block definitions for Kaibase.
 *
 * All custom blocks are defined in separate NEW files (not modifications
 * to BlockSuite source). They use the `lwc:` namespace prefix to
 * distinguish them from BlockSuite's built-in `affine:*` blocks.
 *
 * These schemas are registered alongside AffineSchemas in setup.ts.
 */

// --- Citation block ---
export {
  CitationBlockSchema,
  CITATION_BLOCK_FLAVOUR,
  citationBlockDefaultProps,
} from './citation-block.js';
export type { CitationBlockProps } from './citation-block.js';

// --- Entity mention block ---
export {
  EntityMentionBlockSchema,
  ENTITY_MENTION_BLOCK_FLAVOUR,
  entityMentionBlockDefaultProps,
} from './entity-mention-block.js';
export type { EntityMentionBlockProps } from './entity-mention-block.js';

// --- Review status block ---
export {
  ReviewStatusBlockSchema,
  REVIEW_STATUS_BLOCK_FLAVOUR,
  reviewStatusBlockDefaultProps,
} from './review-status-block.js';
export type {
  ReviewStatusBlockProps,
  ReviewStatus,
} from './review-status-block.js';

// --- Source panel block ---
export {
  SourcePanelBlockSchema,
  SOURCE_PANEL_BLOCK_FLAVOUR,
  sourcePanelBlockDefaultProps,
} from './source-panel-block.js';
export type { SourcePanelBlockProps } from './source-panel-block.js';

/**
 * All custom block schemas as an array, ready for Schema.register().
 *
 * Usage in setup.ts:
 * ```ts
 * import { lwcBlockSchemas } from './blocks/index.js';
 * schema.register(AffineSchemas).register(lwcBlockSchemas);
 * ```
 *
 * TODO: The array element type depends on BlockSuite 0.19.5's
 * Schema.register() signature. Adjust if it expects a different shape.
 */
import { CitationBlockSchema } from './citation-block.js';
import { EntityMentionBlockSchema } from './entity-mention-block.js';
import { ReviewStatusBlockSchema } from './review-status-block.js';
import { SourcePanelBlockSchema } from './source-panel-block.js';

export const lwcBlockSchemas = [
  CitationBlockSchema,
  EntityMentionBlockSchema,
  ReviewStatusBlockSchema,
  SourcePanelBlockSchema,
] as const;
