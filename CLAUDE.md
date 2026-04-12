# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Context

Kaibase is a BlockSuite-based, policy-driven AI knowledge operating system — a NotebookLM-like product for B2B teams. Users connect existing folders/storage (local folders, Google Drive, S3) and AI compiles documents into persistent, evolving knowledge pages. The core loop: **Connect → Compile → Review → Publish → Q&A → Lint → repeat**. No AFFiNE product code is used anywhere.

Full PRD and architecture docs live in `docs/prd/` (16 files) and `docs/implementation/` (4 files). Read them before making architectural decisions.

## Stack Versions (pinned)

```
Runtime:        Node 24.14.1 LTS, Yarn 4.13.0
Frontend:       React 19.2.x, TypeScript 6.0.2, Vite 7.2.7 (main app), vanilla-extract 1.18.0
Editor:         @blocksuite/presets 0.19.5, @blocksuite/blocks 0.19.5, @blocksuite/store 0.19.5, Yjs 13.6.30
Backend:        Hono 4.12.x, Drizzle ORM 0.45.2, PostgreSQL 18.3, Redis 8.6.2, BullMQ 5.69.3, pgvector 0.2.1
AI:             OpenAI SDK 6.33.0, Anthropic SDK 0.86.1
Data fetching:  @tanstack/react-query 5.97.0
Validation:     Zod 4.3.6
i18n:           react-i18next (EN primary, KO secondary)
Testing:        Vitest 4.0.x, Playwright (E2E), @testing-library/react
```

Full version lock: `docs/implementation/01-stack-versions.md`

## Common Commands

```bash
# Infrastructure
yarn docker:up                          # Start Postgres + Redis + MinIO
yarn docker:down                        # Stop infrastructure

# Development
yarn dev                                # All apps in parallel
yarn dev:web                            # Frontend only (Vite 7.2.7)
yarn dev:api                            # API server only (Hono)
yarn dev:workers                        # BullMQ workers only

# Build & Quality
yarn build                              # Build all workspaces (topological order)
yarn lint                               # Lint all workspaces
yarn typecheck                          # Type-check all workspaces
yarn test                               # Run all tests

# Single workspace test
yarn workspace @kaibase/shared test
yarn workspace @kaibase/db test
yarn workspace @kaibase/web test -- --run src/features/qa/QAInterface.test.tsx

# Database
yarn db:generate                        # Generate Drizzle migration from schema changes
yarn db:migrate                         # Run pending migrations
yarn db:seed                            # Seed default collections, policies
```

## Monorepo Structure

```
kaibase/
├── apps/
│   ├── web/            # React 19 + Vite 7.2.7 + BlockSuite (main app)
│   ├── api/            # Hono API server (REST, middleware stack)
│   ├── workers/        # BullMQ workers (ai-ingest, compile, query, lint, graph, notify)
│   └── mcp-server/     # MCP server (Phase 1)
├── packages/
│   ├── shared/         # @kaibase/shared — Types, Zod schemas, utilities
│   ├── db/             # @kaibase/db — Drizzle ORM schema + migrations
│   ├── ai/             # @kaibase/ai — LLM provider adapters, versioned prompts
│   ├── policy/         # @kaibase/policy — Policy engine (4 outcomes)
│   ├── connectors/     # @kaibase/connectors — Source connector implementations
│   └── editor/         # @kaibase/editor — BlockSuite setup + custom lwc:* blocks
└── docker/             # Docker Compose configs + Dockerfiles
```

All packages use `@kaibase/` scope. Workspace commands: `yarn workspace @kaibase/<name> <script>`.

## Architecture Rules (must follow)

1. **BlockSuite MPL 2.0 — NEVER modify source files.** Custom blocks go in NEW files under `packages/editor/src/blocks/` with `lwc:*` namespace. Using `affine:*` standard blocks is fine. Modifying BlockSuite triggers copyleft.

2. **Policy Engine governs ALL AI writes.** Every AI-generated creation/update passes through the Policy Engine. Four outcomes: `AUTO_PUBLISH`, `DRAFT_ONLY`, `REVIEW_REQUIRED`, `BLOCKED`. No AI write bypasses policy.

3. **Raw sources are immutable.** Once ingested, source content is never modified. Only `status` field changes.

4. **Activity log is append-only.** Insert-only. No updates or deletes on activity events.

5. **All queries include `workspace_id`.** Complete tenant isolation at DB level. Never write a query without workspace scoping.

6. **Graph is derived, not canonical.** Relationships are read-only, computed async from page/entity/citation data. Never treat graph as source of truth.

7. **Connected sources, not uploads.** Primary model is connected folders/storage. Upload is a fallback. Don't design features assuming upload-first.

8. **AI writing levels: L0 → L1 → L2.** Phase 0: L0 (full page gen + diff). Phase 1: L1 (section patch). Phase 2: L2 (surgical CRDT block update). Never implement a higher level before the lower one is proven.

9. **No AFFiNE product code.** No AFFiNE server, desktop, cloud sync, or MCP dependency. All custom.

10. **Auth/RBAC is external.** Auth is a separate service layer. Never embed auth logic in the AI compiler or editor.

## Coding Conventions

### TypeScript
- Strict mode. No `any` — use `unknown` with type guards
- `interface` for object shapes, `type` for unions/intersections
- Zod schemas for runtime validation; derive types via `z.infer<>`
- Explicit return types on exported functions

### API Design
- REST: `POST /api/v1/workspaces/:wid/resources`
- Request validation with Zod
- Structured errors with error codes + i18n message keys (backend returns keys, not strings)
- Cursor-based pagination preferred

### Database
- Drizzle ORM only. UUIDs for all PKs
- Transactions for multi-table operations
- All queries include `workspace_id` filter

### Styling (main app)
- vanilla-extract with design tokens in `theme/tokens.css.ts`
- Co-located `*.css.ts` files. **No Tailwind, no Twind**

### i18n
- All user-facing strings: `t('namespace.key')` via react-i18next
- EN + KO translation files required for every feature
- 8 namespaces: common, pages, qa, reviews, graph, settings, notifications, errors

### Testing
- Co-located test files: `*.test.ts` or `*.spec.ts`
- Vitest for unit/integration, Playwright for E2E, @testing-library/react for components

### Background Jobs
- BullMQ queues: `ai-ingest`, `ai-page-compile`, `ai-query`, `ai-lint`, `ai-channel`, `graph-recompute`, `notification-send`
- All job handlers must be idempotent (safe to retry)

### AI/LLM
- All LLM calls through provider adapter in `packages/ai`
- Prompts versioned as templates in `packages/ai/src/prompts/`
- Token usage tracked per call. Retry with exponential backoff

## File Naming

```
components/    PascalCase.tsx + PascalCase.css.ts
hooks/         useCamelCase.ts
utils/         camelCase.ts
api/routes/    kebab-case.ts
db/schema/     kebab-case.ts
locales/       namespace.json
```

## Key Domain Terms

| Term | Meaning |
|------|---------|
| Source | Immutable reference to raw material (file, URL, email, message) |
| Source Connector | Registered connection to external storage (local folder, Drive, S3) |
| Canonical Page | AI-compiled knowledge page — the "wiki" page |
| Collection | Page group (Inbox, Projects, Entities, Concepts, Briefs, Review Queue, Knowledge Index, Activity Log) |
| Entity / Concept | Named entity (person, org, product) / abstract topic |
| Citation | Link between page block and source evidence |
| Review Task | Human review request for AI-generated content |
| Policy Pack | Workspace rules governing AI automation (4 outcomes) |
| Compilation Trace | AI reasoning record for page create/update |
| Confidence Decay | Block freshness tracking — blocks become "stale" over time |
| L0 / L1 / L2 | AI writing levels: full regen / section patch / surgical block update |

## Phase Roadmap

- **Phase 0a (current):** True MVP — connect folder → AI compile → review → publish
- **Phase 0b:** Q&A, collections, search, templates, health dashboard
- **Phase 1:** Cloud connectors, Slack/Discord/email, graph view, lint, MCP server, digests
- **Phase 2:** L1/L2 AI updates, conflict resolution, auto-promotion, advanced lint

## Block Snapshot Pipeline

```
Y.Doc (live CRDT) → debounce 3s → extract block tree → INSERT page_block_snapshot (JSONB, versioned)
  → emit to BullMQ: search-reindex, graph-recompute, ai-lint-check
```

This enables block-level search, structural queries, and surgical AI updates.

## Docker Compose (local dev)

```bash
yarn docker:up   # pgvector/pgvector:pg18 on :5432, redis:8.6 on :6379, minio on :9000/:9001
```

DB credentials: `lwc / lwc_dev / kaibase`. MinIO: `lwc_minio / lwc_minio_dev`.
