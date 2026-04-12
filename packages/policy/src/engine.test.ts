import { describe, expect, it } from 'vitest';
import { PolicyEngine } from './engine.js';
import { getDefaultPolicyPack } from './defaults.js';
import { matchRule } from './rules.js';
import type { PolicyRule } from '@kaibase/shared';

// ---------------------------------------------------------------------------
// Helper: minimal rule factory
// ---------------------------------------------------------------------------

function makeRule(
  overrides: Partial<PolicyRule> & Pick<PolicyRule, 'conditions' | 'outcome'>,
): PolicyRule {
  return {
    id: 'test-rule',
    name: 'Test rule',
    description: '',
    priority: 0,
    enabled: true,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// matchRule — operator coverage
// ---------------------------------------------------------------------------

describe('matchRule', () => {
  it('returns false for a disabled rule regardless of context', () => {
    const rule = makeRule({
      enabled: false,
      conditions: [{ field: 'actor_type', operator: 'equals', value: 'ai' }],
      outcome: 'BLOCKED',
    });
    expect(matchRule(rule, { actor_type: 'ai' })).toBe(false);
  });

  it('returns false for a rule with zero conditions', () => {
    const rule = makeRule({ conditions: [], outcome: 'AUTO_PUBLISH' });
    expect(matchRule(rule, {})).toBe(false);
  });

  describe('equals', () => {
    it('matches exact string equality', () => {
      const rule = makeRule({
        conditions: [{ field: 'actor_type', operator: 'equals', value: 'ai' }],
        outcome: 'DRAFT_ONLY',
      });
      expect(matchRule(rule, { actor_type: 'ai' })).toBe(true);
      expect(matchRule(rule, { actor_type: 'user' })).toBe(false);
    });

    it('matches boolean equality', () => {
      const rule = makeRule({
        conditions: [{ field: 'has_contradiction', operator: 'equals', value: true }],
        outcome: 'REVIEW_REQUIRED',
      });
      expect(matchRule(rule, { has_contradiction: true })).toBe(true);
      expect(matchRule(rule, { has_contradiction: false })).toBe(false);
    });

    it('returns false when the field is absent from context', () => {
      const rule = makeRule({
        conditions: [{ field: 'source_type', operator: 'equals', value: 'email' }],
        outcome: 'DRAFT_ONLY',
      });
      expect(matchRule(rule, {})).toBe(false);
    });
  });

  describe('contains', () => {
    it('matches substring in a string value', () => {
      const rule = makeRule({
        conditions: [{ field: 'title', operator: 'contains', value: 'Alpha' }],
        outcome: 'DRAFT_ONLY',
      });
      expect(matchRule(rule, { title: 'Project Alpha Report' })).toBe(true);
      expect(matchRule(rule, { title: 'Project Beta Report' })).toBe(false);
    });

    it('matches element in an array context value', () => {
      const rule = makeRule({
        conditions: [{ field: 'tags', operator: 'contains', value: 'urgent' }],
        outcome: 'REVIEW_REQUIRED',
      });
      expect(matchRule(rule, { tags: ['urgent', 'financial'] })).toBe(true);
      expect(matchRule(rule, { tags: ['routine'] })).toBe(false);
    });
  });

  describe('matches (regex)', () => {
    it('tests the context value against a regex pattern', () => {
      const rule = makeRule({
        conditions: [{ field: 'channel', operator: 'matches', value: '^slack-' }],
        outcome: 'DRAFT_ONLY',
      });
      expect(matchRule(rule, { channel: 'slack-general' })).toBe(true);
      expect(matchRule(rule, { channel: 'email-inbox' })).toBe(false);
    });

    it('returns false for a malformed regex without throwing', () => {
      const rule = makeRule({
        conditions: [{ field: 'channel', operator: 'matches', value: '[invalid' }],
        outcome: 'DRAFT_ONLY',
      });
      expect(matchRule(rule, { channel: 'slack-general' })).toBe(false);
    });
  });

  describe('gt / lt', () => {
    it('gt: matches when context number is greater than condition value', () => {
      const rule = makeRule({
        conditions: [{ field: 'confidence_score', operator: 'gt', value: 0.8 }],
        outcome: 'AUTO_PUBLISH',
      });
      expect(matchRule(rule, { confidence_score: 0.9 })).toBe(true);
      expect(matchRule(rule, { confidence_score: 0.8 })).toBe(false);
      expect(matchRule(rule, { confidence_score: 0.5 })).toBe(false);
    });

    it('lt: matches when context number is less than condition value', () => {
      const rule = makeRule({
        conditions: [{ field: 'confidence_score', operator: 'lt', value: 0.3 }],
        outcome: 'BLOCKED',
      });
      expect(matchRule(rule, { confidence_score: 0.1 })).toBe(true);
      expect(matchRule(rule, { confidence_score: 0.3 })).toBe(false);
      expect(matchRule(rule, { confidence_score: 0.9 })).toBe(false);
    });

    it('returns false when the field is not a number', () => {
      const rule = makeRule({
        conditions: [{ field: 'score', operator: 'gt', value: 0.5 }],
        outcome: 'AUTO_PUBLISH',
      });
      expect(matchRule(rule, { score: 'high' })).toBe(false);
    });
  });

  describe('in', () => {
    it('matches when context value is in the condition array', () => {
      const rule = makeRule({
        conditions: [
          { field: 'source_type', operator: 'in', value: ['email', 'slack_message'] },
        ],
        outcome: 'REVIEW_REQUIRED',
      });
      expect(matchRule(rule, { source_type: 'email' })).toBe(true);
      expect(matchRule(rule, { source_type: 'slack_message' })).toBe(true);
      expect(matchRule(rule, { source_type: 'file_upload' })).toBe(false);
    });

    it('returns false for an empty condition array (deliberate no-match)', () => {
      const rule = makeRule({
        conditions: [{ field: 'source_type', operator: 'in', value: [] }],
        outcome: 'BLOCKED',
      });
      expect(matchRule(rule, { source_type: 'email' })).toBe(false);
    });
  });

  describe('not_in', () => {
    it('matches when context value is NOT in the condition array', () => {
      const rule = makeRule({
        conditions: [
          { field: 'actor_type', operator: 'not_in', value: ['user'] },
        ],
        outcome: 'DRAFT_ONLY',
      });
      expect(matchRule(rule, { actor_type: 'ai' })).toBe(true);
      expect(matchRule(rule, { actor_type: 'user' })).toBe(false);
    });
  });

  describe('AND logic across multiple conditions', () => {
    it('returns true only when ALL conditions are satisfied', () => {
      const rule = makeRule({
        conditions: [
          { field: 'actor_type', operator: 'equals', value: 'ai' },
          { field: 'confidence_score', operator: 'gt', value: 0.8 },
        ],
        outcome: 'AUTO_PUBLISH',
      });
      // Both conditions met
      expect(matchRule(rule, { actor_type: 'ai', confidence_score: 0.95 })).toBe(true);
      // Only first condition met
      expect(matchRule(rule, { actor_type: 'ai', confidence_score: 0.5 })).toBe(false);
      // Only second condition met
      expect(matchRule(rule, { actor_type: 'user', confidence_score: 0.95 })).toBe(false);
      // Neither met
      expect(matchRule(rule, { actor_type: 'user', confidence_score: 0.1 })).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// PolicyEngine — evaluation logic
// ---------------------------------------------------------------------------

describe('PolicyEngine', () => {
  describe('evaluate', () => {
    it('returns first-match-wins based on priority order', () => {
      const pack = getDefaultPolicyPack('ws-1');
      const engine = new PolicyEngine(pack);

      // User page creation => priority 10 rule fires before any lower-priority rules
      const result = engine.evaluate({ actor_type: 'user', action_type: 'page_create' });
      expect(result.outcome).toBe('AUTO_PUBLISH');
      expect(result.matchedRuleId).toBe('default:rule:auto-publish-user-created');
    });

    it('returns REVIEW_REQUIRED as the fallback when no rule matches', () => {
      const pack = getDefaultPolicyPack('ws-2');
      const engine = new PolicyEngine(pack);

      // Context that matches no rule
      const result = engine.evaluate({ actor_type: 'system', action_type: 'unknown' });
      expect(result.outcome).toBe('REVIEW_REQUIRED');
      expect(result.matchedRuleId).toBeNull();
      expect(result.matchedRuleName).toBeNull();
    });

    it('fills reasoning for a matched rule', () => {
      const pack = getDefaultPolicyPack('ws-3');
      const engine = new PolicyEngine(pack);
      const result = engine.evaluate({ actor_type: 'ai', action_type: 'page_create' });
      expect(result.reasoning).toContain('matched');
      expect(result.reasoning).toContain('REVIEW_REQUIRED');
    });

    it('fills reasoning for the no-match fallback', () => {
      const pack = getDefaultPolicyPack('ws-4');
      const engine = new PolicyEngine(pack);
      const result = engine.evaluate({});
      expect(result.reasoning).toContain('No enabled rule matched');
    });
  });

  // -------------------------------------------------------------------------
  // Default policy pack — validate each of the five rules
  // -------------------------------------------------------------------------

  describe('default policy pack rules', () => {
    const pack = getDefaultPolicyPack('ws-default');
    const engine = new PolicyEngine(pack);

    it('rule priority 0: empty blocklist does NOT block any source type', () => {
      // The blocklist is empty by default; adding values activates it.
      const result = engine.evaluate({ source_type: 'email', actor_type: 'ai' });
      // Must not match the block rule; falls through to other rules or default
      expect(result.outcome).not.toBe('BLOCKED');
    });

    it('rule priority 10: auto-publishes user-created pages', () => {
      const result = engine.evaluate({ actor_type: 'user', action_type: 'page_create' });
      expect(result.outcome).toBe('AUTO_PUBLISH');
    });

    it('rule priority 20: requires review for AI page creation', () => {
      const result = engine.evaluate({ actor_type: 'ai', action_type: 'page_create' });
      expect(result.outcome).toBe('REVIEW_REQUIRED');
    });

    it('rule priority 30: drafts AI page updates', () => {
      const result = engine.evaluate({ actor_type: 'ai', action_type: 'page_update' });
      expect(result.outcome).toBe('DRAFT_ONLY');
    });

    it('rule priority 40: auto-publishes AI classification', () => {
      const result = engine.evaluate({ actor_type: 'ai', action_type: 'classify' });
      expect(result.outcome).toBe('AUTO_PUBLISH');
    });

    it('rule priority 40: auto-publishes AI summarization', () => {
      const result = engine.evaluate({ actor_type: 'ai', action_type: 'summarize' });
      expect(result.outcome).toBe('AUTO_PUBLISH');
    });
  });

  // -------------------------------------------------------------------------
  // Blocklist activation — show that populating the blocklist works
  // -------------------------------------------------------------------------

  describe('blocklist activation (priority 0)', () => {
    it('blocks a source type once added to the blocklist', () => {
      const pack = getDefaultPolicyPack('ws-block');
      // Mutate the blocklist rule value to simulate admin configuration
      const blockRule = pack.rules.find((r) => r.id === 'default:rule:block-source-type');
      if (!blockRule) throw new Error('block rule not found');
      const cond = blockRule.conditions[0];
      if (!cond) throw new Error('block rule condition not found');
      (cond.value as string[]).push('mcp_input');

      const engine = new PolicyEngine(pack);
      const result = engine.evaluate({ source_type: 'mcp_input', actor_type: 'mcp_agent' });
      expect(result.outcome).toBe('BLOCKED');
    });
  });
});

// ---------------------------------------------------------------------------
// getDefaultPolicyPack — structural assertions
// ---------------------------------------------------------------------------

describe('getDefaultPolicyPack', () => {
  it('returns a pack with the correct workspace ID', () => {
    const pack = getDefaultPolicyPack('ws-xyz');
    expect(pack.workspaceId).toBe('ws-xyz');
  });

  it('returns version 1 and isActive true', () => {
    const pack = getDefaultPolicyPack('ws-xyz');
    expect(pack.version).toBe(1);
    expect(pack.isActive).toBe(true);
  });

  it('returns exactly 5 rules', () => {
    const pack = getDefaultPolicyPack('ws-xyz');
    expect(pack.rules).toHaveLength(5);
  });

  it('all rules have valid outcomes', () => {
    const validOutcomes = new Set(['AUTO_PUBLISH', 'DRAFT_ONLY', 'REVIEW_REQUIRED', 'BLOCKED']);
    const pack = getDefaultPolicyPack('ws-xyz');
    for (const rule of pack.rules) {
      expect(validOutcomes.has(rule.outcome)).toBe(true);
    }
  });

  it('rules are uniquely identified', () => {
    const pack = getDefaultPolicyPack('ws-xyz');
    const ids = pack.rules.map((r) => r.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('accepts a custom packId for deterministic seeding', () => {
    const pack = getDefaultPolicyPack('ws-seed', 'seed-pack-001');
    expect(pack.id).toBe('seed-pack-001');
    expect(pack.rules[0]?.id.startsWith('seed-pack-001:')).toBe(true);
  });
});
