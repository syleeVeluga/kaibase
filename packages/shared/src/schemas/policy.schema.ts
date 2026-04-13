import { z } from 'zod';
import { collectionTypeSchema } from './page.schema.js';

export const policyOutcomeSchema = z.enum([
  'AUTO_PUBLISH',
  'DRAFT_ONLY',
  'REVIEW_REQUIRED',
  'BLOCKED',
]);

export const policyConditionSchema = z.object({
  field: z.string(),
  operator: z.enum(['equals', 'not_equals', 'contains', 'not_contains', 'matches', 'gt', 'lt', 'in', 'not_in', 'exists', 'not_exists']),
  value: z.unknown(),
});

export const policyRuleSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string(),
  conditions: z.array(policyConditionSchema),
  outcome: policyOutcomeSchema,
  targetCollectionType: collectionTypeSchema.optional(),
  priority: z.number().int().min(0),
  enabled: z.boolean(),
});

export const createPolicyPackSchema = z.object({
  name: z.string().min(1).max(255),
  rules: z.array(policyRuleSchema),
  defaultOutcome: policyOutcomeSchema.optional(),
});

export type CreatePolicyPackInput = z.infer<typeof createPolicyPackSchema>;

export const updatePolicyPackSchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    rules: z.array(policyRuleSchema).optional(),
    defaultOutcome: policyOutcomeSchema.optional(),
  })
  .refine(
    (data) => data.name !== undefined || data.rules !== undefined || data.defaultOutcome !== undefined,
    'At least one field (name, rules, or defaultOutcome) must be provided',
  );

export type UpdatePolicyPackInput = z.infer<typeof updatePolicyPackSchema>;

export const evaluatePolicySchema = z.object({
  context: z.record(z.string(), z.unknown()),
});

export type EvaluatePolicyInput = z.infer<typeof evaluatePolicySchema>;
