/**
 * BlockSuite initialization module for Kaibase.
 *
 * Creates a Schema with AffineSchemas (MPL 2.0, used as-is) registered
 * alongside our custom lwc:* blocks (proprietary, separate files).
 *
 * This is a NEW file under our own license. It does NOT modify
 * any BlockSuite source files (MPL 2.0 safe).
 *
 * Key imports:
 * - @blocksuite/store  (MPL 2.0) — Schema, DocCollection, Doc
 * - @blocksuite/blocks (MPL 2.0) — AffineSchemas
 * - @blocksuite/presets (MPL 2.0) — PageEditor, EdgelessEditor
 *
 * TODO: The BlockSuite 0.19.5 API surface needs validation once
 * dependencies are installed. The imports and constructor signatures
 * below are based on BlockSuite documentation and may need adjustment.
 * In particular:
 * - DocCollection constructor options may differ
 * - Schema.register() may expect defineBlockSchema() output, not plain objects
 * - PageEditor attachment API (editor.doc = doc vs editor.page = page) may vary
 */

// --- BlockSuite imports (MPL 2.0, unmodified) ---
// TODO: Uncomment these once @blocksuite packages are installed.
// If import paths differ in 0.19.5, adjust accordingly.
//
// import { Schema, DocCollection } from '@blocksuite/store';
// import type { Doc } from '@blocksuite/store';
// import { AffineSchemas } from '@blocksuite/blocks';
// import { PageEditor, EdgelessEditor } from '@blocksuite/presets';

// --- Custom block schemas (our code, proprietary) ---
import { lwcBlockSchemas } from './blocks/index.js';

/**
 * Options for creating a DocCollection (workspace-level document store).
 */
export interface CreateDocCollectionOptions {
  /** Unique identifier for this collection/workspace */
  id?: string;
}

/**
 * Options for creating an editor instance.
 */
export interface CreateEditorOptions {
  /** Editor mode: page (default) or edgeless (canvas/whiteboard) */
  mode?: 'page' | 'edgeless';
}

/**
 * Creates a BlockSuite Schema with standard AffineSchemas and
 * custom lwc:* blocks registered.
 *
 * @returns Configured Schema instance
 *
 * @example
 * ```ts
 * const schema = createSchema();
 * const collection = new DocCollection({ schema });
 * ```
 */
export function createSchema(): unknown {
  // TODO: Replace with actual BlockSuite API once installed:
  //
  // const schema = new Schema();
  // schema.register(AffineSchemas);      // Standard affine:* blocks (MPL 2.0)
  // schema.register(lwcBlockSchemas);     // Custom lwc:* blocks (proprietary)
  // return schema;

  // Placeholder: return schema descriptor for type-checking during Phase 0a
  return {
    _type: 'kaibase-schema' as const,
    standardBlocks: 'AffineSchemas',
    customBlocks: lwcBlockSchemas.map((s) => s.flavour),
  };
}

/**
 * Creates a BlockSuite DocCollection (workspace-level document store).
 *
 * A DocCollection is the top-level container that holds multiple Docs.
 * In Kaibase, each workspace maps to one DocCollection.
 *
 * @param options - Collection configuration
 * @returns Configured DocCollection instance
 *
 * @example
 * ```ts
 * const collection = createDocCollection({ id: 'workspace-123' });
 * const doc = collection.createDoc();
 * ```
 */
export function createDocCollection(
  options: CreateDocCollectionOptions = {},
): unknown {
  const schema = createSchema();

  // TODO: Replace with actual BlockSuite API once installed:
  //
  // const collection = new DocCollection({
  //   schema,
  //   id: options.id,
  // });
  // return collection;

  // Placeholder: return descriptor for type-checking during Phase 0a
  return {
    _type: 'kaibase-doc-collection' as const,
    schema,
    id: options.id ?? 'default',
    createDoc: () => {
      throw new Error(
        'DocCollection placeholder: install @blocksuite/store to use createDoc()',
      );
    },
  };
}

/**
 * Creates a BlockSuite editor attached to a given Doc.
 *
 * Returns either a PageEditor (structured document editing) or
 * EdgelessEditor (canvas/whiteboard mode) depending on options.
 *
 * @param doc     - The BlockSuite Doc to edit
 * @param options - Editor configuration
 * @returns HTMLElement (PageEditor or EdgelessEditor) ready for DOM attachment
 *
 * @example
 * ```ts
 * const collection = createDocCollection();
 * const doc = collection.createDoc();
 * const editor = createEditor(doc, { mode: 'page' });
 * document.getElementById('editor-root')?.appendChild(editor);
 * ```
 */
export function createEditor(
  _doc: unknown,
  options: CreateEditorOptions = {},
): HTMLElement {
  const mode = options.mode ?? 'page';

  // TODO: Replace with actual BlockSuite API once installed:
  //
  // if (mode === 'edgeless') {
  //   const editor = new EdgelessEditor();
  //   editor.doc = doc as Doc;
  //   return editor;
  // }
  //
  // const editor = new PageEditor();
  // editor.doc = doc as Doc;
  // return editor;

  // Placeholder: return a div with error message during Phase 0a
  const placeholder = document.createElement('div');
  placeholder.dataset['kaibaseEditor'] = mode;
  placeholder.textContent = `[Kaibase ${mode} editor placeholder — install @blocksuite/presets to activate]`;
  return placeholder;
}

/**
 * Re-export lwcBlockSchemas for consumers that need to inspect
 * registered custom blocks without importing from blocks/ directly.
 */
export { lwcBlockSchemas } from './blocks/index.js';
