# PRD-14: Frontend & UI

> Parent: [PRD-00 Overview](./00-overview.md)  
> Status: Draft

---

## Purpose

The frontend is a custom web application that uses BlockSuite (MPL 2.0) as its editor component. BlockSuite is used as-is without source modification. All business logic, collections, auth, and layout are custom implementations. No AFFiNE product code is used.

---

## Design Principles

1. **Productivity surface first** — Kaibase replaces Notion-class tools. The editor experience must match or exceed Notion/AFFiNE in feel: clean, fast, block-based. Users should feel "at home" if coming from Notion or Confluence.
2. **BlockSuite-first** — The document editor uses BlockSuite PageEditor (MPL 2.0, unmodified) as the primary editing surface.
3. **React + Vite** — Main application framework. Vite 7.2.7 for BlockSuite compatibility.
4. **Token-based styling** — vanilla-extract with design tokens for the main app; Tailwind only for admin/marketing subapps.
5. **Bilingual** — All UI supports English and Korean with i18n framework.
6. **Responsive** — Desktop-first but usable on tablet.

---

## Application Structure

```
/                          → Dashboard / workspace overview + Knowledge Health Dashboard
/                        first-time empty state → Create workspace / connect knowledge
/inbox                     → Inbox (newly ingested sources + initial AI-generated pages)
/pages                     → All pages (browsable, filterable)
/pages/:pageId             → Page view/edit (BlockSuite PageEditor)
/pages/:pageId/edgeless    → Edgeless view (BlockSuite EdgelessEditor)
/collections               → Collections list
/collections/:collectionId → Collection detail with pages
/sources                   → Source vault browser
/sources/:sourceId         → Source detail view
/qa                        → Q&A interface
/qa/:sessionId             → Q&A session with conversation history
/reviews                   → Review queue
/reviews/:reviewId         → Review task detail
/graph                     → Graph view (react-force-graph)
/activity                  → Activity log timeline
/entities                  → Entity browser
/concepts                  → Concept browser
/settings                  → Workspace settings
/settings/policy           → Policy editor
/settings/members          → Member management
/settings/channels         → Channel configuration (Phase 1)
/settings/connectors       → Source connector management (folder paths, cloud storage)
/settings/templates        → Page template editor
/settings/mcp              → MCP credential management (Phase 1)
```

---

## Key UI Components

### 0. Progressive Onboarding (First 10 Minutes)

The onboarding flow must demonstrate value within the first 10 minutes. This is the single most critical UX for retention.

```
Step 1: "Connect your knowledge"
  → New users land on the dashboard, which either shows the active workspace overview or an empty state to create the first workspace
  → After workspace creation, the first-run CTA drives directly into source connection
  → User connects a local folder path (or uploads a few files as fallback)
  → Visual: folder picker / path input with preview of detected files
  → "Found 47 documents in ~/Documents/project-alpha/"

Step 2: "Watch AI compile"
  → System begins ingesting files from the connected folder
  → Real-time progress: "Processing file 3/47... Creating 'Project Alpha Overview'..."
  → Live feed showing pages being created (titles appearing in sidebar)
  → Target: first page visible within 2-3 minutes

Step 3: "Explore your knowledge"
  → Guided tour of the first generated pages
  → Highlight: citations linking back to source files, entity pages, relationships
  → Prompt: "Ask a question about your documents" → live Q&A demo

Step 4: "Set your preferences" (optional)
  → Quick policy config: auto-publish vs. review-required
  → Template selection: "What kind of documents do you work with?"
  → Language preference
```

**Key principle:** The user should see AI-generated knowledge pages from *their own documents* within 5 minutes of starting. This is the "aha moment" that justifies the product.

**Entry principle:** Authenticated users should not hit a separate setup gate before seeing the product shell. The dashboard is the first surface, and it owns the first-workspace empty state when needed.

---

### 1. Navigation Sidebar

- Workspace selector (multi-workspace support)
- Collection tree (Inbox, Projects, Entities, Concepts, Briefs, Review Queue, etc.)
- Quick search trigger
- Notification badge
- User menu (profile, settings, logout)
- Language toggle (EN/KO)

### 2. Page Editor (BlockSuite PageEditor)

- Rich text editing with BlockSuite's native block model
- Inline entity/concept mentions with autocomplete
- Citation markers with hover previews
- Page metadata panel (type, status, collection, tags)
- Source panel (linked sources and citations)
- History/versioning sidebar
- Publish/archive actions
- Bilingual content support (EN/KO tabs or side-by-side)

### 3. Edgeless View (BlockSuite EdgelessEditor)

- Canvas/whiteboard mode for visual knowledge mapping
- Used for briefs, comparison layouts, brainstorming
- Available as alternate view for any page

### 4. Q&A Chat Interface

- Chat-style question input
- Answer display with inline citations (clickable)
- "Save as Page" action on each answer
- Conversation history in session sidebar
- Suggested questions based on recent activity

### 5. Review Queue

- Task list with type/status/date filters
- Task detail with full context:
  - Source material preview
  - Proposed changes (diff view for updates)
  - AI reasoning explanation
  - Citation links
  - Confidence score indicator
- Approve / Reject / Edit-then-Approve / Reassign actions
- Batch action support

### 6. Graph View

- Force-directed graph (react-force-graph)
- Node coloring by type (page, entity, concept, source)
- Edge styling by type (cites, mentions, related_to, contradicts)
- Click-to-navigate to nodes
- Filter panel (node type, edge type, collection)
- Search to find and focus nodes
- Subgraph focus: select a node and view its N-hop neighborhood

### 7. Source Vault Browser

- List view with filters (type, channel, connector, date, status)
- **Connected source indicator:** shows which connector provided each source (folder icon, Drive icon, etc.)
- Source detail: original content (link to original location for connected sources), extracted text, metadata, linked pages
- File preview for supported types (PDF, images)
- Attachment download (for directly uploaded files only)
- **Source Connector Manager** (Settings → Connectors):
  - Add/remove connected folders and storage locations
  - View sync status per connector (last synced, file count, errors)
  - Manual sync trigger
  - Phase 1: OAuth flows for Google Drive, S3 credential setup

### 8. Inbox (Clarification)

The Inbox shows two types of items, clearly distinguished:

1. **Newly ingested sources** — files detected from connected folders or uploaded directly. Shows source metadata, parsing status, and which AI compilation jobs are running.
2. **AI-generated pages awaiting review** — draft pages created by the AI compiler that need user attention (either `DRAFT_ONLY` or `REVIEW_REQUIRED`).

When a source has been fully processed, its Inbox entry links to the generated pages. When no pages have been generated yet (processing in progress), the entry shows a progress indicator.

### 9. Knowledge Health Dashboard

The workspace dashboard includes a "Knowledge Health" panel showing aggregate metrics:

| Metric | Visualization | Description |
|--------|--------------|-------------|
| **Freshness score** | Gauge (0-100%) | Average block freshness across all published pages |
| **Orphan pages** | Count + trend | Pages with no citations and no incoming links |
| **Contradiction count** | Count + list | Active `contradicts` edges detected by lint |
| **Citation coverage** | Percentage | Pages with at least one citation vs. total pages |
| **Average citations per page** | Number | Higher = more evidence-backed knowledge |
| **Most active topics** | Tag cloud / bar chart | Topic clusters with most recent activity |
| **AI ops usage** | Progress bar | Monthly AI operation usage vs. tier limit |
| **Loop health** | Indicators | Promotion rate, re-deposit depth, loop closure time |

**Purpose:** This dashboard answers the admin question: "Is our knowledge base healthy and growing, or is it stagnating?" It is the quantitative proof of Kaibase's value.

### 10. Activity Log

- Timeline view with event type icons
- Filterable by event type, actor, target, date range
- Click event to view detail and navigate to related objects

### 9. Global Search

- Command palette style (Cmd+K / Ctrl+K)
- Searches across pages, sources, entities, concepts
- Results grouped by type with relevance ranking
- Recent searches and suggested queries
- **Search backend roadmap:**
  - Phase 0: PostgreSQL `tsvector` (full-text) + `pgvector` (semantic) — results merged **server-side** (simple interleaving by score)
  - Phase 1: Server-side Reciprocal Rank Fusion (RRF) of full-text + semantic scores
  - Phase 2+: BM25 index (ParadeDB/pg_bm25) + dense embeddings, fused at query time
- **Block-level results:** Search can highlight the specific block within a page that matched, not just the page title (powered by `page_block_snapshot` JSONB indexing)

### 10. Notification Center

- Dropdown panel from navigation
- Real-time updates via WebSocket/SSE
- Unread count badge
- Click to navigate to related page/review/source

---

## Styling Architecture

```
apps/
  web/                    → Main knowledge app
    src/
      theme/
        tokens.css.ts     → Design tokens (colors, spacing, typography)
        global.css.ts     → Global styles
      components/
        *.css.ts          → Component-level vanilla-extract styles
      
  admin/                  → Admin console (optional)
    → Tailwind CSS for rapid development
    
  marketing/              → Landing pages
    → Tailwind CSS
```

### Design Token Categories

- **Colors:** primary, secondary, surface, text, status (success, warning, error, info)
- **Typography:** font families (Latin + Korean), sizes, weights, line heights
- **Spacing:** consistent scale (4px base)
- **Borders:** radii, widths
- **Shadows:** elevation levels
- **Transitions:** standard easing and durations

### Korean Typography

- Primary Korean font: Pretendard (or Noto Sans KR)
- Primary Latin font: Inter
- Font stack ensures proper fallback for mixed EN/KO content

---

## BlockSuite Integration (License-Safe)

> **License strategy:** BlockSuite packages (`@blocksuite/presets`, `@blocksuite/blocks`, `@blocksuite/store`) are MPL 2.0. We use them as dependencies without modifying their source files. Custom blocks are defined in separate new files under our own license.

### Setup

```typescript
// packages/editor/src/setup.ts  ← OUR file (proprietary)
import { PageEditor, EdgelessEditor } from '@blocksuite/presets';  // MPL 2.0
import { Doc, Schema } from '@blocksuite/store';                    // MPL 2.0
import { AffineSchemas } from '@blocksuite/blocks';                 // MPL 2.0

// Custom blocks (our code, separate files)
import { LwcCitationBlock } from './blocks/citation-block';
import { LwcEntityMentionBlock } from './blocks/entity-mention-block';
import { LwcReviewStatusBlock } from './blocks/review-status-block';

// Register standard BlockSuite blocks + our custom blocks
const schema = new Schema()
  .register(AffineSchemas)                    // BlockSuite standard (MPL 2.0, unmodified)
  .register([                                 // Our custom blocks (proprietary)
    LwcCitationBlock,
    LwcEntityMentionBlock,
    LwcReviewStatusBlock,
  ]);

// Create doc collection (workspace-level)
const collection = new DocCollection({ schema });

// Create and attach editor to DOM
const doc = collection.createDoc();
const editor = new PageEditor();
editor.doc = doc;
document.body.appendChild(editor);
```

### Custom Blocks (`lwc:*` namespace — proprietary, separate files)

These blocks are implemented as **new files** in `packages/editor/src/blocks/`, never as modifications to BlockSuite source files:

| Block | File | Description |
|-------|------|-------------|
| `lwc:citation` | `citation-block.ts` | Inline source reference with hover preview |
| `lwc:entity-mention` | `entity-mention-block.ts` | Auto-linked entity reference with resolution |
| `lwc:review-status` | `review-status-block.ts` | Page review status indicator |
| `lwc:source-panel` | `source-panel-block.ts` | Embedded source evidence panel |

### Collaboration (Custom Sync Server)

- Y.Doc sync via **custom** WebSocket provider built on Yjs (MIT license)
- Multi-user real-time editing on same page
- Presence indicators (cursor positions, user avatars)
- **NOT using AFFiNE's cloud sync** — fully custom implementation

---

## State Management

- **Server state:** @tanstack/react-query for API data fetching, caching, invalidation
- **Client state:** React context for UI state (sidebar open, active collection, language)
- **Editor state:** BlockSuite's internal Yjs/CRDT state (not managed by React; Yjs is MIT license)
- **Notifications:** WebSocket/SSE connection with React context

---

## Performance Considerations

- Lazy-load graph view (heavy react-force-graph dependency)
- Virtualized lists for pages, sources, activity events
- Optimistic UI updates for review approvals
- Debounced search input
- Service worker for offline capability (Phase 2)

---

## Related Documents

- [PRD-01: Architecture](./01-architecture.md) — Frontend stack specification
- [PRD-06: Knowledge Pages](./06-knowledge-pages.md) — BlockSuite block model
- [PRD-09: Graph Service](./09-graph-service.md) — Graph visualization
- [PRD-15: i18n Strategy](./15-i18n.md) — Internationalization
