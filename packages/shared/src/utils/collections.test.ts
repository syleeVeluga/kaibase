import { describe, expect, it } from 'vitest';
import { getDefaultCollectionTypeForPageType } from './collections.js';

describe('getDefaultCollectionTypeForPageType', () => {
  it('maps domain page types to their default collections', () => {
    expect(getDefaultCollectionTypeForPageType('project')).toBe('project');
    expect(getDefaultCollectionTypeForPageType('entity')).toBe('entities');
    expect(getDefaultCollectionTypeForPageType('concept')).toBe('concepts');
    expect(getDefaultCollectionTypeForPageType('brief')).toBe('briefs');
    expect(getDefaultCollectionTypeForPageType('answer')).toBe('briefs');
  });

  it('falls back to inbox for general-purpose page types', () => {
    expect(getDefaultCollectionTypeForPageType('summary')).toBe('inbox');
    expect(getDefaultCollectionTypeForPageType('comparison')).toBe('inbox');
    expect(getDefaultCollectionTypeForPageType('custom')).toBe('inbox');
  });
});
