export type PageType =
  | 'project'
  | 'entity'
  | 'concept'
  | 'brief'
  | 'answer'
  | 'summary'
  | 'comparison'
  | 'custom';

export type PageStatus = 'draft' | 'published' | 'archived' | 'review_pending';

export type PageCreator = 'ai' | 'user';

export type ContentLanguage = 'en' | 'ko' | 'mixed';

export interface CanonicalPage {
  id: string;
  workspaceId: string;
  pageType: PageType;
  title: string;
  titleKo: string | null;
  slug: string;
  contentSnapshot: string;
  ydocId: string | null;
  status: PageStatus;
  createdBy: PageCreator;
  createdByUserId: string | null;
  parentPageId: string | null;
  collectionId: string | null;
  templateId: string | null;
  compilationTraceId: string | null;
  language: ContentLanguage;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
}

export type CollectionType =
  | 'inbox'
  | 'project'
  | 'entities'
  | 'concepts'
  | 'briefs'
  | 'review_queue'
  | 'knowledge_index'
  | 'activity_log'
  | 'custom';

export interface Collection {
  id: string;
  workspaceId: string;
  name: string;
  nameKo: string | null;
  collectionType: CollectionType;
  description: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}
