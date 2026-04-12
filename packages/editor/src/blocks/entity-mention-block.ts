/**
 * lwc:entity-mention — Auto-linked entity reference with resolution.
 *
 * Represents a mention of a named entity (person, organization, product,
 * technology) within page content. When rendered, it resolves to the
 * corresponding entity page and provides navigation + hover preview.
 *
 * This is a NEW file under our own license. It does NOT modify
 * any BlockSuite source files (MPL 2.0 safe).
 *
 * Phase 0a: Schema definition only. Full rendering will be
 * implemented with the frontend.
 */

/**
 * Properties for the lwc:entity-mention block.
 *
 * @property entityId   - UUID referencing the entity record
 * @property entityName - Display name of the entity
 * @property entityType - Entity classification (person, org, product, technology, etc.)
 */
export interface EntityMentionBlockProps {
  entityId: string;
  entityName: string;
  entityType: string;
}

/**
 * Default property values for a new entity mention block.
 */
export const entityMentionBlockDefaultProps: EntityMentionBlockProps = {
  entityId: '',
  entityName: '',
  entityType: '',
};

/**
 * Block flavour identifier for the entity mention block.
 */
export const ENTITY_MENTION_BLOCK_FLAVOUR = 'lwc:entity-mention' as const;

/**
 * Entity mention block schema definition.
 *
 * TODO: Once BlockSuite 0.19.5 is installed, replace with defineBlockSchema()
 * if the API requires it. See citation-block.ts for the pattern.
 */
export const EntityMentionBlockSchema = {
  flavour: ENTITY_MENTION_BLOCK_FLAVOUR,
  props: (): EntityMentionBlockProps => ({ ...entityMentionBlockDefaultProps }),
  metadata: {
    version: 1,
    role: 'content' as const,
    /** Entity mentions appear inside note blocks */
    parent: ['affine:note'],
  },
};
