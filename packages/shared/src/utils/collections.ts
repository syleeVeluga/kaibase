import type { CollectionType, PageType } from '../types/index.js';

const DEFAULT_COLLECTION_BY_PAGE_TYPE: Record<PageType, CollectionType> = {
  project: 'project',
  entity: 'entities',
  concept: 'concepts',
  brief: 'briefs',
  answer: 'briefs',
  summary: 'inbox',
  comparison: 'inbox',
  custom: 'inbox',
};

export function getDefaultCollectionTypeForPageType(pageType: PageType): CollectionType {
  return DEFAULT_COLLECTION_BY_PAGE_TYPE[pageType] ?? 'inbox';
}
