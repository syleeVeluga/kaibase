/**
 * lwc:source-panel — Embedded source evidence panel.
 *
 * Renders an expandable panel showing source evidence for a section
 * of the page. Unlike the inline lwc:citation, the source panel is
 * a standalone block that shows a richer preview of the source
 * material including title, excerpt, and link to the Source Vault.
 *
 * This is a NEW file under our own license. It does NOT modify
 * any BlockSuite source files (MPL 2.0 safe).
 *
 * Phase 0a: Schema definition only. Full rendering will be
 * implemented with the frontend.
 */

/**
 * Properties for the lwc:source-panel block.
 *
 * @property sourceId - UUID referencing the source in the Source Vault
 * @property title    - Display title of the source document
 * @property excerpt  - Relevant excerpt from the source material
 */
export interface SourcePanelBlockProps {
  sourceId: string;
  title: string;
  excerpt: string;
}

/**
 * Default property values for a new source panel block.
 */
export const sourcePanelBlockDefaultProps: SourcePanelBlockProps = {
  sourceId: '',
  title: '',
  excerpt: '',
};

/**
 * Block flavour identifier for the source panel block.
 */
export const SOURCE_PANEL_BLOCK_FLAVOUR = 'lwc:source-panel' as const;

/**
 * Source panel block schema definition.
 *
 * TODO: Once BlockSuite 0.19.5 is installed, replace with defineBlockSchema()
 * if the API requires it. See citation-block.ts for the pattern.
 */
export const SourcePanelBlockSchema = {
  flavour: SOURCE_PANEL_BLOCK_FLAVOUR,
  props: (): SourcePanelBlockProps => ({ ...sourcePanelBlockDefaultProps }),
  metadata: {
    version: 1,
    role: 'content' as const,
    /** Source panels appear inside note blocks */
    parent: ['affine:note'],
  },
};
