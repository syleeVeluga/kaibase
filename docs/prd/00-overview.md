# PRD-00: Kaibase — Product Overview

> Version: 0.1  
> Last Updated: 2026-04-11  
> Status: Draft  
> Language: English (primary) / Korean (secondary — localization foundation)

---

## Product Name (Working Title)

**Kaibase**

**Subtitle:** BlockSuite-based, policy-driven AI knowledge operating system

---

## One-Line Definition

An AI-native productivity workspace — a Notion-class page/block editor where the AI acts as the primary author, keeping every page current as new information flows in.

> **What this means in practice:** Users work in familiar block-based pages (write, embed, collaborate). The difference is that AI continuously compiles raw sources into those pages, answers questions by writing new pages, and keeps the knowledge space healthy via linting — all governed by workspace policy. Karpathy's "LLM Wiki" loop, applied to a real productivity surface.

---

## Problem Statement

Most "document-based AI" tools today retrieve file fragments on every query. This is fast but knowledge does not accumulate — good analyses scatter and vanish in chat threads. Teams cannot maintain and organize information scattered across Slack, email, meeting notes, external links, and document files over the long term.

Andrej Karpathy identifies the root cause precisely: **"The tedious part of knowledge management is not reading or thinking — it is bookkeeping."** Cross-referencing dozens of pages, maintaining consistency, detecting contradictions, updating stale claims — humans abandon this under the burden. LLMs do it natively.

### B2B Pain Points (from field experience)

Our existing B2B engagements reveal recurring customer demands that no current tool solves well:

1. **"How do I turn my documents into knowledge?"** — Customers have vast document archives (contracts, reports, specs, meeting notes) but no path to structured, searchable knowledge. They want documents to *become* knowledge automatically.
2. **"How can I get better embeddings / better answers?"** — RAG-only products frustrate users with shallow retrieval. Customers want curated, AI-organized knowledge pages — not raw chunk retrieval.
3. **"Can it work like ChatGPT but only on our data?"** — Teams want conversational AI scoped to their private knowledge, with answers that improve over time (not one-shot).
4. **"We want to manage only our own knowledge."** — Enterprise teams need workspace-isolated, governed knowledge spaces — not shared public models.

Kaibase solves bookkeeping by making AI the primary author of the knowledge space. Humans set direction, ask questions, and approve critical changes. AI handles the rest — and every output loops back to enrich the wiki further, creating **compounding knowledge growth**.

---

## Product Vision

This product is not "chat with files." It is a **knowledge compiler with a closed accumulation loop**.

```
Raw Sources → [Ingest] → [LLM Compile] → Canonical Wiki
                                               ↑         ↓
                                         [Re-deposit] [Q&A / Output]
                                               ↑         ↓
                                            [Lint]  [Answer Pages]
```

Every loop through this cycle makes the wiki richer. New sources compile into pages. Q&A answers that are valuable get saved as pages. Lint identifies gaps and stale content. Each iteration compounds on the last — this is the **compounding knowledge effect** Karpathy describes.

The concrete design choices:
- Raw materials live where the user already keeps them — connected folders, cloud storage, or direct upload. Originals are never modified (Source Vault — immutable references).
- AI maintains the living wiki (Canonical Pages — LLM as primary author).
- Governance (Policy Pack) determines what AI can publish autonomously vs. what needs review.
- Users ask questions; AI answers with citations and saves valuable answers back into the wiki.
- The graph is a derived, read-only view.
- AUTH/RBAC is an external layer.

This structure is the SaaS realization of LLM Wiki's raw/wiki/schema pattern, rendered through a custom document UI built on BlockSuite (MPL 2.0), with enterprise-grade governance layered on top.

**Positioning analogy:** Kaibase is to documents what Google NotebookLM is to PDFs — but with persistent, evolving pages instead of ephemeral chat, governed by workspace policy, and designed for team-scale accumulation.

---

## Product Principles

| # | Principle | Description |
|---|-----------|-------------|
| 1 | **Raw source is truth** | Files from connected folders, uploaded files, email originals, Slack/Discord messages, link bodies, attached images are referenced in an immutable source vault. Sources stay where the user keeps them — Kaibase indexes and references, not duplicates. |
| 2 | **Compiled page is working memory** | The primary target for Q&A and search is the AI-organized canonical page, not the raw source. |
| 3 | **Policy before automation** | Every auto-generated write must pass workspace policy first. Policy outcomes: `AUTO_PUBLISH`, `DRAFT_ONLY`, `REVIEW_REQUIRED`, `BLOCKED`. |
| 4 | **Answer is also an asset** | Valuable answers are not one-time responses — they are saved as pages, briefs, or updates, re-deposited back into the wiki. |
| 5 | **Graph is derived, not canonical** | The graph is generated from link/entity/citation relationships. The editing unit is the page, not the graph. |
| 6 | **Editor is the surface, not the brain** | BlockSuite (MPL 2.0) is the document editing surface. AI judgment, channel routing, and policy enforcement are separate custom services. AFFiNE product code (mixed-license) is NOT used. |
| 7 | **Governed Autonomy** | LLM writes freely; schema and policy guarantee quality. Automation scales without sacrificing trust. This is the key differentiator from pure Karpathy (no governance) and from traditional tools (no LLM authorship). |
| 8 | **Closed accumulation loop** | Every system action — ingest, Q&A, lint, output — feeds back into the canonical wiki. The loop must never be broken; even rejected drafts generate lint tasks that improve the knowledge space. |
| 9 | **Connected sources, not uploaded blobs** | Users point Kaibase at their existing folders, cloud storage, or repositories. Sources are watched, indexed, and referenced — not duplicated into a separate vault. This lowers adoption friction and keeps Kaibase in sync with where teams already work. |

---

## Positioning

| | Google NotebookLM | Notion / Confluence | Obsidian | Kaibase |
|---|---|---|---|---|
| **Core model** | Chat over PDFs | Human writes pages | Human writes notes | AI writes pages (governed) |
| **Knowledge persistence** | Ephemeral (per-notebook chat) | Manual pages | Local markdown files | Persistent, auto-evolving pages |
| **Source handling** | Upload PDFs to notebook | Manual paste/link | Web clipper | **Connected folders/storage** + upload + channels |
| **Accumulation** | None (answers vanish) | Manual | Manual + scripts | Automatic (closed loop) |
| **Governance** | None | Permissions only | None | Policy Engine (4 outcomes) |
| **Search** | In-notebook only | Simple backlinks | Local search | PostgreSQL JSON blocks + BM25/dense hybrid |
| **Team scale** | Individual | Team ✓ | Individual | Team ✓ (workspace-isolated) |

**Key differentiator vs. NotebookLM:** NotebookLM produces ephemeral Q&A answers over uploaded files. Kaibase converts those same materials into persistent, evolving knowledge pages that compound over time. Every answer can become a page; every page gets richer with each new source.

**Key differentiator vs. Notion AI:** Notion AI assists a human author. Kaibase's AI *is* the author — humans curate, review, and steer.

---

## Target Users (Initial)

### Primary Segment: B2B Teams with Document-Heavy Knowledge Needs

Teams that have accumulated large document archives and want to turn them into a living, queryable knowledge base — without building custom AI pipelines.

| Segment | Pain Point | Kaibase Value |
|---------|-----------|---------------|
| **Consulting / Professional Services** | Client deliverables scattered across folders; onboarding new team members takes weeks | Connect project folders → AI compiles structured knowledge pages per client/project |
| **R&D / Engineering Teams** | Research papers, specs, meeting notes never synthesized into actionable knowledge | Connect Confluence/Drive folders → AI maintains entity/concept/project pages |
| **Legal / Compliance** | Regulatory documents, contracts, policies require constant cross-referencing | Connect document repositories → AI tracks contradictions, maintains current-state pages |
| **Startup Ops** | PRDs, customer feedback, competitive intel scattered across Slack, email, Google Drive | Connect existing tools → AI auto-compiles and keeps everything current |

### Secondary Segment: Individual Knowledge Workers

Users similar to Google NotebookLM's audience — researchers, students, analysts — who want persistent, evolving knowledge from their documents, not just one-shot Q&A.

### Expansion Path: Agent-Enabled Teams

Teams using IDE/coding agents that want AI output auto-accumulated as page assets via MCP (Phase 1+).

---

## Core Jobs-To-Be-Done (JTBD)

1. "I want to **connect my existing folders** (local, Google Drive, S3, etc.) and have AI automatically organize them into structured knowledge pages."
2. "When new documents appear in my connected folders, I want AI to **automatically update** the relevant knowledge pages."
3. "When I ask a question, I don't just want a one-time answer — I want it **saved as a page** so team knowledge improves."
4. "I want my knowledge base to work **only on our data**, with full workspace isolation and governance."
5. "I want content from Slack/Discord/Email accumulated in the wiki, with important items sent to a review queue." (Phase 1)
6. "I want external AI tools and coding agents to read my knowledge space via MCP and leave drafts when needed." (Phase 1+)

---

## Karpathy LLM Wiki Mapping

### 3-Layer Architecture

| LLM Wiki Layer | Owner | Kaibase Equivalent |
|----------------|-------|-------------------|
| **Raw Sources** | Human (immutable) | **Source Vault** — connected folders (local, Google Drive, S3, etc.), URL captures, email originals, messenger messages, MCP inputs. References stay in place; extracted content indexed. Never modified. |
| **Wiki** | LLM (primary author) | **Canonical Pages (BlockSuite block editor)** — Karpathy's "wiki" = our Notion-class pages. Project pages, entity pages, concept pages, briefs, answer pages, comparison tables. LLM is primary author; humans edit, curate, and approve. This is the productivity surface. |
| **Schema** | Human + LLM (co-evolved) | **Policy Pack + AIConfig** — classification rules, approval criteria, page templates, tone/terminology overrides, AI model selection. This is the governance layer. |

### 7-Layer Workflow

| Karpathy Layer | Kaibase Equivalent | Phase |
|----------------|--------------------|-------|
| **1. Data Ingest** | Source Vault + Intake Gateway — web upload, URL, email, Slack, Discord, MCP | Phase 0–1 |
| **2. LLM Compile** | AI Knowledge Compiler — classify, summarize, extract entities, capture source-local relation triples, create/update pages (single source → multiple pages), attach citations | Phase 0 |
| **3. IDE / Viewer** | BlockSuite PageEditor — rich document editing and viewing surface | Phase 0 |
| **4. Q&A** | Q&A Service — hybrid search, cited answers, answer promotion to pages | Phase 0 |
| **5. Output → Re-deposit** | Answer Promotion + Channel Output — valuable outputs saved back as canonical pages; digests sent to channels | Phase 0–1 |
| **6. Linting** | Lint AI — orphan pages, contradictions, stale claims, missing citations, duplicate detection | **Phase 1** |
| **7. Extra Tools** | MCP Server — external agents (IDE, CLI, coding agents) read/write knowledge space via domain tools | Phase 1 |

### Key Artifacts

| LLM Wiki Artifact | Kaibase Equivalent |
|-------------------|--------------------|
| `index.md` | **Knowledge Index Collection** — LLM-maintained catalog of all canonical pages |
| `log.md` | **Activity Log Collection** — append-only record of all ingest, compile, Q&A, lint, review events |
| `CLAUDE.md` / Schema | **Policy Pack + AIConfig** — workspace-level AI instructions, tone, terminology, model selection |

---

## Scope (V1)

### Included

- Web app-based workspace
- **Connected source model** — local folder, Google Drive, S3/cloud storage connectors (Phase 0: local folder + upload; Phase 1: cloud connectors)
- File/URL/text upload (secondary to connected sources)
- Email inbound collection (Phase 1)
- Slack/Discord inbound collection (Phase 1)
- Q&A with citations
- AI auto-classification and page creation/update
- **Template-driven compilation** — user-defined page templates guide AI output structure
- Review queue and approval flow
- BlockSuite-based document/collection surface (custom UI, no AFFiNE product code)
- **Knowledge Health Dashboard** — workspace-level knowledge quality metrics
- Separate graph view
- Separate MCP server
- Audit log and change history
- **Bilingual UI (English-first + Korean)** — EN/KO for localization foundation; English is primary

### Excluded

- On-premise installation package
- AFFiNE product code (server, desktop app, cloud features — all mixed/proprietary license)
- AFFiNE native backend fork
- AFFiNE native MCP write dependency
- Graph as editing source
- Full bidirectional sync with all external systems

---

## Success Metrics

| Metric | Description |
|--------|-------------|
| **Time to first knowledge** | Median time from connecting a folder to the first published page (target: < 5 min) |
| Time to first draft | Median time from source ingest to first canonical draft generation |
| Review approval rate | Approval rate of review-required changes (target: ≥ 70%) |
| **Review rejection learning** | Rejection rate trend over time — should decrease as AI adapts (tracked per workspace) |
| Citation coverage | Percentage of answers with proper citations |
| Canonical-only resolution | Queries resolved using only canonical pages (no raw source fallback) — tracked via `sources_used.raw_sources == 0` |
| Duplicate reduction | Rate of duplicate page reduction over time |
| Workspace retention | 30-day / 90-day workspace retention rate |
| Ingest accuracy | Source classification accuracy |
| Reclassification rate | Percentage of auto-classified items manually moved by users |
| **Loop cycle time** | Time from Q&A answer promotion to page appearing in search (target: < 5 min) |
| **Loop depth** | Average pages updated per promoted answer (target: ≥ 2) |
| **Knowledge freshness** | Average age of page block evidence (confidence decay indicator) |

---

## Cost Model & Pricing Considerations

### LLM Cost Structure

AI compilation is the primary cost driver. Cost must be managed at the architecture level:

| Operation | Model Strategy | Relative Cost |
|-----------|---------------|--------------|
| Classification | Fast/cheap model (e.g., GPT-4o-mini, Haiku) | Low |
| Summarization | Mid-tier model | Medium |
| Page creation/update | Capable model (e.g., GPT-4o, Sonnet) | High |
| Q&A answers | Capable model | High |
| Lint checks | Mid-tier model on schedule | Medium (batch) |
| Embedding generation | Embedding model | Low |

### Cost Control Levers

1. **Fan-out budget per source** — cap at N page updates per ingest (default: 15, configurable)
2. **Model tiering by policy outcome** — use capable model only for `REVIEW_REQUIRED` path; cheaper model for `AUTO_PUBLISH` with high confidence
3. **Workspace-level token budget** — monthly token cap per workspace tier
4. **Batch vs. real-time** — lint and graph recomputation run on schedule, not per-edit
5. **Incremental updates preferred** — update existing pages rather than regenerating from scratch

### Pricing Direction (TBD — requires market validation)

| Tier | Target | Key Limits |
|------|--------|-----------|
| Free | Individual / trial | 1 workspace, 50 sources, 100 AI ops/month |
| Pro | Small team | 3 workspaces, unlimited sources, 2,000 AI ops/month |
| Team | Department | Unlimited workspaces, SSO, 10,000 AI ops/month |
| Enterprise | Organization | Custom limits, on-premise option, SLA |

> **Note:** "AI ops" = one LLM call (classify, summarize, create page, answer, lint check). A single source ingest may consume 5-20 AI ops depending on fan-out.

---

## Key Risks

| # | Risk | Mitigation |
|---|------|------------|
| 1 | **License boundary** | BlockSuite (MPL 2.0) only — used as-is without source modification. AFFiNE product code (MIT+MPL+proprietary mix) is explicitly excluded. See License Compliance section. |
| 2 | **MCP write maturity** | Do not depend on AFFiNE native MCP write. Build custom domain MCP. |
| 3 | **AI auto-write quality** | Strong review queue and provenance UX are critical. **AI quality feedback loop:** track rejection patterns per workspace and adapt prompts/templates accordingly. Phase 0 starts with full-page regeneration + diff review (not surgical block update). |
| 4 | **Channel noise** | Slack/Discord/email inputs have high quality variance. Strong policy/classification/approval system needed. |
| 5 | **Graph over-engineering** | Graph must remain a derived view, never become canonical truth. |
| 6 | **LLM cost at scale** | Fan-out design (10-15 pages per source) is cost-intensive. Mitigated by model tiering, token budgets, and incremental-update-first strategy. See Cost Model section. |
| 7 | **BlockSuite API stability** | BlockSuite v0.19.5 is actively developed with potential breaking changes. Mitigated by version pinning, editor abstraction layer for custom blocks, and contingency plan for editor swap if needed. |
| 8 | **Phase 0 scope creep** | Phase 0 must be aggressively scoped to deliver core value quickly. Split into Phase 0a (true MVP) and 0b. See Implementation Plan. |
| 9 | **First 10-minute experience** | If the onboarding experience doesn't demonstrate value immediately, retention collapses. Mitigated by progressive onboarding: connect a folder → watch AI compile → see first pages in minutes. |

---

## License Compliance Strategy

### Allowed: BlockSuite (MPL 2.0)

BlockSuite is an open-source editor framework licensed under MPL 2.0. The following usage is **license-safe**:

| Usage | Safe? | Reason |
|-------|-------|--------|
| Import `@blocksuite/presets` (PageEditor, EdgelessEditor) | Yes | Using as a dependency without modification |
| Import `@blocksuite/blocks` (AffineSchemas, standard blocks) | Yes | Using as a dependency without modification |
| Import `@blocksuite/store` (Doc, Schema, DocCollection) | Yes | Using as a dependency without modification |
| Using `affine:*` block types (page, note, paragraph, etc.) | Yes | These are BlockSuite's standard blocks, not AFFiNE product code |
| Yjs (MIT license) for CRDT collaboration | Yes | MIT is fully permissive |

### Prohibited: AFFiNE Product Code

AFFiNE (the product) uses a mixed license: MIT + MPL 2.0 + proprietary enterprise license. The following are **excluded from this project**:

| Excluded Component | License | Risk |
|-------------------|---------|------|
| AFFiNE server (`packages/backend/server`) | Proprietary | Self-hosting >10 users requires enterprise license |
| AFFiNE desktop app | Mixed | Includes proprietary components |
| AFFiNE cloud sync/collaboration features | Proprietary | Commercial restrictions |
| AFFiNE-native MCP integration | Proprietary | Dependency on proprietary server |
| AFFiNE-native AI features | Proprietary | Dependency on proprietary server |

### Custom Implementation Required

The following features are built entirely in-house to avoid license entanglement:

| Component | Approach |
|-----------|----------|
| **Collaboration/Sync server** | Custom Y.Doc WebSocket sync provider (Yjs is MIT) |
| **Custom block types** (citation, entity mention, review status) | New files in `packages/editor/` with `lwc:*` namespace — NOT modifications to BlockSuite source files |
| **Collections system** | Custom database model and API — not AFFiNE's collection implementation |
| **Backend API** | Custom Hono API server — no AFFiNE server code |
| **AI pipeline** | Custom workers — no AFFiNE AI features |
| **Auth/RBAC** | Custom implementation — no AFFiNE auth |
| **MCP server** | Custom `@modelcontextprotocol/sdk` server — no AFFiNE MCP |

### MPL 2.0 Compliance Rules

1. **Do NOT modify BlockSuite source files.** If a bug fix or feature requires BlockSuite source changes, contribute upstream via PR. Never ship modified BlockSuite files in this project.
2. **Custom blocks go in separate NEW files.** Custom block definitions (e.g., `lwc:citation`) must be in `packages/editor/src/blocks/` as new files, never as patches to `@blocksuite/blocks`.
3. **Preserve license notices.** Keep MPL 2.0 headers intact in any BlockSuite files bundled in the client build.
4. **Version pin and audit.** Pin BlockSuite to tested versions. Review each upgrade for license changes.

---

## Related Documents

- [PRD-01: Architecture & Stack](./01-architecture.md)
- [PRD-02: Data Model](./02-data-model.md)
- [PRD-03: Source Vault & Ingestion](./03-source-vault.md)
- [PRD-04: AI Knowledge Compiler](./04-ai-compiler.md)
- [PRD-05: Policy Engine](./05-policy-engine.md)
- [PRD-06: Knowledge Pages & Collections](./06-knowledge-pages.md)
- [PRD-07: Q&A Service](./07-qa-service.md)
- [PRD-08: Review Queue](./08-review-queue.md)
- [PRD-09: Graph Service](./09-graph-service.md)
- [PRD-10: Activity Log](./10-activity-log.md)
- [PRD-11: Channel & Notifications](./11-channel-output.md)
- [PRD-12: MCP Server](./12-mcp-server.md)
- [PRD-13: Auth & RBAC](./13-auth-rbac.md)
- [PRD-14: Frontend & UI](./14-frontend.md)
- [PRD-15: i18n Strategy](./15-i18n.md)
- [Implementation Plan](../implementation/00-implementation-plan.md)
- [Stack Version Lock](../implementation/01-stack-versions.md)
- [Claude Code Instructions](../implementation/02-claude-code-instructions.md)
- [Monorepo Structure](../implementation/03-monorepo-structure.md)
