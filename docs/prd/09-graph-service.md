# PRD-09: Graph Service

> Parent: [PRD-00 Overview](./00-overview.md)  
> Status: Draft

---

## Purpose

The Graph Service provides a derived, read-only view of relationships between pages, entities, concepts, and sources. The graph is never the canonical source of truth — it is always computed from page content, citations, and entity/concept links stored in PostgreSQL.

**Architecture distinction from Obsidian:** Obsidian's graph is a visual force-directed display of file backlinks. Kaibase's graph is a **relational model extracted from PostgreSQL JSON block snapshots** — structural references in block content (citations, entity mentions, embedded links) become edges. The graph is therefore a byproduct of the block storage, not a separately maintained data structure.

---

## Design Principles

1. **Derived from block snapshots** — Graph edges are extracted from `page_block_snapshot.snapshot` JSONB. A `lwc:citation` block → `cites` edge. A `lwc:entity-mention` block → `mentions` edge. An `affine:embed-linked-doc` block → `related_to` edge.
2. **Async recomputation** — Graph updates are decoupled from page edits, running as background jobs.
3. **Read-only API** — The graph service only serves queries, never accepts direct mutations.
4. **Separate service** — Graph logic is isolated from the knowledge store and editor surface.
5. **Graph as lint foundation** — The primary consumer of graph data is the Lint AI (orphan detection, contradiction mapping, hub overload). Visual graph exploration is secondary.

---

## Graph Model

### Node Types

| Node Type | Source Object | Label |
|-----------|--------------|-------|
| `page` | CanonicalPage | Page title |
| `entity` | Entity | Entity name |
| `concept` | Concept | Concept name |
| `source` | Source | Source title/filename |

### Edge Types

| Edge Type | Meaning | Direction |
|-----------|---------|-----------|
| `cites` | Page cites a source as evidence | Page → Source |
| `mentions` | Page mentions an entity or concept | Page → Entity/Concept |
| `related_to` | Two pages are topically related | Page ↔ Page |
| `parent_of` | Hierarchical page relationship | Page → Page |
| `derived_from` | Page was generated from source(s) | Page → Source |
| `contradicts` | Two pages make conflicting claims | Page ↔ Page |

---

## Graph Computation Pipeline

```
Page block snapshot committed (Y.Doc → PostgreSQL JSONB)
         |
    Emit event to BullMQ queue: "graph-recompute"
         |
    GraphWorker picks up job
         |
    Query page_block_snapshot JSONB for the affected page:
    ├── jsonb_path_query → lwc:citation blocks
    │     → upsert 'cites' and 'derived_from' edges
    ├── jsonb_path_query → lwc:entity-mention blocks
    │     → upsert 'mentions' edges (Page → Entity)
    ├── jsonb_path_query → affine:embed-linked-doc blocks
    │     → upsert 'related_to' edges (Page → Page)
    ├── jsonb_path_query → affine:paragraph/heading text
    │     → NLP concept extraction → upsert 'mentions' edges (Page → Concept)
    └── Cross-page claim comparison (via embeddings)
          → upsert 'contradicts' edges where semantic conflict detected
         |
    Upsert GraphNode/GraphEdge records
         |
    Update node/edge metadata (weight, timestamps)
         |
    Log ActivityEvent (type: 'graph_update')
```

### Recomputation Triggers

- Page block snapshot committed (primary trigger)
- Entity or concept created/updated/merged
- Citation added or removed
- Scheduled full recomputation (weekly, for drift correction)

---

## Graph Query API

```
GET  /api/v1/workspaces/:wid/graph/nodes                 -- list all nodes (paginated)
GET  /api/v1/workspaces/:wid/graph/nodes/:nid             -- get node with edges
GET  /api/v1/workspaces/:wid/graph/nodes/:nid/neighbors   -- get neighbor nodes (1-hop)
GET  /api/v1/workspaces/:wid/graph/edges                  -- list edges (filterable by type)
GET  /api/v1/workspaces/:wid/graph/subgraph               -- get subgraph around a focal node
     ?focal_node_id=...&depth=2&edge_types=mentions,related_to
GET  /api/v1/workspaces/:wid/graph/stats                  -- graph statistics (node count, edge count, clusters)
GET  /api/v1/workspaces/:wid/graph/orphans                -- nodes with no connections
GET  /api/v1/workspaces/:wid/graph/hubs                   -- nodes with most connections
```

---

## Graph Visualization (Frontend)

- Built with `react-force-graph` (1.48.2) as a separate view/module
- Force-directed layout by default
- Node color by type (page, entity, concept, source)
- Edge style by type (solid for cites, dashed for related_to, red for contradicts)
- Click a node to navigate to the corresponding page/entity/source
- Filter by node type, edge type, collection
- Search to highlight and focus on specific nodes
- Zoom and pan controls

---

## Conflict Resolution UI

When two pages make contradicting claims (`contradicts` edge), users need a dedicated resolution workflow — not just a graph edge indicator.

### Conflict Resolution Flow

```
Contradiction detected (Lint AI or real-time)
       |
  Create ConflictTask (extends ReviewTask)
       |
  Conflict Resolution View:
  ├── Side-by-side display of conflicting pages
  ├── Highlight the specific blocks that conflict
  ├── Show source evidence for each side (with dates)
  ├── Show AI recommendation: which source is newer/more authoritative
  └── User actions:
      ├── Accept Side A (update Side B accordingly)
      ├── Accept Side B (update Side A accordingly)
      ├── Merge (edit a combined resolution)
      └── Dismiss (mark as intentional — e.g., different perspectives)
       |
  Resolution recorded in Activity Log
  Contradicts edge removed or converted to 'supersedes' edge
```

**This extends Karpathy's "contradiction detection" from a lint signal into an actionable resolution workflow.**

---

## Lint Integration

The Graph Service supports Lint AI health checks:

| Check | Graph Query |
|-------|------------|
| Orphan pages | Nodes with degree = 0 |
| Isolated clusters | Connected components analysis |
| Hub overload | Nodes with degree > threshold |
| Missing links | Pages that share entities but have no direct edge |
| Contradictions | Edges of type `contradicts` → **Conflict Resolution UI** |

---

## FR7: Graph View

### Acceptance Criteria

- [ ] Graph view displays pages, entities, concepts, and sources as nodes
- [ ] Relationships are shown as typed edges with appropriate visual styling
- [ ] Users can click nodes to navigate to the corresponding object
- [ ] Graph supports filtering by node type and edge type
- [ ] Subgraph view focuses on a selected node and its N-hop neighborhood
- [ ] Graph updates asynchronously when pages change (not blocking the editor)
- [ ] Orphan and hub node detection is available
- [ ] Graph recomputation runs as a background job, not in the request path

---

## Related Documents

- [PRD-02: Data Model](./02-data-model.md) — GraphNode, GraphEdge schemas
- [PRD-04: AI Compiler](./04-ai-compiler.md) — Lint AI using graph data
- [PRD-14: Frontend & UI](./14-frontend.md) — Graph visualization component
