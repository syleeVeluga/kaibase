# Implementation Plan — Kaibase

> Status: Draft  
> Last Updated: 2026-04-13

---

## Phase Overview

| Phase | Name | Duration (est.) | Focus |
|-------|------|-----------------|-------|
| **Phase 0a** | True MVP | 5-6 weeks | Connect folder → AI compile → review → publish. The minimum path to demonstrate core value. |
| **Phase 0b** | Core Completion | 4-5 weeks | Q&A, collections, global search, activity log, basic templates, knowledge health |
| **Phase 1** | Channels & Graph | 6-8 weeks | Cloud connectors, email/Slack/Discord, graph view, lint, digests, MCP |
| **Phase 2** | Advanced | 6-8 weeks | Advanced lint, auto-promotion, surgical AI updates (L1/L2), conflict resolution, channel write-back |

> **Key constraint:** Phase 0a is aggressively scoped to deliver the core "connect → compile → review → publish" loop as fast as possible. All polish, advanced features, and external integrations are deferred. Phase 0a is the minimum needed to validate the product thesis with real users.
>
> **AI writing strategy:** Phase 0a/0b use L0 (full page generation + diff review). Section-level patch (L1) comes in Phase 1. Surgical block update (L2) is Phase 2+.

---

## Phase 0a: True MVP — "Connect → Compile → Review → Publish"

> **Goal:** A user connects a folder, AI compiles pages, user reviews and publishes. This is the minimum viable accumulation loop.

### Sprint 0a.1 — Project Scaffold & Infrastructure (Week 1-2)

**Goal:** Monorepo setup, database schema, CI/CD, development environment.

| Task | PRD Reference | Details |
|------|--------------|---------|
| Initialize monorepo with Yarn 4 workspaces | [Architecture](../prd/01-architecture.md) | See [Monorepo Structure](./03-monorepo-structure.md) |
| Set up Vite + React + TypeScript for web app | [Frontend](../prd/14-frontend.md) | Vite 7.2.7, React 19.2, TS 6.0.2 |
| Set up vanilla-extract theming (minimal) | [Frontend](../prd/14-frontend.md) | Design tokens, global styles |
| Set up i18n framework (react-i18next) | [i18n](../prd/15-i18n.md) | EN-first + KO base translations |
| Set up Hono API server | [Architecture](../prd/01-architecture.md) | Hono 4.12.x |
| Set up Drizzle ORM + PostgreSQL schema | [Data Model](../prd/02-data-model.md) | Core tables only |
| Set up Redis + BullMQ | [Architecture](../prd/01-architecture.md) | Queue infrastructure |
| Set up pgvector extension | [Architecture](../prd/01-architecture.md) | Vector search |
| Docker Compose for local dev | [Architecture](../prd/01-architecture.md) | Postgres + Redis + MinIO |
| CI pipeline (lint, type-check, test) | — | GitHub Actions |

### Sprint 0a.2 — Auth & Source Connectors (Week 3-4)

**Goal:** Users can register, land on the dashboard with a ready workspace, and connect a local folder.

| Task | PRD Reference | Details |
|------|--------------|---------|
| User registration (email/password) | [Auth](../prd/13-auth-rbac.md) | bcrypt, JWT, bootstrap first workspace |
| OAuth login (Google) | [Auth](../prd/13-auth-rbac.md) | OAuth 2.0 flow |
| JWT auth middleware | [Auth](../prd/13-auth-rbac.md) | Access + refresh tokens |
| Workspace CRUD (minimal) | [Auth](../prd/13-auth-rbac.md) | Auto-provision initial workspace, basic settings, additional workspace creation |
| **Local folder connector** | [Source Vault](../prd/03-source-vault.md) | User configures folder path; system watches for files |
| **File upload fallback** | [Source Vault](../prd/03-source-vault.md) | Drag-and-drop for ad-hoc files (up to 100MB) |
| URL submission endpoint | [Source Vault](../prd/03-source-vault.md) | Fetch + store |
| File parsing pipeline (PDF, DOCX, TXT, MD) | [Source Vault](../prd/03-source-vault.md) | Text extraction |
| Content deduplication (SHA-256) | [Source Vault](../prd/03-source-vault.md) | Prevent duplicates |
| Source connector management UI | [Frontend](../prd/14-frontend.md) | Add folder path, see sync status |
| **Progressive onboarding flow** | [Frontend](../prd/14-frontend.md) | Dashboard-first empty state → connect → watch → explore |

**Implementation Status Snapshot (Apr 2026)**

- Email/password registration now auto-provisions the user's first workspace, owner membership, and default policy pack in the same transaction, so first login no longer blocks on a separate workspace setup screen.
- The web app now routes authenticated users directly to the dashboard. If a user somehow has no workspace, the dashboard provides the first-workspace creation empty state instead of a dedicated `/setup` page.
- Markdown web upload now works end-to-end for the Phase 0 fallback path: `POST /sources/upload` stores the source, enqueues parse, extracts `content_text`, and advances the source to `processed` before downstream classification.
- The workers runtime now uses one dispatcher worker per BullMQ queue (`ai-ingest`, `ai-page-compile`) so jobs are routed by `job.name` instead of being silently consumed by the wrong worker on a shared queue.
- Focused regression coverage now exists for the markdown upload contract in the API route and for uploaded file materialization in the parse worker.
- **Default collections (Inbox, Projects, Entities, Concepts, Briefs, Review Queue, Knowledge Index, Activity Log) are now auto-seeded inside the workspace creation transaction** — no separate `yarn db:seed` step required for new workspaces. `DEFAULT_COLLECTIONS` is the single canonical definition in `packages/db/src/collections.ts`; `seed.ts` now imports it and remains available for backfilling existing workspaces.
- Inbox and Sources pages now poll for source-status updates (3 s while any source is `pending`/`processing`) and page creation (5 s while sources are active or pages list is empty). Reviews page polls while any review is `pending`. This replaces the previous manual-refresh-only approach.
- Still pending for broader Source Vault completeness: object-storage-backed direct uploads, URL fetch reliability, attachment/download endpoints, source version APIs, and automated connector change detection.

### Sprint 0a.3 — AI Compiler & Policy (Week 4-5)

**Goal:** AI creates pages from connected sources. Policy engine governs with sensible defaults.

| Task | PRD Reference | Details |
|------|--------------|---------|
| Default policy pack creation | [Policy Engine](../prd/05-policy-engine.md) | Auto-created for new workspaces |
| Policy evaluation engine (basic) | [Policy Engine](../prd/05-policy-engine.md) | Rule matching, 4 outcomes |
| AI classification worker (BullMQ) | [AI Compiler](../prd/04-ai-compiler.md) | Source type, section, topic |
| AI summarization worker | [AI Compiler](../prd/04-ai-compiler.md) | EN-first summaries |
| AI entity/concept extraction worker | [AI Compiler](../prd/04-ai-compiler.md) | NER + concept extraction |
| **AI page creation worker (L0: full generation)** | [AI Compiler](../prd/04-ai-compiler.md) | Generate full page → BlockSuite blocks |
| Citation attachment logic | [AI Compiler](../prd/04-ai-compiler.md) | Link pages to sources |
| Embedding generation (pgvector) | [Knowledge Pages](../prd/06-knowledge-pages.md) | For semantic search |
| LLM provider adapter (OpenAI + Anthropic) | [AI Compiler](../prd/04-ai-compiler.md) | Configurable per workspace |

### Sprint 0a.4 — Pages, Review & Publish (Week 5-6)

**Goal:** Users can view AI-generated pages, review them, and publish. Minimum viable editor.

| Task | PRD Reference | Details |
|------|--------------|---------|
| BlockSuite PageEditor integration | [Frontend](../prd/14-frontend.md) | @blocksuite/presets 0.19.5 |
| Page CRUD API | [Knowledge Pages](../prd/06-knowledge-pages.md) | Create, read, update, publish |
| Y.Doc storage (single-user for now) | [Knowledge Pages](../prd/06-knowledge-pages.md) | Yjs 13.6.30, sync deferred to 0b |
| **Block snapshot pipeline** | [Knowledge Pages](../prd/06-knowledge-pages.md) | Y.Doc → JSONB (debounced) |
| Page list UI (basic) | [Frontend](../prd/14-frontend.md) | List with type/status filter |
| Custom `lwc:citation` block | [Knowledge Pages](../prd/06-knowledge-pages.md) | Minimal: inline citation with source link |
| Review task creation (from policy) | [Review Queue](../prd/08-review-queue.md) | Auto-created for REVIEW_REQUIRED |
| Review task API (list, approve, reject) | [Review Queue](../prd/08-review-queue.md) | Basic CRUD |
| **Review queue UI with diff view** | [Frontend](../prd/14-frontend.md) | Task list + page diff for updates |
| Publish/archive actions | [Knowledge Pages](../prd/06-knowledge-pages.md) | Status transitions |
| **Inbox UI** | [Frontend](../prd/14-frontend.md) | Show ingested sources + generated pages |
| Navigation sidebar (minimal) | [Frontend](../prd/14-frontend.md) | Inbox, Pages, Reviews, Sources |

> **Phase 0a deliverable:** User connects a folder → AI compiles pages → user reviews in diff view → publishes. The core accumulation loop is running.

---

## Phase 0b: Core Completion

> **Goal:** Add Q&A, collections, search, activity log, templates, and knowledge health to complete the Phase 0 product.

### Sprint 0b.1 — Q&A & Answer Promotion (Week 7-8)

| Task | PRD Reference | Details |
|------|--------------|---------|
| Q&A ask endpoint | [Q&A Service](../prd/07-qa-service.md) | Hybrid search + LLM answer |
| Q&A citation generation | [Q&A Service](../prd/07-qa-service.md) | Answer with sources |
| **Canonical-only resolution tracking** | [Q&A Service](../prd/07-qa-service.md) | Track whether raw source fallback was needed |
| Answer promotion (save as page) | [Q&A Service](../prd/07-qa-service.md) | One-click save with compilation trace |
| Q&A chat UI | [Frontend](../prd/14-frontend.md) | Chat interface |
| **Onboarding step 3** | [Frontend](../prd/14-frontend.md) | "Ask a question about your documents" |

### Sprint 0b.2 — Collections, Search & Activity (Week 8-9)

| Task | PRD Reference | Details |
|------|--------------|---------|
| Default collections creation per workspace | [Knowledge Pages](../prd/06-knowledge-pages.md) | 8 default collections |
| Collection CRUD API | [Knowledge Pages](../prd/06-knowledge-pages.md) | List, create, add pages |
| Collection sidebar navigation | [Frontend](../prd/14-frontend.md) | Tree structure |
| **Global search (Cmd+K) — server-side merge** | [Frontend](../prd/14-frontend.md) | tsvector + pgvector, merged server-side |
| Activity event logging (all event types) | [Activity Log](../prd/10-activity-log.md) | Append-only events |
| Activity log API + UI | [Activity Log](../prd/10-activity-log.md) | Timeline view |
| Web app notification center | [Channel Output](../prd/11-channel-output.md) | In-app notifications |

### Sprint 0b.3 — Templates, Health & Polish (Week 9-10)

| Task | PRD Reference | Details |
|------|--------------|---------|
| **Page template CRUD** | [AI Compiler](../prd/04-ai-compiler.md) | Define templates with section structure |
| **Template-driven compilation** | [AI Compiler](../prd/04-ai-compiler.md) | AI uses template when trigger conditions match |
| Template editor UI | [Frontend](../prd/14-frontend.md) | Settings → Templates |
| **Knowledge Health Dashboard** | [Frontend](../prd/14-frontend.md) | Workspace-level metrics panel |
| Custom `lwc:entity-mention` block | [Knowledge Pages](../prd/06-knowledge-pages.md) | Auto-linked entity reference |
| Custom `lwc:review-status` block | [Knowledge Pages](../prd/06-knowledge-pages.md) | Page review status indicator |
| Y.Doc real-time sync (multi-user) | [Knowledge Pages](../prd/06-knowledge-pages.md) | Custom WebSocket provider |
| Policy settings UI | [Frontend](../prd/14-frontend.md) | Rule editor (basic) |
| Workspace membership & roles | [Auth](../prd/13-auth-rbac.md) | Owner, admin, editor, reviewer, viewer |
| Invitation flow | [Auth](../prd/13-auth-rbac.md) | Email invite |

---

## Phase 1: Connectors, Channels & Graph

### Sprint 1.0 — Cloud Source Connectors

| Task | PRD Reference |
|------|--------------|
| Google Drive connector (OAuth 2.0 + Drive API) | [Source Vault](../prd/03-source-vault.md) |
| S3/GCS connector (IAM credentials + event notifications) | [Source Vault](../prd/03-source-vault.md) |
| Connector sync status dashboard | [Frontend](../prd/14-frontend.md) |
| Change detection and re-processing pipeline | [Source Vault](../prd/03-source-vault.md) |
| AI page update worker (L1: section-level patch) | [AI Compiler](../prd/04-ai-compiler.md) |
| AI quality feedback loop (rejection pattern tracking) | [AI Compiler](../prd/04-ai-compiler.md) |
| Compilation trace storage and viewer | [AI Compiler](../prd/04-ai-compiler.md) |

### Sprint 1.1 — Email Inbound

| Task | PRD Reference |
|------|--------------|
| Workspace email address provisioning | [Channel Output](../prd/11-channel-output.md) |
| Email webhook receiver (SMTP/webhook service) | [Channel Output](../prd/11-channel-output.md) |
| MIME parsing (body, attachments) | [Source Vault](../prd/03-source-vault.md) |
| Email → Source ingest pipeline | [Channel Output](../prd/11-channel-output.md) |
| Email digest outbound (Nodemailer) | [Channel Output](../prd/11-channel-output.md) |

### Sprint 1.2 — Slack & Discord Inbound

| Task | PRD Reference |
|------|--------------|
| Slack bot setup + Events API listener | [Channel Output](../prd/11-channel-output.md) |
| Slack message → Source pipeline | [Channel Output](../prd/11-channel-output.md) |
| Discord bot setup + event listener | [Channel Output](../prd/11-channel-output.md) |
| Discord message → Source pipeline | [Channel Output](../prd/11-channel-output.md) |
| Slack/Discord outbound summary messages | [Channel Output](../prd/11-channel-output.md) |
| Channel endpoint management UI | [Frontend](../prd/14-frontend.md) |

### Sprint 1.3 — Graph View

| Task | PRD Reference |
|------|--------------|
| Graph computation worker (BullMQ) | [Graph Service](../prd/09-graph-service.md) |
| GraphNode/GraphEdge materialization | [Graph Service](../prd/09-graph-service.md) |
| Graph query API | [Graph Service](../prd/09-graph-service.md) |
| react-force-graph visualization UI | [Graph Service](../prd/09-graph-service.md) |
| Graph filtering and subgraph focus | [Graph Service](../prd/09-graph-service.md) |

### Sprint 1.4 — Basic Lint (Health Check)

> **Why Phase 1?** Linting is one of Karpathy's 3 core operations (Ingest / Query / **Lint**). Without lint, the knowledge space degrades over time — orphan pages accumulate, contradictions go undetected, and the accumulation loop has no quality floor. Basic lint must run before the knowledge base grows too large to clean up.

| Task | PRD Reference |
|------|--------------|
| Lint worker scaffold (BullMQ scheduled) | [AI Compiler](../prd/04-ai-compiler.md) |
| Orphan page detection (no citations, no incoming links) | [AI Compiler](../prd/04-ai-compiler.md) |
| Duplicate page detection (substantially same topic) | [AI Compiler](../prd/04-ai-compiler.md) |
| Contradiction detection (conflicting claims across pages) | [AI Compiler](../prd/04-ai-compiler.md) |
| Missing citation detection (claims without source backing) | [AI Compiler](../prd/04-ai-compiler.md) |
| Lint findings → ReviewTask creation | [Review Queue](../prd/08-review-queue.md) |
| Lint run schedule config in Policy Pack | [Policy Engine](../prd/05-policy-engine.md) |

### Sprint 1.5 — MCP Server

| Task | PRD Reference |
|------|--------------|
| MCP server scaffold (@modelcontextprotocol/sdk) | [MCP Server](../prd/12-mcp-server.md) |
| Read tools implementation | [MCP Server](../prd/12-mcp-server.md) |
| Write tools implementation (policy-governed) | [MCP Server](../prd/12-mcp-server.md) |
| MCP credential management API + UI | [MCP Server](../prd/12-mcp-server.md) |
| MCP activity logging | [MCP Server](../prd/12-mcp-server.md) |

### Sprint 1.6 — Digest System

| Task | PRD Reference |
|------|--------------|
| Digest configuration CRUD | [Channel Output](../prd/11-channel-output.md) |
| Digest generation worker (BullMQ scheduled) | [Channel Output](../prd/11-channel-output.md) |
| Digest formatting (EN/KO) | [Channel Output](../prd/11-channel-output.md) |
| Digest delivery to channels | [Channel Output](../prd/11-channel-output.md) |

---

## Phase 2: Advanced

| Feature | PRD Reference |
|---------|--------------|
| **AI page update worker (L2: surgical block update)** | [AI Compiler](../prd/04-ai-compiler.md) |
| **Confidence decay & freshness scoring** | [Knowledge Pages](../prd/06-knowledge-pages.md) |
| **Conflict resolution UI** | [Graph Service](../prd/09-graph-service.md) |
| Advanced lint — stale claim detection, hub overload, graph isolation, missing cross-links | [AI Compiler](../prd/04-ai-compiler.md) |
| Answer auto-promotion (policy-driven) | [Q&A Service](../prd/07-qa-service.md) |
| Channel write-back automation | [Channel Output](../prd/11-channel-output.md) |
| Dropbox / OneDrive connectors | [Source Vault](../prd/03-source-vault.md) |
| Desktop wrapper (Electron) with local folder watcher | — |
| On-premise package draft | — |
| EdgelessEditor integration for briefs | [Frontend](../prd/14-frontend.md) |
| Advanced policy DSL | [Policy Engine](../prd/05-policy-engine.md) |
| BM25 + dense fusion search (ParadeDB/pg_bm25) | [Knowledge Pages](../prd/06-knowledge-pages.md) |

---

## Cross-Cutting Concerns (All Phases)

| Concern | Approach |
|---------|----------|
| **Testing** | Vitest for unit/integration. Playwright for E2E. |
| **Error handling** | Structured error codes, i18n message keys |
| **Logging** | Structured JSON logging (pino) |
| **Monitoring** | Health check endpoints, metrics export |
| **Security** | OWASP best practices, input validation (Zod), rate limiting |
| **Accessibility** | WCAG 2.1 AA for web UI |
| **Legal** | BlockSuite MPL 2.0 compliance: no source modification, custom blocks in separate files, `lwc:*` namespace. AFFiNE product code excluded. License audit in Sprint 0.1. |

---

## Related Documents

- [Stack Versions](./01-stack-versions.md)
- [Claude Code Instructions](./02-claude-code-instructions.md)
- [Monorepo Structure](./03-monorepo-structure.md)
