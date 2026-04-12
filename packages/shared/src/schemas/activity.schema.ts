import { z } from 'zod';

export const activityEventTypeSchema = z.enum([
  'ingest',
  'classify',
  'page_create',
  'page_update',
  'page_publish',
  'query',
  'answer',
  'review_create',
  'review_complete',
  'lint',
  'digest',
  'channel_send',
  'mcp_call',
  'policy_update',
]);

export const actorTypeSchema = z.enum(['user', 'ai', 'system', 'mcp_agent']);

export const activityFilterSchema = z.object({
  eventType: activityEventTypeSchema.optional(),
  actorType: actorTypeSchema.optional(),
  targetType: z.string().max(100).optional(),
  targetId: z.string().uuid().optional(),
  since: z.string().datetime().optional(),
  until: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

export type ActivityFilterInput = z.infer<typeof activityFilterSchema>;
