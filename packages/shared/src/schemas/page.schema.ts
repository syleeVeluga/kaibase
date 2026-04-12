import { z } from 'zod';

export const pageTypeSchema = z.enum([
  'project',
  'entity',
  'concept',
  'brief',
  'answer',
  'summary',
  'comparison',
  'custom',
]);

export const pageStatusSchema = z.enum(['draft', 'published', 'archived', 'review_pending']);

export const collectionTypeSchema = z.enum([
  'inbox',
  'project',
  'entities',
  'concepts',
  'briefs',
  'review_queue',
  'knowledge_index',
  'activity_log',
  'custom',
]);

export const createPageSchema = z.object({
  pageType: pageTypeSchema,
  title: z.string().min(1).max(500),
  titleKo: z.string().max(500).nullable().optional(),
  collectionId: z.string().uuid().optional(),
});

export const updatePageSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  titleKo: z.string().max(500).nullable().optional(),
  status: pageStatusSchema.optional(),
  collectionId: z.string().uuid().nullable().optional(),
  contentSnapshot: z.string().optional(),
});

export const reviewActionSchema = z.object({
  reviewNotes: z.string().max(2000).optional(),
});

export interface ContentBlock {
  type: 'heading' | 'paragraph' | 'list' | 'quote' | 'table' | 'divider';
  level?: 1 | 2 | 3;
  content?: string;
  items?: string[];
  headers?: string[];
  rows?: string[][];
  citations?: string[];
}

export type CreatePageInput = z.infer<typeof createPageSchema>;
export type UpdatePageInput = z.infer<typeof updatePageSchema>;
export type ReviewActionInput = z.infer<typeof reviewActionSchema>;
