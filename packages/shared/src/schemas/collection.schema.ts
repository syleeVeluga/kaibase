import { z } from 'zod';
import { collectionTypeSchema } from './page.schema.js';

export const createCollectionSchema = z.object({
  name: z.string().min(1).max(255),
  nameKo: z.string().max(255).nullable().optional(),
  collectionType: collectionTypeSchema.default('custom'),
  description: z.string().max(2000).nullable().optional(),
});

export const updateCollectionSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  nameKo: z.string().max(255).nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export type CreateCollectionInput = z.infer<typeof createCollectionSchema>;
export type UpdateCollectionInput = z.infer<typeof updateCollectionSchema>;
