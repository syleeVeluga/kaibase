# PRD-01: Architecture & Stack Specification

> Parent: [PRD-00 Overview](./00-overview.md)  
> Status: Draft

---

## System Architecture Diagram

```
[Connected Folders / Cloud Storage / Web Upload / Email / Slack / Discord / MCP / API]
                    |
           Source Connectors (watch + sync)
                    |
              Intake Gateway
                    |
              Policy Engine  <---  Policy Pack (per workspace)
                    |
     Source Vault (references + extracted content) + Parsing / Normalization
                    |
          AI Knowledge Compiler Workers
                    |
     Canonical Knowledge Store + Search Index
                    |
     Y.Doc (live CRDT) ──→ Block Snapshot Pipeline ──→ page_block_snapshot (JSONB)
                    |
  Editor Surface (BlockSuite PageEditor / EdgelessEditor / Custom Collections)
         |                |                |                |
    Q&A Service      Graph Service    Knowledge Health    Notification / Outbox
                                      Dashboard
```

---

## Architecture Principles

| Principle | Detail |
|-----------|--------|
| **AUTH/RBAC external** | Identity and policy enforcement handled by a dedicated auth layer, not embedded in app logic. |
| **BlockSuite = surface (MPL 2.0, unmodified)** | BlockSuite is used as-is for document rendering and editing. No business logic in the editor layer. No AFFiNE product code. Custom blocks in separate files with `lwc:*` namespace. |
| **Graph = derived, read-only service** | Graph is computed from page/entity/citation relationships. Never the source of truth. |
| **MCP = custom domain server** | Self-built MCP server exposing domain actions through the policy engine. No dependency on AFFiNE native MCP. |
| **AI = separate workers** | AI inference, classification, compilation run in dedicated worker processes orchestrated by BullMQ. |
| **Raw source = immutable references** | Sources live where the user keeps them (connected folders, cloud storage). Kaibase stores references + extracted content, never modifies originals. |
| **Activity log = append-only** | All system events are recorded in an append-only log. |
| **Workspace isolation** | Complete data isolation between workspaces at the database level. |
| **Block snapshot pipeline** | Y.Doc (live CRDT) → debounced snapshot extraction → `page_block_snapshot` JSONB. This is the single pipeline that feeds search, graph, and AI updates. Snapshot frequency: idle-detect (3s after last edit) or explicit commit, not per-keystroke. |

---

## Service Decomposition

### 0. Source Connectors (NEW)
- Watch user's existing storage locations for new/changed files
- **Phase 0:** Local folder watcher (via agent or desktop client), direct file upload, URL submission
- **Phase 1:** Google Drive, S3/GCS, Dropbox, OneDrive connectors
- **Phase 2+:** Confluence, Notion import, SharePoint
- Connectors emit `IngestEvent` to the Intake Gateway when a new/changed file is detected
- Files are NOT copied into Kaibase storage — only references (path, URI, storage_key) and extracted content are stored
- See [PRD-03: Source Vault](./03-source-vault.md)

### 1. Intake Gateway
- Receives inputs from all channels (source connectors, web upload, email webhook, Slack event, Discord event, MCP call, REST API)
- Normalizes input into a common `IngestEvent` schema
- Forwards to Policy Engine

### 2. Policy Engine
- Evaluates workspace policy rules against the ingest event
- Determines: `AUTO_PUBLISH | DRAFT_ONLY | REVIEW_REQUIRED | BLOCKED`
- Routes to appropriate downstream handler
- See [PRD-05: Policy Engine](./05-policy-engine.md)

### 3. Source Vault
- Immutable storage for raw files, text, URLs, attachments
- Metadata stored in PostgreSQL, binary content in Object Storage
- See [PRD-03: Source Vault](./03-source-vault.md)

### 4. AI Knowledge Compiler
- BullMQ workers processing ingest events
- Classification, summarization, entity extraction, page generation/update
- See [PRD-04: AI Compiler](./04-ai-compiler.md)

### 5. Canonical Knowledge Store
- PostgreSQL tables for pages, entities, concepts, citations, briefs
- `page_block_snapshot` JSONB — block tree snapshot per Y.Doc commit (primary source for graph extraction and block-level search)
- `pgvector` for dense (semantic) embedding index on page + block chunks
- Full-text: PostgreSQL `tsvector` (Phase 0) → BM25 index via ParadeDB/pg_bm25 (Phase 2+)
- Search roadmap: tsvector + pgvector (Phase 0) → RRF hybrid (Phase 1) → BM25 + dense fusion (Phase 2+)
- Y.Doc (Yjs, MIT license) for live collaborative CRDT editing state
- See [PRD-06: Knowledge Pages](./06-knowledge-pages.md)

#### Block Snapshot Pipeline (Y.Doc → JSONB)

The block snapshot pipeline is the critical bridge between live editing and all downstream services:

```
Y.Doc (live CRDT state)
       |
  Debounce: 3s idle-detect OR explicit save/publish
       |
  Extract block tree from Y.Doc → JSON
       |
  INSERT into page_block_snapshot (version = prev + 1)
       |
  Emit events to BullMQ queues:
  ├── "search-reindex" → update tsvector + embeddings
  ├── "graph-recompute" → extract edges from block references
  └── "ai-lint-check" → schedule lint if block count changes significantly
```

**Consistency guarantee:** The snapshot is extracted atomically from the Y.Doc state. If the Y.Doc state changes during extraction, the snapshot is retried. The snapshot version is monotonically increasing per page. Downstream consumers always reference a specific snapshot version.

### 6. Q&A Service
- Queries canonical pages first, falls back to raw sources
- Generates cited answers
- Promotes valuable answers to pages/briefs
- See [PRD-07: Q&A Service](./07-qa-service.md)

### 7. Graph Service
- Derives node/edge relationships from pages, entities, citations
- Provides read-only graph API
- Async recomputation pipeline, decoupled from page edits
- See [PRD-09: Graph Service](./09-graph-service.md)

### 8. Notification / Outbox Service
- Fans out notifications to web app, email, Slack, Discord
- Digest generation on schedule
- See [PRD-11: Channel Output](./11-channel-output.md)

### 9. MCP Server
- Custom MCP server exposing domain actions
- All writes go through the policy engine
- See [PRD-12: MCP Server](./12-mcp-server.md)

### 10. Auth / RBAC Service
- External identity management
- Role-based access control
- Workspace membership and permissions
- See [PRD-13: Auth & RBAC](./13-auth-rbac.md)

---

## Recommended Stack

### Frontend

| Technology | Version | Notes |
|-----------|---------|-------|
| React | 19.2.x | Main UI framework |
| TypeScript | 6.0.2 | Type system |
| Vite | 7.2.7 | Main web app (BlockSuite compatibility) |
| Vite | 8.0.5 | Admin/marketing standalone apps |
| @vanilla-extract/css | 1.18.0 | Main styling approach |
| @vanilla-extract/vite-plugin | 5.0.0 | Vite integration for vanilla-extract |
| @tanstack/react-query | 5.97.0 | Data fetching and caching |
| Zod | 4.3.6 | Schema validation |
| @blocksuite/presets | 0.19.5 | Document editor surface (MPL 2.0 — use as-is, no source modification) |
| Yjs | 13.6.30 | CRDT collaboration engine |
| react-force-graph | 1.48.2 | Graph visualization |

### Backend

| Technology | Version | Notes |
|-----------|---------|-------|
| Node.js | 24.14.1 LTS | Runtime |
| Yarn | 4.13.0 | Package manager (monorepo) |
| Hono | 4.12.x | API framework |
| Drizzle ORM | 0.45.2 | Database ORM |
| PostgreSQL | 18.3 | Primary database |
| Redis | 8.6.2 | Queue, cache, pub/sub |
| BullMQ | 5.69.3 | Background job processing |
| pgvector | 0.2.1 (node) | Vector search |

### AI / Integrations

| Technology | Version | Notes |
|-----------|---------|-------|
| OpenAI SDK | 6.33.0 | LLM provider |
| Anthropic SDK | 0.86.1 | LLM provider |
| MCP SDK | 1.29.0 | Custom MCP server |
| @slack/web-api | 7.15.0 | Slack integration (Phase 1) |
| discord.js | 14.25.1 | Discord integration (Phase 1) |
| Nodemailer | latest stable | Email sending |

### Styling Strategy

| Context | Approach |
|---------|----------|
| Document editor surface | vanilla-extract + design tokens |
| Main web app | vanilla-extract + CSS modules |
| Admin console | Tailwind (optional, limited use) |
| Marketing pages | Tailwind (optional, limited use) |
| Twind | **Not used** |

**Rationale:** BlockSuite uses native web components. Token-based styling with vanilla-extract aligns better with the component model than utility-first CSS.

---

## Infrastructure

### Development

- Monorepo with Yarn 4 workspaces
- Turborepo or Nx for build orchestration
- Docker Compose for local development
- PostgreSQL + Redis + MinIO (S3-compatible) local stack

### Production

- Container-based deployment (Docker/K8s)
- PostgreSQL managed service
- Redis managed service
- S3-compatible object storage
- CDN for static assets

---

## Related Documents

- [Stack Version Lock](../implementation/01-stack-versions.md)
- [Monorepo Structure](../implementation/03-monorepo-structure.md)
