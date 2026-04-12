/**
 * lwc:citation — Inline source reference with hover preview.
 *
 * Links a page block to a specific source in the Source Vault.
 * Renders as an inline citation marker that shows a hover preview
 * of the cited source excerpt.
 *
 * This is a NEW file under our own license. It does NOT modify
 * any BlockSuite source files (MPL 2.0 safe).
 *
 * Phase 0a: Schema definition only. Full rendering (BlockSuite
 * BlockView / lit component) will be implemented with the frontend.
 */

// TODO: Validate these imports against BlockSuite 0.19.5 actual API surface.
// The SchemaToModel / defineBlockSchema API may differ from what is documented.
// If BlockSuite 0.19.5 uses a different block definition pattern, adapt accordingly.

/**
 * Properties for the lwc:citation block.
 *
 * @property sourceId   - UUID referencing the source in the Source Vault
 * @property excerpt    - Quoted text excerpt from the source
 * @property confidence - AI confidence score for this citation (0.0 to 1.0)
 */
export interface CitationBlockProps {
  sourceId: string;
  excerpt: string;
  confidence: number;
}

/**
 * Default property values for a new citation block.
 */
export const citationBlockDefaultProps: CitationBlockProps = {
  sourceId: '',
  excerpt: '',
  confidence: 0,
};

/**
 * Block flavour identifier for the citation block.
 * All custom Kaibase blocks use the `lwc:` namespace prefix.
 */
export const CITATION_BLOCK_FLAVOUR = 'lwc:citation' as const;

/**
 * Citation block schema definition.
 *
 * This object is structured so it can be passed to BlockSuite's
 * Schema.register() alongside AffineSchemas. The exact registration
 * API depends on BlockSuite 0.19.5's defineBlockSchema or equivalent.
 *
 * TODO: Once BlockSuite 0.19.5 is installed, replace this plain object
 * with the actual defineBlockSchema() call if the API requires it:
 *
 * ```ts
 * import { defineBlockSchema } from '@blocksuite/store';
 *
 * export const CitationBlockSchema = defineBlockSchema({
 *   flavour: 'lwc:citation',
 *   props: () => citationBlockDefaultProps,
 *   metadata: {
 *     version: 1,
 *     role: 'content',
 *     parent: ['affine:note'],
 *   },
 * });
 * ```
 */
export const CitationBlockSchema = {
  flavour: CITATION_BLOCK_FLAVOUR,
  props: (): CitationBlockProps => ({ ...citationBlockDefaultProps }),
  metadata: {
    version: 1,
    role: 'content' as const,
    /** Citation blocks can appear inside note blocks */
    parent: ['affine:note'],
  },
};
