# Claude Code Instructions — Kaibase

> Copy this file into your Claude Code project instructions, Cursor rules, or Codex system prompt.  
> Last Updated: 2026-04-11

---

## Project Context

Kaibase is a BlockSuite-based, policy-driven AI knowledge operating system — positioned as a NotebookLM-like product for B2B teams. Users **connect their existing folders and storage** (local folders, Google Drive, S3) and the AI compiles documents into persistent, evolving knowledge pages. Upload is a secondary fallback. AI classifies, summarizes, connects, and reviews content according to workspace policies, accumulating organized pages in a custom knowledge space powered by BlockSuite (MPL 2.0, used as-is) and Yjs (MIT). No AFFiNE product code is used.

## Stack Versions

Use the following stack versions unless explicitly told otherwise:

```
Runtime:
- Node 24.14.1 LTS
- Yarn 4.13.0

Frontend:
- React 19.2.x
- TypeScript 6.0.2
- Vite 7.2.7 for the main web app (BlockSuite compatibility)
- Vite 8.0.5 for standalone admin/marketing apps only
- @vanilla-extract/css 1.18.0
- @vanilla-extract/vite-plugin 5.0.0
- @tanstack/react-query 5.97.0
- Zod 4.3.6
- react-i18next for internationalization

Editor / Collaboration:
- @blocksuite/presets 0.19.5
- @blocksuite/blocks 0.19.5
- @blocksuite/store 0.19.5
- Yjs 13.6.30

Backend:
- Hono 4.12.x
- Drizzle ORM 0.45.2
- PostgreSQL 18.3
- Redis 8.6.2
- BullMQ 5.69.3
- pgvector (node) 0.2.1

AI:
- OpenAI SDK 6.33.0
- Anthropic SDK 0.86.1

Testing:
- Vitest 4.0.x
- Playwright for E2E
```

## Architecture Rules

1. **BlockSuite is for document surface only (MPL 2.0, unmodified).** Never put business logic in the editor layer. The editor renders and edits pages; all intelligence, routing, and policy enforcement live in the backend. **CRITICAL: Never modify BlockSuite source files** — this triggers MPL 2.0 copyleft obligations. Custom blocks go in new files under `packages/editor/src/blocks/` with `lwc:*` namespace.

2. **AUTH and RBAC are external.** Authentication and authorization are a separate service layer. Never embed auth logic in the AI compiler or document editor.

3. **Graph view is a separate service/UI.** The graph is derived from page/entity/citation relationships. It is read-only and computed asynchronously. Never treat graph as canonical truth.

4. **LLM Wiki compiler logic is custom.** AI classification, summarization, entity extraction, page compilation — all custom implementation. No AFFiNE product code dependency anywhere.

5. **Policy Engine governs all AI writes.** Every AI-generated page creation, update, or classification must pass through the Policy Engine before execution. Four outcomes: AUTO_PUBLISH, DRAFT_ONLY, REVIEW_REQUIRED, BLOCKED.

6. **Raw sources are immutable.** Once a source is ingested, its content is never modified. Only the `status` field changes.

7. **Activity log is append-only.** All events are insert-only. No updates or deletes on activity events.

8. **Prefer exact version pinning** in package.json for generated code.

9. **Connected sources, not uploaded blobs.** Primary source model is connected folders/storage. Users point Kaibase at where they already keep documents. Upload is a fallback for ad-hoc files. Never design features that assume "upload" as the primary ingest path.

10. **Phase 0a = true MVP.** Phase 0a (connect → compile → review → publish) must ship first. Phase 0b adds Q&A, collections, search, templates, and health dashboard. External integrations (Slack, Discord, email, MCP, cloud connectors) are Phase 1. Design internal service interfaces so Phase 1 adapters are thin wrappers.

11. **AI writing levels: L0 → L1 → L2.** Phase 0a/0b use L0 (full page generation + diff review). Phase 1 introduces L1 (section-level patch). Phase 2 introduces L2 (surgical block update via CRDT operations). Never implement L2 before L1 is proven stable.

## Monorepo Structure

```
kaibase/
├── apps/
│   ├── web/            # Main React web app (Vite 7.2.7 + BlockSuite MPL 2.0)
│   ├── api/            # Hono API server
│   └── workers/        # BullMQ worker processes
├── packages/
│   ├── shared/         # Shared types, schemas, utilities (Zod)
│   ├── db/             # Drizzle ORM schema and migrations
│   ├── ai/             # LLM provider adapters and prompt management
│   ├── policy/         # Policy engine core logic
│   ├── connectors/     # Source connector implementations (local folder, Drive, S3)
│   └── editor/         # BlockSuite integration + custom lwc:* blocks (separate files)
├── docker/
│   └── docker-compose.yml
├── .github/
│   └── workflows/
├── package.json        # Root workspace config
├── yarn.lock
├── .yarnrc.yml
├── .nvmrc
└── tsconfig.base.json
```

## Coding Conventions

### TypeScript
- Strict mode enabled
- Use `interface` for object shapes, `type` for unions/intersections
- Use Zod schemas for runtime validation; derive TypeScript types from Zod with `z.infer<>`
- No `any` types — use `unknown` with type guards
- Explicit return types on exported functions

### API Design
- RESTful endpoints following: `POST /api/v1/workspaces/:wid/resources`
- Request validation with Zod
- Structured error responses with error codes and i18n message keys
- Pagination: cursor-based preferred, offset-based acceptable
- All responses include proper HTTP status codes

### Database
- Drizzle ORM for all database operations
- Migration files for schema changes (drizzle-kit)
- All queries include `workspace_id` filter for tenant isolation
- Use database transactions for multi-table operations
- UUIDs for all primary keys

### Styling
- Main app: vanilla-extract with design tokens
- Component styles: `*.css.ts` files co-located with components
- Design tokens in `theme/tokens.css.ts`
- No Tailwind in the main web app
- No Twind anywhere

### i18n
- All user-facing strings use i18n keys, never hardcoded
- Format: `t('namespace.key')` with react-i18next
- Both English and Korean translation files required for every new feature
- English is the source language; Korean translations maintained in parallel
- Backend returns message keys, not translated strings

### Testing
- Unit tests with Vitest for business logic and utilities
- Integration tests for API endpoints
- Component tests with @testing-library/react
- E2E tests with Playwright for critical user flows
- Test files co-located: `*.test.ts` or `*.spec.ts`

### AI/LLM
- All LLM calls go through the provider adapter in `packages/ai`
- Prompts are versioned and stored as templates
- All LLM calls include workspace context (language, tone, terminology)
- Token usage is tracked per call for cost attribution
- Retry with exponential backoff on provider errors
- Support multiple providers with fallback chain

### Background Jobs
- BullMQ for all async processing
- Named queues per domain: `ai-ingest`, `ai-page-compile`, `ai-query`, `ai-lint`, `ai-channel`, `graph-recompute`, `notification-send`
- Idempotent job handlers (safe to retry)
- Job results stored for auditability

## File Naming Conventions

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
| Source | Immutable reference to raw material (connected file, URL, email, message) |
| Source Connector | Registered connection to an external storage location (local folder, Drive, S3) |
| Source Vault | Reference + extracted content storage for all sources |
| Canonical Page | AI-compiled knowledge page (the "wiki" page) |
| Collection | Group of pages (Inbox, Projects, Entities, etc.) |
| Entity | Named entity (person, org, product, technology) |
| Concept | Abstract topic or theme |
| Citation | Link between a page and its source evidence |
| Review Task | Human review request for AI-generated content |
| Policy Pack | Workspace rules governing AI automation |
| Page Template | User-defined structure that guides AI page generation |
| Compilation Trace | Record of AI reasoning for page creation/update decisions |
| Confidence Decay | Mechanism tracking block freshness — blocks become "stale" over time |
| Knowledge Index | Catalog of all canonical pages |
| Knowledge Health Dashboard | Workspace-level metrics panel for knowledge quality |
| Activity Event | Append-only audit log entry |
| Brief | Synthesized summary from multiple sources |
| Answer Page | Promoted Q&A answer saved as canonical page |
| Graph Node/Edge | Derived relationship data |
| Digest | Periodic summary sent to channels |
| L0 / L1 / L2 | AI writing maturity levels: L0=full page regen, L1=section patch, L2=surgical block update |
