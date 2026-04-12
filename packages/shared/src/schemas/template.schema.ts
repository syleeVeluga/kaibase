import { z } from 'zod';
import { pageTypeSchema } from './page.schema.js';

export const templateSectionSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  required: z.boolean().default(true),
});

export const createTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  pageType: pageTypeSchema,
  sections: z.array(templateSectionSchema).default([]),
  triggerConditions: z.record(z.string(), z.unknown()).default({}),
  aiInstructions: z.string().max(5000).optional(),
});

export const updateTemplateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  pageType: pageTypeSchema.optional(),
  sections: z.array(templateSectionSchema).optional(),
  triggerConditions: z.record(z.string(), z.unknown()).optional(),
  aiInstructions: z.string().max(5000).nullable().optional(),
  isActive: z.boolean().optional(),
});

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
