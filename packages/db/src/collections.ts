import { and, eq } from 'drizzle-orm';
import type { CollectionType, PageType } from '@kaibase/shared';
import { getDefaultCollectionTypeForPageType } from '@kaibase/shared';
import { db } from './client.js';
import { collections } from './schema/index.js';

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
