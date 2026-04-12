import type { PolicyCondition, PolicyRule } from '@kaibase/shared';

// ---------------------------------------------------------------------------
// Operator implementations
// ---------------------------------------------------------------------------

/**
 * Resolve a dot-separated field path against a context object.
 * Returns `undefined` when any segment along the path is missing.
 *
 * Example: field = "source.type", context = { source: { type: "file_upload" } }
 * => "file_upload"
 */
function resolveField(
  field: string,
  context: Record<string, unknown>,
): unknown {
  const segments = field.split('.');
  let current: unknown = context;
  for (const segment of segments) {
    if (current === null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

/**
 * Coerce a context value to a number for numeric comparisons.
 * Returns `NaN` when the value cannot be meaningfully converted.
 */
function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return parsed;
  }
  return NaN;
}

/**
 * Evaluate a single PolicyCondition against a resolved context value.
 *
 * Supported operators:
 *   equals       — strict equality (===)
 *   not_equals   — strict inequality (!==)
 *   contains     — substring match (strings) or array element presence
 *   not_contains — inverse of contains
 *   matches      — regex test (context value cast to string)
 *   gt           — numeric greater-than
 *   lt           — numeric less-than
 *   in           — context value is a member of condition value array
 *   not_in       — context value is NOT a member of condition value array
 *   exists       — context value is not undefined/null
 *   not_exists   — context value is undefined/null
 */
function evaluateCondition(
  condition: PolicyCondition,
  contextValue: unknown,
): boolean {
  const { operator, value: condValue } = condition;

  switch (operator) {
    case 'equals': {
      return contextValue === condValue;
    }

    case 'not_equals': {
      return contextValue !== condValue;
    }

    case 'contains':
    case 'not_contains': {
      let found = false;
      if (typeof contextValue === 'string' && typeof condValue === 'string') {
        found = contextValue.includes(condValue);
      } else if (Array.isArray(contextValue)) {
        found = contextValue.includes(condValue);
      }
      return operator === 'contains' ? found : !found;
    }

    case 'matches': {
      if (typeof condValue !== 'string') return false;
      const str =
        contextValue === null || contextValue === undefined
          ? ''
          : String(contextValue);
      try {
        return new RegExp(condValue).test(str);
      } catch {
        // Malformed regex — treat as non-match rather than throwing.
        return false;
      }
    }

    case 'gt': {
      const ctxNum = toNumber(contextValue);
      const condNum = toNumber(condValue);
      if (isNaN(ctxNum) || isNaN(condNum)) return false;
      return ctxNum > condNum;
    }

    case 'lt': {
      const ctxNum = toNumber(contextValue);
      const condNum = toNumber(condValue);
      if (isNaN(ctxNum) || isNaN(condNum)) return false;
      return ctxNum < condNum;
    }

    case 'in': {
      if (!Array.isArray(condValue)) return false;
      // Allow an empty list to be a deliberate no-match (e.g., the default
      // blocklist rule which starts empty).
      if (condValue.length === 0) return false;
      return condValue.includes(contextValue);
    }

    case 'not_in': {
      if (!Array.isArray(condValue)) return true;
      return !condValue.includes(contextValue);
    }

    case 'exists': {
      return contextValue !== undefined && contextValue !== null;
    }

    case 'not_exists': {
      return contextValue === undefined || contextValue === null;
    }

    default: {
      // Exhaustive check — if a new operator is added to the union in
      // @kaibase/shared but not here, the build will fail.
      const _exhaustive: never = operator;
      throw new Error(`Unknown policy condition operator: ${String(_exhaustive)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Evaluate whether a PolicyRule matches the provided evaluation context.
 *
 * All conditions within a rule use AND logic — every condition must be
 * satisfied for the rule to be considered a match.
 *
 * A disabled rule never matches.
 *
 * A rule with zero conditions never matches (guards against accidental
 * catch-all rules introduced through misconfiguration).
 */
export function matchRule(
  rule: PolicyRule,
  context: Record<string, unknown>,
): boolean {
  if (!rule.enabled) return false;
  if (rule.conditions.length === 0) return false;

  return rule.conditions.every((condition) => {
    const contextValue = resolveField(condition.field, context);
    return evaluateCondition(condition, contextValue);
  });
}
