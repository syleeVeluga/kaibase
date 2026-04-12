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
});

export type CreatePageInput = z.infer<typeof createPageSchema>;
export type UpdatePageInput = z.infer<typeof updatePageSchema>;
