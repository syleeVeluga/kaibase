# PRD-05: Policy Engine

> Parent: [PRD-00 Overview](./00-overview.md)  
> Status: Draft

---

## Purpose

The Policy Engine is the governance core of Kaibase. Every automated action — page creation, page update, classification, channel output — must pass through policy evaluation before execution. Policies are defined per workspace and determine what the AI can do automatically versus what requires human review.

---

## Design Principles

1. **Policy before automation** — No AI write action executes without policy evaluation.
2. **Declarative rules** — Policies are data (JSON), not code. Workspace admins configure them via UI.
3. **Four outcomes only** — Every evaluation produces one of: `AUTO_PUBLISH`, `DRAFT_ONLY`, `REVIEW_REQUIRED`, `BLOCKED`.
4. **Channel-agnostic** — The same policy applies whether input comes from web upload, email, Slack, Discord, or MCP.
5. **Auditable** — Every policy decision is logged with the rule that triggered it.

---

## Policy Outcomes

| Outcome | Behavior |
|---------|----------|
| `AUTO_PUBLISH` | AI action proceeds and result is immediately visible in the knowledge space. |
| `DRAFT_ONLY` | AI action proceeds but result is saved as a draft, not published. User can review and publish. |
| `REVIEW_REQUIRED` | AI action creates a draft + a ReviewTask. A designated reviewer must approve before publishing. |
| `BLOCKED` | AI action is rejected. Source is stored but no page/update is created. User is notified. |

---

## Policy Pack Schema

Each workspace has one active `PolicyPack`. A PolicyPack contains an array of rules evaluated in order (first match wins).

```typescript
interface PolicyPack {
  id: string;
  workspace_id: string;
  name: string;
  version: number;
  is_active: boolean;
  default_outcome: PolicyOutcome; // fallback if no rule matches
  rules: PolicyRule[];
  ai_config: AIConfig;
  created_at: string;
  updated_at: string;
}

type PolicyOutcome = 'AUTO_PUBLISH' | 'DRAFT_ONLY' | 'REVIEW_REQUIRED' | 'BLOCKED';

interface PolicyRule {
  id: string;
  name: string;                    // human-readable rule name
  description?: string;
  priority: number;                // lower = higher priority
  enabled: boolean;
  conditions: PolicyCondition[];   // AND logic within a rule
  outcome: PolicyOutcome;
  reviewers?: string[];            // user IDs for REVIEW_REQUIRED
  notify?: string[];               // user IDs to notify
}

interface PolicyCondition {
  field: PolicyField;
  operator: ConditionOperator;
  value: string | string[] | number | boolean;
}

type PolicyField =
  | 'source_type'        // file_upload, url, email, slack_message, discord_message, mcp_input
  | 'channel'            // specific channel identifier
  | 'content_type'       // report, meeting_notes, feedback, incident, etc.
  | 'classification'     // AI-determined classification
  | 'action_type'        // page_create, page_update, entity_create, brief_create
  | 'target_collection'  // which collection the page would go into
  | 'confidence_score'   // AI confidence (0.0 - 1.0)
  | 'entity_count'       // number of entities extracted
  | 'has_contradiction'  // boolean: contradicts existing pages
  | 'word_count'         // source word count
  | 'language'           // detected language (en, ko, etc.)
  | 'actor_type'         // user, ai, mcp_agent
  | 'actor_id'           // specific user or agent ID
  | 'time_of_day'        // for time-based rules
  | 'day_of_week';       // for schedule-based rules

type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'in'
  | 'not_in'
  | 'greater_than'
  | 'less_than'
  | 'contains'
  | 'not_contains'
  | 'exists'
  | 'not_exists';
```

---

## AI Configuration (per workspace)

```typescript
interface AIConfig {
  default_model: string;           // e.g., 'gpt-4o', 'claude-sonnet-4-6'
  fallback_model?: string;
  classification_model?: string;   // lighter model for classification
  summary_language: 'en' | 'ko' | 'both';
  tone?: string;                   // e.g., 'professional', 'casual', 'technical'
  terminology_overrides?: Record<string, string>; // domain-specific terms
  max_auto_pages_per_hour?: number;  // rate limiting
  auto_promote_answers: boolean;   // whether Q&A answers auto-save
  auto_promote_threshold?: number; // confidence threshold for auto-promotion
}
```

---

## Default Policy Pack

New workspaces start with a sensible default:

```json
{
  "name": "Default Policy",
  "version": 1,
  "default_outcome": "DRAFT_ONLY",
  "rules": [
    {
      "name": "Block low-confidence classifications",
      "priority": 1,
      "conditions": [
        { "field": "confidence_score", "operator": "less_than", "value": 0.3 }
      ],
      "outcome": "BLOCKED"
    },
    {
      "name": "Review contradictions",
      "priority": 2,
      "conditions": [
        { "field": "has_contradiction", "operator": "equals", "value": true }
      ],
      "outcome": "REVIEW_REQUIRED"
    },
    {
      "name": "Auto-publish high-confidence file uploads",
      "priority": 10,
      "conditions": [
        { "field": "source_type", "operator": "equals", "value": "file_upload" },
        { "field": "confidence_score", "operator": "greater_than", "value": 0.8 },
        { "field": "action_type", "operator": "equals", "value": "page_create" }
      ],
      "outcome": "AUTO_PUBLISH"
    },
    {
      "name": "Review MCP agent writes",
      "priority": 5,
      "conditions": [
        { "field": "actor_type", "operator": "equals", "value": "mcp_agent" },
        { "field": "action_type", "operator": "in", "value": ["page_create", "page_update"] }
      ],
      "outcome": "REVIEW_REQUIRED"
    }
  ],
  "ai_config": {
    "default_model": "gpt-4o",
    "summary_language": "both",
    "auto_promote_answers": false
  }
}
```

---

## Evaluation Flow

```
IngestEvent or AI Action
         |
    Load active PolicyPack for workspace
         |
    Enrich event with AI metadata
    (classification, confidence, entity count, etc.)
         |
    Evaluate rules in priority order
         |
    First matching rule → return outcome
         |
    No match → return default_outcome
         |
    Log PolicyDecision to ActivityEvent
         |
    Route to appropriate handler:
      AUTO_PUBLISH  → execute and publish
      DRAFT_ONLY    → execute and save as draft
      REVIEW_REQUIRED → execute as draft + create ReviewTask
      BLOCKED       → reject, notify, log
```

---

## Channel Collection Rules

Policies also define which channels are collected and how they map to workspace sections:

```typescript
interface ChannelCollectionRule {
  channel_type: 'email' | 'slack' | 'discord' | 'mcp';
  channel_id?: string;         // specific channel/address
  enabled: boolean;
  default_collection: string;  // target collection for this channel
  auto_classify: boolean;      // let AI override the default collection
  filter_pattern?: string;     // regex to filter messages
  min_length?: number;         // ignore very short messages
}
```

---

## API Endpoints

```
GET    /api/v1/workspaces/:id/policy              -- get active policy pack
PUT    /api/v1/workspaces/:id/policy              -- update policy pack (creates new version)
GET    /api/v1/workspaces/:id/policy/versions      -- list policy versions
GET    /api/v1/workspaces/:id/policy/versions/:v   -- get specific version
POST   /api/v1/workspaces/:id/policy/evaluate      -- dry-run evaluation (for testing)
GET    /api/v1/workspaces/:id/policy/decisions      -- list recent decisions (audit)
```

---

## FR12: Policy Configuration (Functional Requirement)

### Acceptance Criteria

- [ ] Workspace admins can view and edit policy rules via web UI
- [ ] Rules support all PolicyField types and ConditionOperator types
- [ ] Policy changes create a new version (previous versions preserved)
- [ ] Dry-run evaluation endpoint allows testing rules without executing
- [ ] Default policy pack is created for new workspaces
- [ ] Every policy decision is logged as an ActivityEvent with rule ID
- [ ] AI configuration (model, language, tone) is editable per workspace
- [ ] Rate limiting (`max_auto_pages_per_hour`) is enforced

---

## Related Documents

- [PRD-02: Data Model](./02-data-model.md) — PolicyPack schema
- [PRD-04: AI Compiler](./04-ai-compiler.md) — AI actions governed by policy
- [PRD-08: Review Queue](./08-review-queue.md) — REVIEW_REQUIRED handling
- [PRD-10: Activity Log](./10-activity-log.md) — Decision audit trail
