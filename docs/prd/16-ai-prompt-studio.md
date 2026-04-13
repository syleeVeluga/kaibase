# PRD-16: AI Prompt Studio

> Parent: [PRD-00 Overview](./00-overview.md)  
> Related: [PRD-04 AI Compiler](./04-ai-compiler.md)  
> Status: Draft

---

## Purpose

The AI Prompt Studio provides workspace administrators with a UI to view, edit, and manage AI pipeline configurations. Each AI function (classify, summarize, extract-entities, create-page, answer-question) can be independently configured with custom system/user prompts, model selection, temperature, and reasoning effort — all scoped to the workspace.

### Design Principle: Override Layering

Configuration resolves through a 3-level precedence chain:

```
DB override (workspace-specific)  →  env var (deployment default)  →  code default (hardcoded)
```

When no workspace override exists, the system falls back to deployment-wide env vars, then to code-level defaults. This preserves backward compatibility — existing deployments continue working with zero configuration.

### Design Principle: Read-Only Pipeline Visualization

The ingest pipeline order is fixed in code (BullMQ job chaining). The UI shows a read-only flow diagram indicating which steps have workspace overrides. Reordering or disabling pipeline steps is not supported.

### Design Principle: Simple Grid UI

Each AI function is displayed as a card in a responsive grid. Edit mode is inline — no modal dialogs or separate pages. The UI targets speed: open, tweak, save, done.

---

## Data Model

### `ai_prompt_configs` Table

One row per AI function per workspace. Maximum 5 rows per workspace.

| Column | Type | Constraint | Description |
|--------|------|------------|-------------|
| `id` | uuid | PK, auto-gen | Row identifier |
| `workspace_id` | uuid | FK → workspaces, NOT NULL | Tenant scope |
| `function_id` | varchar(50) | NOT NULL | `classify` \| `summarize` \| `extract-entities` \| `create-page` \| `answer-question` |
| `model` | varchar(100) | nullable | Model override (e.g., `gpt-5.4`, `claude-sonnet-4-20250514`) |
| `temperature` | real | nullable | Temperature override (0.0–2.0) |
| `reasoning_effort` | varchar(20) | nullable | `none` \| `minimal` \| `low` \| `medium` \| `high` \| `xhigh` |
| `system_prompt_override` | text | nullable | Full replacement for system prompt |
| `user_prompt_override` | text | nullable | Full replacement for user prompt template |
| `is_active` | boolean | default true | Disable override without deleting |
| `updated_at` | timestamptz | NOT NULL | Last modification time |
| `updated_by` | uuid | NOT NULL | User who last modified |

**Unique constraint:** `(workspace_id, function_id)`  
**Index:** `workspace_id`

---

## Config Resolution

```typescript
async function resolvePromptConfig(
  functionId: AiPromptFunctionId,
  workspaceId: string,
): Promise<ResolvedPromptConfig> {
  // 1. Query ai_prompt_configs for (workspaceId, functionId) where isActive = true
  // 2. For each field (model, temperature, reasoningEffort, prompts):
  //    - Use DB value if non-null
  //    - Else use env var if set (CLASSIFY_MODEL, CLASSIFY_REASONING, etc.)
  //    - Else use code default from FUNCTION_DEFAULTS
  // 3. Return merged config
}
```

### Code Defaults

| Function | Default Model | Default Reasoning | Env Var (Model) | Env Var (Reasoning) |
|----------|--------------|-------------------|-----------------|---------------------|
| classify | gpt-5.4-mini | low | `CLASSIFY_MODEL` | `CLASSIFY_REASONING` |
| summarize | gpt-5.4 | medium | `SUMMARIZE_MODEL` | `SUMMARIZE_REASONING` |
| extract-entities | gpt-5.4-nano | low | `EXTRACT_ENTITIES_MODEL` | `EXTRACT_ENTITIES_REASONING` |
| create-page | gpt-5.4 | medium | `PAGE_CREATE_MODEL` | `PAGE_CREATE_REASONING` |
| answer-question | gpt-5.4 | medium | `QA_MODEL` | `QA_REASONING` |

---

## API Endpoints

Base path: `/api/v1/workspaces/:wid/ai-config`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | List all 5 function configs (DB overrides merged with defaults) |
| `GET` | `/defaults` | Return code-level defaults for all functions (for Reset UI) |
| `GET` | `/:functionId` | Single function config (merged) |
| `PUT` | `/:functionId` | Upsert override for a function |
| `DELETE` | `/:functionId` | Delete override (reset to defaults) |

### PUT Request Body

```typescript
{
  model?: string | null;
  temperature?: number | null;       // 0.0–2.0
  reasoningEffort?: string | null;    // LLMReasoningEffort enum
  systemPromptOverride?: string | null;
  userPromptOverride?: string | null;
  isActive?: boolean;
}
```

Null fields clear the override for that field (fall back to env/code default).

---

## UI Components

### Pipeline Visualization (read-only)

```
[Parse] → [Classify] ─┬→ [Summarize]        ─┬→ [Page Create] → [Embedding]
                       └→ [Extract Entities] ─┘

[Answer Question] (standalone, triggered by user Q&A)
```

- Pure CSS flexbox layout
- Configurable nodes show a colored dot indicator
- Click scrolls to the corresponding function card

### Function Config Grid

Responsive grid: `repeat(auto-fill, minmax(400px, 1fr))`

Each card:
- Header: function name + Customized/Default badge
- Summary: model, temperature, reasoning effort
- Edit button → inline form toggle
- Form fields: model input, temperature input (0.0–2.0), reasoning effort select, system prompt textarea, user prompt textarea
- Available template variables listed as read-only reference
- Save / Reset to Default buttons

### Available Template Variables (per function)

| Function | Variables |
|----------|-----------|
| classify | `sourceText`, `sourceTitle`, `sourceTypeHint`, `language`, `workspaceContext` |
| summarize | `sourceText`, `sourceTitle`, `language`, `maxSentences`, `workspaceContext` |
| extract-entities | `sourceText`, `sourceTitle`, `language`, `knownEntities`, `workspaceContext` |
| create-page | `sources[]`, `pageType`, `language`, `templateSections[]`, `instructions`, `workspaceContext`, `suggestedTitle` |
| answer-question | `question`, `language`, `contextPages[]`, `contextSources[]`, `conversationHistory[]`, `workspaceContext` |

---

## Navigation

- Settings page → "AI Prompt Studio" link → `/settings/ai-prompts`
- Same sub-page pattern as `/settings/templates`

---

## i18n

Namespace: `settings.promptStudio`

Required keys for EN + KO:
- Page title, description
- Pipeline node labels (6 nodes)
- Function names and descriptions (5 functions)
- Field labels (model, temperature, reasoningEffort, systemPrompt, userPrompt)
- Action labels (edit, save, resetToDefault, cancel)
- Status labels (customized, default, saved, reset)
- Reasoning level labels (6 levels)

---

## Worker Integration

Workers are refactored to call `resolvePromptConfig()` instead of reading env vars directly. The lazy singleton LLM provider pattern changes to a model-keyed `Map<string, OpenAIProvider>` cache, since different workspaces may use different models.

```typescript
// Before (per worker):
const model = process.env['CLASSIFY_MODEL'] ?? 'gpt-5.4-mini';
llmInstance = new OpenAIProvider({ apiKey, model });

// After:
const config = await resolvePromptConfig('classify', workspaceId);
const llm = getOrCreateProvider(config.model, apiKey);
// Apply systemPromptOverride if present
```

---

## Prompt Override Strategy

- **Full replacement**: DB override replaces the entire system or user prompt
- **Null = no override**: NULL fields fall back to code defaults
- **Reset**: DELETE endpoint removes the row; UI shows code default
- **Version tracking**: Code prompts have `PROMPT_VERSION` constants. Future enhancement: warn when code default changes after override was saved

---

## Phase Alignment

- **Phase 0b**: Core UI + DB + API + config resolver
- **Phase 1**: Prompt version drift warnings, A/B testing support, per-workspace cost dashboard

---

## Related Documents

- [PRD-04: AI Compiler](./04-ai-compiler.md) — AI pipeline architecture
- [PRD-05: Policy Engine](./05-policy-engine.md) — Policy governs AI actions
- [PRD-14: Frontend](./14-frontend.md) — UI patterns and conventions
