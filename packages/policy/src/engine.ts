import type {
  PolicyEvaluationResult,
  PolicyOutcome,
  PolicyPack,
  PolicyRule,
} from '@kaibase/shared';
import { matchRule } from './rules.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Fallback outcome used when the PolicyPack contains no matching rules.
 * The PRD specifies that unmatched actions should be gated behind review;
 * this is the safest conservative default.
 */
const FALLBACK_OUTCOME: PolicyOutcome = 'REVIEW_REQUIRED';

// ---------------------------------------------------------------------------
// PolicyEngine
// ---------------------------------------------------------------------------

/**
 * PolicyEngine is the governance gate for all AI write actions in Kaibase.
 *
 * Usage:
 *   const engine = new PolicyEngine(pack);
 *   const result = engine.evaluate(context);
 *   // result.outcome => 'AUTO_PUBLISH' | 'DRAFT_ONLY' | 'REVIEW_REQUIRED' | 'BLOCKED'
 *
 * Evaluation semantics:
 *   - Rules are sorted by `priority` ascending; the first matching rule wins.
 *   - Only enabled rules participate in evaluation.
 *   - Rules with zero conditions never match (safe default — see rules.ts).
 *   - When no rule matches, the engine returns the `defaultOutcome` configured
 *     on the PolicyPack, or `REVIEW_REQUIRED` if no defaultOutcome is set.
 */
export class PolicyEngine {
  private readonly sortedRules: PolicyRule[];
  private readonly defaultOutcome: PolicyOutcome;
  private readonly packId: string;
  private readonly packName: string;

  constructor(pack: PolicyPack) {
    // Sort once at construction time; evaluation itself is O(n) thereafter.
    this.sortedRules = [...pack.rules].sort((a, b) => a.priority - b.priority);

    // PolicyPack in @kaibase/shared does not expose a `defaultOutcome` field
    // yet (the PRD schema does).  Until it is added to the shared type, we
    // fall back to the module constant which matches the PRD's stated default.
    this.defaultOutcome = FALLBACK_OUTCOME;
    this.packId = pack.id;
    this.packName = pack.name;
  }

  /**
   * Evaluate an AI action context against the loaded PolicyPack.
   *
   * @param context - Flat or nested key-value map describing the action.
   *   Common fields (all optional — missing fields produce non-matches):
   *     source_type    — e.g. 'file_upload', 'mcp_input'
   *     actor_type     — 'user' | 'ai' | 'mcp_agent'
   *     action_type    — 'page_create' | 'page_update' | 'classify' | …
   *     confidence_score — number 0.0–1.0
   *     has_contradiction — boolean
   *     entity_count   — number
   *     word_count     — number
   *     language       — 'en' | 'ko' | …
   *
   * @returns PolicyEvaluationResult with the decided outcome and audit info.
   */
  evaluate(context: Record<string, unknown>): PolicyEvaluationResult {
    for (const rule of this.sortedRules) {
      if (matchRule(rule, context)) {
        return {
          outcome: rule.outcome,
          matchedRuleId: rule.id,
          matchedRuleName: rule.name,
          reasoning: this.buildReasoning(rule, 'matched'),
        };
      }
    }

    // No rule matched — use the configured default outcome.
    return {
      outcome: this.defaultOutcome,
      matchedRuleId: null,
      matchedRuleName: null,
      reasoning: this.buildNoMatchReasoning(),
    };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private buildReasoning(rule: PolicyRule, _matchKind: 'matched'): string {
    return (
      `Rule "${rule.name}" (priority ${rule.priority}, id: ${rule.id})` +
      ` matched in pack "${this.packName}" (${this.packId}).` +
      ` Outcome: ${rule.outcome}.`
    );
  }

  private buildNoMatchReasoning(): string {
    return (
      `No enabled rule matched in pack "${this.packName}" (${this.packId}).` +
      ` Applying default outcome: ${this.defaultOutcome}.`
    );
  }
}
