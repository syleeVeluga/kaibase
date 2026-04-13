import { and, eq } from 'drizzle-orm';
import type { CollectionType, PageType } from '@kaibase/shared';
import { getDefaultCollectionTypeForPageType } from '@kaibase/shared';
import { db } from './client.js';
import { collections } from './schema/index.js';
import type { NewCollection } from './schema/index.js';

/** The 8 default collections every workspace must have, in display order. */
export const DEFAULT_COLLECTIONS: Omit<NewCollection, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>[] = [
  { name: 'Inbox', nameKo: '받은편지함', collectionType: 'inbox', description: 'Newly ingested items awaiting processing', sortOrder: 0 },
  { name: 'Projects', nameKo: '프로젝트', collectionType: 'project', description: 'Project-scoped knowledge pages', sortOrder: 1 },
  { name: 'Entities', nameKo: '엔티티', collectionType: 'entities', description: 'Entity pages (people, organisations, products)', sortOrder: 2 },
  { name: 'Concepts', nameKo: '개념', collectionType: 'concepts', description: 'Concept and topic pages', sortOrder: 3 },
  { name: 'Briefs', nameKo: '브리프', collectionType: 'briefs', description: 'AI-generated briefs and answer pages', sortOrder: 4 },
  { name: 'Review Queue', nameKo: '검토 대기열', collectionType: 'review_queue', description: 'Items pending human review', sortOrder: 5 },
  { name: 'Knowledge Index', nameKo: '지식 색인', collectionType: 'knowledge_index', description: 'Catalog of all canonical pages', sortOrder: 6 },
  { name: 'Activity Log', nameKo: '활동 로그', collectionType: 'activity_log', description: 'System event timeline', sortOrder: 7 },
];

export function getCollectionTypeForPageType(pageType: PageType): CollectionType {
  return getDefaultCollectionTypeForPageType(pageType);
}

export async function resolveCollectionIdByType(params: {
  workspaceId: string;
  collectionType: CollectionType;
}): Promise<string | null> {
  const rows = await db
    .select({ id: collections.id })
    .from(collections)
    .where(
      and(
        eq(collections.workspaceId, params.workspaceId),
        eq(collections.collectionType, params.collectionType),
      ),
    )
    .limit(1);

  return rows[0]?.id ?? null;
}
