export type EntityType =
  | 'person'
  | 'organization'
  | 'product'
  | 'technology'
  | 'location'
  | 'event'
  | 'custom';

export interface Entity {
  id: string;
  workspaceId: string;
  entityType: EntityType;
  name: string;
  nameKo: string | null;
  aliases: string[];
  description: string | null;
  canonicalPageId: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Concept {
  id: string;
  workspaceId: string;
  name: string;
  nameKo: string | null;
  description: string | null;
  canonicalPageId: string | null;
  parentConceptId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Citation {
  id: string;
  pageId: string;
  sourceId: string;
  excerpt: string;
  locationHint: string | null;
  confidence: number;
  createdAt: Date;
}
