# PRD-06: Knowledge Pages & Collections

> Parent: [PRD-00 Overview](./00-overview.md)  
> Status: Draft

---

## Purpose

Knowledge Pages are the productivity surface of Kaibase — the equivalent of Notion pages, but with AI as the primary author. Unlike raw sources (which are immutable), canonical pages are living documents that AI creates, updates, and links. They are rendered through BlockSuite's PageEditor (MPL 2.0, used as-is without modification) and organized into custom Collections.

**Key distinction from a traditional wiki:** Pages are not static articles. They are structured block documents — the same building block used in Notion, AFFiNE, and Confluence — where each block (paragraph, heading, table, code, embed) is a discrete unit that AI can update surgically, users can edit collaboratively, and the search/graph layer can index at block level via PostgreSQL JSON storage.

---

## Page Types

| Type | Purpose | Example |
|------|---------|---------|
| `project` | Project-scoped knowledge | "Project Alpha — Technical Spec" |
| `entity` | About a person, org, product, technology | "OpenAI — Company Profile" |
| `concept` | Abstract topic or theme | "Retrieval Augmented Generation" |
| `brief` | Synthesized summary from multiple sources | "Q3 Competitive Landscape Brief" |
| `answer` | Promoted Q&A answer | "How does our auth system work?" |
| `summary` | Single-source summary | "Meeting Notes — 2026-04-10 Summary" |
| `comparison` | Side-by-side analysis | "PostgreSQL vs MySQL for our use case" |
| `custom` | User-defined page type | Freeform |

---

## Page Lifecycle

```
           ┌─────────┐
           │  DRAFT   │ ← AI creates / user creates
           └────┬─────┘
                │
       ┌────────┴────────┐
       │                 │
  Policy: AUTO_PUBLISH   Policy: REVIEW_REQUIRED
       │                 │
       ▼                 ▼
  ┌──────────┐    ┌──────────────┐
  │ PUBLISHED │    │ REVIEW_PENDING│
  └──────────┘    └──────┬───────┘
       ▲                 │
       │          ┌──────┴──────┐
       │          │             │
       │     Approved      Rejected
       │          │             │
       │          ▼             ▼
       │    ┌──────────┐  ┌────────┐
       └────│ PUBLISHED │  │ DRAFT  │ (returned with feedback)
            └──────────┘  └────────┘
                │
                ▼
           ┌──────────┐
           │ ARCHIVED  │ ← manual or stale detection
           └──────────┘
```

---

## Page Content & BlockSuite Integration

Each canonical page has:

1. **Metadata** in PostgreSQL (id, title, type, status, citations, etc.)
2. **Rich content** in a Yjs Y.Doc (collaborative CRDT document, MIT license) — the live editing state
3. **Block snapshot** in PostgreSQL as a JSON array — the canonical indexed representation
4. **Plain-text snapshot** in PostgreSQL for full-text search and embedding

### Block Snapshot Pipeline (Y.Doc → JSONB)

The Y.Doc (Yjs CRDT) is the **source of truth for live editing**. Snapshots are extracted on a debounced schedule and stored as PostgreSQL `jsonb`:

**Snapshot trigger:** 3-second idle detection after the last Y.Doc edit, OR explicit save/publish action. NOT per-keystroke — this is critical for performance.

**Consistency:** Snapshots are extracted atomically from Y.Doc state. Each snapshot has a monotonically increasing `version` number. Downstream consumers (search, graph, AI) always reference a specific snapshot version.

On every Y.Doc commit, a snapshot is extracted and stored as a PostgreSQL `jsonb` column:

```sql
-- page_block_snapshot table
CREATE TABLE page_block_snapshot (
  id          UUID PRIMARY KEY,
  page_id     UUID NOT NULL REFERENCES canonical_page(id),
  snapshot    JSONB NOT NULL,   -- BlockSuite block tree as JSON
  version     INTEGER NOT NULL,
  created_at  TIMESTAMP NOT NULL
);

-- Example snapshot structure
{
  "type": "affine:page",
  "children": [
    {
      "type": "affine:note",
      "children": [
        { "type": "affine:heading", "props": { "text": "Project Alpha", "level": 1 } },
        { "type": "affine:paragraph", "props": { "text": "Status: on track..." } },
        { "type": "lwc:citation", "props": { "source_id": "...", "excerpt": "..." } }
      ]
    }
  ]
}
```

**Why PostgreSQL JSON blocks (not Obsidian-style graph)?**
- Block-level indexing enables surgical AI updates (update one paragraph block, not the whole page)
- JSON query operators (`@>`, `->`, `->>`, `jsonb_path_query`) enable structural search — find all pages with a `lwc:citation` block citing a specific source
- Drives the graph service: relationships are extracted from block references, not inferred from a separate graph store
- Path to BM25 + dense hybrid search: blocks become the unit of indexing, not just pages

**Search Architecture Roadmap**

| Phase | Strategy | Implementation |
|-------|----------|----------------|
| Phase 0 | Full-text search | PostgreSQL `tsvector` on `content_snapshot` (Korean + English) |
| Phase 0 | Semantic search | `pgvector` cosine similarity on page + block embeddings |
| Phase 1 | Hybrid search | Reciprocal Rank Fusion of full-text + semantic scores |
| Phase 2+ | BM25 + dense | Dedicated BM25 index (e.g., `pg_bm25`/ParadeDB or Elasticsearch) alongside dense embedding vectors, fused at query time |

### Confidence Decay & Freshness Score

Every block with a citation tracks when its evidence was last verified. Over time, blocks "decay" — becoming visually stale — prompting re-verification.

```typescript
interface BlockFreshness {
  block_id: string;
  page_id: string;
  last_evidence_date: string;     // when the citing source was last updated/verified
  freshness_score: number;        // 1.0 (fresh) → 0.0 (stale), decays over time
  decay_rate: number;             // workspace-configurable: how fast blocks go stale
  stale_threshold: number;        // below this score, block shows stale indicator
}
```

**Decay formula:** `freshness = max(0, 1 - (days_since_evidence / decay_halflife))`

**Visual treatment:** Blocks below `stale_threshold` display a subtle amber indicator. Lint AI can auto-detect stale blocks and suggest re-verification or source refresh.

**Why this matters:** This creates the sensation of a "living" knowledge base. Unlike static wikis where outdated content looks the same as fresh content, Kaibase visually distinguishes current knowledge from aging knowledge — and can auto-heal it.

---

### BlockSuite Standard Blocks (MPL 2.0 — used as-is)

Pages use BlockSuite's built-in block model from `@blocksuite/blocks`. These blocks are imported and used without modification:

- `affine:page` — root block
- `affine:note` — content container
- `affine:paragraph` — text paragraphs with inline formatting
- `affine:heading` — h1-h6 headings
- `affine:list` — ordered/unordered lists
- `affine:code` — code blocks
- `affine:divider` — horizontal rules
- `affine:image` — embedded images
- `affine:database` — table/database blocks (for comparison tables)
- `affine:embed-linked-doc` — cross-page links

> **License note:** The `affine:*` blocks are part of BlockSuite's open-source package (`@blocksuite/blocks`, MPL 2.0). They are NOT AFFiNE product code. Using them via import is license-safe.

### Custom Blocks (Proprietary — `lwc:*` namespace)

Domain-specific blocks are implemented as new files in `packages/editor/src/blocks/`. These are NOT modifications to BlockSuite source files, so they remain under our own license:

- `lwc:citation` — inline source reference with hover preview (links to Source Vault)
- `lwc:entity-mention` — auto-linked entity reference with resolution
- `lwc:review-status` — page review status indicator
- `lwc:source-panel` — embedded source evidence panel

Custom blocks are defined in separate files and registered alongside `AffineSchemas`:

```typescript
// packages/editor/src/blocks/citation-block.ts  ← NEW file, our license
// packages/editor/src/blocks/entity-mention-block.ts  ← NEW file, our license
// packages/editor/src/setup.ts  ← NEW file, our license
import { AffineSchemas } from '@blocksuite/blocks';
import { LwcCitationBlock } from './blocks/citation-block';
import { LwcEntityMentionBlock } from './blocks/entity-mention-block';

const schema = new Schema()
  .register(AffineSchemas)           // MPL 2.0 blocks (unmodified)
  .register([LwcCitationBlock, ...]) // Our custom blocks (proprietary)
```

### AI Content Generation

When AI creates or updates a page, it:

1. Generates structured content (markdown-like)
2. Converts to BlockSuite block operations (using standard `affine:*` blocks + custom `lwc:*` blocks)
3. Applies changes to the Y.Doc via Yjs API (MIT license)
4. Updates the plain-text snapshot for search indexing
5. Creates/updates embeddings in pgvector

---

## Collections

Collections group pages. This is a custom implementation (not derived from AFFiNE's collection code).

### Default Collections (per workspace)

| Collection | Type | Auto-populated | Description |
|-----------|------|----------------|-------------|
| **Inbox** | `inbox` | Yes | Newly ingested items and their initial pages |
| **Projects** | `project` | Yes | Project-scoped pages |
| **Entities** | `entities` | Yes | Entity pages (people, orgs, products, tech) |
| **Concepts** | `concepts` | Yes | Concept/topic pages |
| **Briefs** | `briefs` | Yes | AI briefs and promoted answers |
| **Review Queue** | `review_queue` | Yes | Pages pending review |
| **Knowledge Index** | `knowledge_index` | Yes | Master catalog of all published pages |
| **Activity Log** | `activity_log` | Yes | System event timeline |

### Custom Collections

Users can create custom collections and set policy rules to auto-route pages to them.

### Default Assignment Rules

When the system creates a canonical page without an explicit `collection_id`, it assigns a default collection from the page type:

| Page Type | Default Collection Type |
|-----------|--------------------------|
| `project` | `project` |
| `entity` | `entities` |
| `concept` | `concepts` |
| `brief` | `briefs` |
| `answer` | `briefs` |
| `summary` | `inbox` |
| `comparison` | `inbox` |
| `custom` | `inbox` |

Workspace policy may override this routing decision by returning a target collection at evaluation time. If the referenced collection is unavailable in the workspace, page creation still succeeds and `collection_id` remains `NULL`.

### Review Queue Semantics

`Review Queue` and `review_pending` status are related but not identical.

- A page can belong to a domain collection such as `Projects`, `Entities`, `Concepts`, or `Briefs` while still requiring review.
- Review flows should treat page status as the canonical signal for queue membership.
- Implementations may show a dedicated review view without rewriting the page's primary collection membership.

---

## Page Relationships

Pages connect to other objects via:

| Relationship | Description |
|-------------|-------------|
| Page → Source (via Citation) | Evidence link — which sources support this page |
| Page → Entity | Entities mentioned or described in this page |
| Page → Concept | Concepts this page belongs to |
| Page → Page (parent) | Hierarchical page nesting |
| Page → Page (linked) | Cross-reference links within content |
| Page → Collection | Collection membership |

---

## Search Architecture

### Full-Text Search
- PostgreSQL `tsvector` on `content_snapshot`
- Supports both English and Korean with appropriate dictionaries
- Weighted by page type and recency

### Semantic Search
- pgvector embeddings on page content chunks
- Hybrid search: combine keyword + semantic scores
- Embeddings refreshed on page content change

### Search Priority
1. **Published canonical pages** (primary)
2. **Draft pages** (secondary, if user has access)
3. **Raw sources** (fallback)

---

## API Endpoints

```
POST   /api/v1/workspaces/:wid/pages                    -- create page
GET    /api/v1/workspaces/:wid/pages                    -- list pages (paginated, filterable)
GET    /api/v1/workspaces/:wid/pages/:pid               -- get page metadata
GET    /api/v1/workspaces/:wid/pages/:pid/content       -- get page content (Y.Doc snapshot)
PUT    /api/v1/workspaces/:wid/pages/:pid               -- update page metadata
PATCH  /api/v1/workspaces/:wid/pages/:pid/content       -- apply content update
POST   /api/v1/workspaces/:wid/pages/:pid/publish       -- publish draft
POST   /api/v1/workspaces/:wid/pages/:pid/archive       -- archive page
GET    /api/v1/workspaces/:wid/pages/:pid/citations     -- list citations for page
GET    /api/v1/workspaces/:wid/pages/:pid/history       -- page edit history

GET    /api/v1/workspaces/:wid/collections              -- list collections
POST   /api/v1/workspaces/:wid/collections              -- create collection
GET    /api/v1/workspaces/:wid/collections/:cid/pages   -- list pages in collection

POST   /api/v1/workspaces/:wid/search                   -- search pages and sources
```

---

## FR2: Auto-Classification (Functional Requirement)

### Acceptance Criteria

- [ ] AI classifies each ingested source into workspace section, project, and topic
- [ ] Classification considers existing page taxonomy and workspace structure
- [ ] Users can manually reclassify if AI got it wrong (tracked as metric)
- [ ] Classification runs within 60 seconds of ingest

## FR3: AI Page Creation/Update (Functional Requirement)

### Acceptance Criteria

- [ ] New pages are created with proper BlockSuite block structure (standard `affine:*` blocks + custom `lwc:*` blocks)
- [ ] Existing pages are updated via diff (proposed changes, not overwrites)
- [ ] Entity and concept pages are auto-linked from content mentions
- [ ] All page content includes citations to source material
- [ ] Pages support both English and Korean content
- [ ] Page status follows the lifecycle (draft → published → archived)

---

## Related Documents

- [PRD-02: Data Model](./02-data-model.md) — CanonicalPage, Collection schemas
- [PRD-04: AI Compiler](./04-ai-compiler.md) — AI page generation logic
- [PRD-05: Policy Engine](./05-policy-engine.md) — Policy governing page publishing
- [PRD-14: Frontend & UI](./14-frontend.md) — BlockSuite editor integration
