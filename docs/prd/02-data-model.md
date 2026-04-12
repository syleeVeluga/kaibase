# PRD-02: Data Model & Schema

> Parent: [PRD-00 Overview](./00-overview.md)  
> Status: Draft

---

## System Objects

The following objects form the core data model of Kaibase.

---

### Workspace

The top-level tenant boundary. All data is scoped to a workspace.

```
Workspace {
  id: UUID (PK)
  name: string
  slug: string (unique)
  description: text (nullable)
  default_language: enum('en', 'ko')
  created_at: timestamp
  updated_at: timestamp
  settings: jsonb  // workspace-level configuration
}
```

---

### Source

An immutable reference record for raw material entering the system. For connected sources, the original file stays in the user's storage — only the reference and extracted content are stored.

```
Source {
  id: UUID (PK)
  workspace_id: UUID (FK -> Workspace)
  source_type: enum('file_upload', 'url', 'email', 'slack_message', 'discord_message', 'mcp_input', 'text_input', 'connector')
  channel: string  // e.g., 'web', 'email:inbound', 'slack:channel-name', 'mcp:agent-id', 'connector:local-folder'
  connector_id: UUID (FK -> SourceConnector, nullable)  // which connector provided this source
  source_uri: string (nullable)  // original location (file path, Drive URI, S3 key) for connected sources
  title: string (nullable)
  content_text: text (nullable)  // extracted/parsed text
  content_hash: string  // deduplication + change detection for connected sources
  raw_metadata: jsonb  // channel-specific metadata
  ingested_at: timestamp
  ingested_by: UUID (FK -> User, nullable)
  status: enum('pending', 'processing', 'processed', 'failed')
  version: integer (default 1)  // increments when connected source file changes
  last_synced_at: timestamp (nullable)  // last time connector checked this source
}
```

---

### Source Connector

Registered connection to an external storage location.

```
SourceConnector {
  id: UUID (PK)
  workspace_id: UUID (FK -> Workspace)
  connector_type: enum('local_folder', 'google_drive', 's3', 'gcs', 'dropbox', 'onedrive')
  name: string  // user-friendly name, e.g., "Project Alpha Docs"
  config: jsonb  // encrypted: folder path, OAuth tokens, IAM credentials, etc.
  sync_status: enum('active', 'paused', 'error')
  last_synced_at: timestamp (nullable)
  file_count: integer (default 0)
  created_at: timestamp
  updated_at: timestamp
  created_by: UUID (FK -> User)
}
```

---

### Source Attachment

Binary files associated with a source.

```
SourceAttachment {
  id: UUID (PK)
  source_id: UUID (FK -> Source)
  filename: string
  mime_type: string
  size_bytes: bigint
  storage_key: string  // object storage path
  content_text: text (nullable)  // extracted text from attachment
  created_at: timestamp
}
```

---

### Canonical Page

AI-compiled knowledge pages — the working memory of the system.

```
CanonicalPage {
  id: UUID (PK)
  workspace_id: UUID (FK -> Workspace)
  page_type: enum('project', 'entity', 'concept', 'brief', 'answer', 'summary', 'comparison', 'custom')
  title: string
  title_ko: string (nullable)  // Korean title
  slug: string
  content_snapshot: text  // latest plain-text snapshot for search
  ydoc_id: string (nullable)  // Yjs Y.Doc reference (MIT license)
  status: enum('draft', 'published', 'archived', 'review_pending')
  created_by: enum('ai', 'user')
  created_by_user_id: UUID (nullable)
  parent_page_id: UUID (FK -> CanonicalPage, nullable)
  collection_id: UUID (FK -> Collection, nullable)
  template_id: UUID (FK -> PageTemplate, nullable)  // template used for AI generation
  compilation_trace_id: UUID (nullable)  // reference to CompilationTrace (for AI-created pages)
  language: enum('en', 'ko', 'mixed')
  created_at: timestamp
  updated_at: timestamp
  published_at: timestamp (nullable)
}
```

---

### Entity

Extracted named entities (people, companies, products, technologies, etc.)

```
Entity {
  id: UUID (PK)
  workspace_id: UUID (FK -> Workspace)
  entity_type: enum('person', 'organization', 'product', 'technology', 'location', 'event', 'custom')
  name: string
  name_ko: string (nullable)
  aliases: text[]  // alternative names
  description: text (nullable)
  canonical_page_id: UUID (FK -> CanonicalPage, nullable)
  metadata: jsonb
  created_at: timestamp
  updated_at: timestamp
}
```

---

### Concept

Abstract concepts or topics extracted from sources.

```
Concept {
  id: UUID (PK)
  workspace_id: UUID (FK -> Workspace)
  name: string
  name_ko: string (nullable)
  description: text (nullable)
  canonical_page_id: UUID (FK -> CanonicalPage, nullable)
  parent_concept_id: UUID (FK -> Concept, nullable)
  created_at: timestamp
  updated_at: timestamp
}
```

---

### Citation

Links between canonical pages and their source evidence.

```
Citation {
  id: UUID (PK)
  page_id: UUID (FK -> CanonicalPage)
  source_id: UUID (FK -> Source)
  excerpt: text  // relevant quote or reference
  location_hint: string (nullable)  // e.g., "page 3", "paragraph 2"
  confidence: float (0.0 - 1.0)
  created_at: timestamp
}
```

---

### Review Task

Tasks created when policy requires human review.

```
ReviewTask {
  id: UUID (PK)
  workspace_id: UUID (FK -> Workspace)
  task_type: enum('page_creation', 'page_update', 'classification', 'contradiction', 'stale_content', 'lint_issue')
  status: enum('pending', 'approved', 'rejected', 'expired')
  target_page_id: UUID (FK -> CanonicalPage, nullable)
  target_source_id: UUID (FK -> Source, nullable)
  proposed_change: jsonb  // description of what AI wants to do
  ai_reasoning: text  // AI's explanation for the change
  assigned_to: UUID (FK -> User, nullable)
  reviewed_by: UUID (FK -> User, nullable)
  reviewed_at: timestamp (nullable)
  review_notes: text (nullable)
  policy_rule_id: string (nullable)  // which policy triggered this
  created_at: timestamp
  expires_at: timestamp (nullable)
}
```

---

### Policy Pack

Workspace-level policy configuration.

```
PolicyPack {
  id: UUID (PK)
  workspace_id: UUID (FK -> Workspace)
  name: string
  version: integer
  is_active: boolean
  rules: jsonb  // structured policy rules
  created_at: timestamp
  updated_at: timestamp
  created_by: UUID (FK -> User)
}
```

See [PRD-05: Policy Engine](./05-policy-engine.md) for rule schema detail.

---

### Channel Endpoint

Configured inbound/outbound channel connections.

```
ChannelEndpoint {
  id: UUID (PK)
  workspace_id: UUID (FK -> Workspace)
  channel_type: enum('email', 'slack', 'discord', 'mcp', 'webhook')
  direction: enum('inbound', 'outbound', 'bidirectional')
  config: jsonb  // encrypted credentials, webhook URLs, channel IDs
  is_active: boolean
  created_at: timestamp
  updated_at: timestamp
}
```

---

### Activity Event

Append-only log of all system events.

```
ActivityEvent {
  id: UUID (PK)
  workspace_id: UUID (FK -> Workspace)
  event_type: enum('ingest', 'classify', 'page_create', 'page_update', 'page_publish', 'query', 'answer', 'review_create', 'review_complete', 'lint', 'digest', 'channel_send', 'mcp_call')
  actor_type: enum('user', 'ai', 'system', 'mcp_agent')
  actor_id: string (nullable)
  target_type: string (nullable)  // e.g., 'source', 'page', 'review_task'
  target_id: UUID (nullable)
  detail: jsonb
  created_at: timestamp
}
```

---

### Graph Node / Edge

Derived graph relationships (materialized for query performance).

```
GraphNode {
  id: UUID (PK)
  workspace_id: UUID (FK -> Workspace)
  node_type: enum('page', 'entity', 'concept', 'source')
  ref_id: UUID  // FK to the actual object
  label: string
  metadata: jsonb
  updated_at: timestamp
}

GraphEdge {
  id: UUID (PK)
  workspace_id: UUID (FK -> Workspace)
  edge_type: enum('cites', 'mentions', 'related_to', 'parent_of', 'derived_from', 'contradicts')
  source_node_id: UUID (FK -> GraphNode)
  target_node_id: UUID (FK -> GraphNode)
  weight: float (nullable)
  metadata: jsonb
  updated_at: timestamp
}
```

---

### Collection

Grouping mechanism for pages (custom implementation — not derived from AFFiNE collection code).

```
Collection {
  id: UUID (PK)
  workspace_id: UUID (FK -> Workspace)
  name: string
  name_ko: string (nullable)
  collection_type: enum('inbox', 'project', 'entities', 'concepts', 'briefs', 'review_queue', 'knowledge_index', 'activity_log', 'custom')
  description: text (nullable)
  sort_order: integer
  created_at: timestamp
  updated_at: timestamp
}
```

---

### Saved Query / Digest

Saved search queries and scheduled digest configurations.

```
SavedQuery {
  id: UUID (PK)
  workspace_id: UUID (FK -> Workspace)
  name: string
  query_text: string
  filters: jsonb
  schedule_cron: string (nullable)  // for digest generation
  output_channel_id: UUID (FK -> ChannelEndpoint, nullable)
  last_run_at: timestamp (nullable)
  created_by: UUID (FK -> User)
  created_at: timestamp
}
```

---

### Page Template

User-defined templates that guide AI compilation output structure.

```
PageTemplate {
  id: UUID (PK)
  workspace_id: UUID (FK -> Workspace)
  name: string  // e.g., "Competitive Analysis"
  page_type: enum('project', 'entity', 'concept', 'brief', 'answer', 'summary', 'comparison', 'custom')
  trigger_conditions: jsonb  // source_types, topic_match, entity_types
  sections: jsonb  // ordered section definitions with headings and AI guidance
  ai_instructions: text (nullable)  // additional AI guidance
  is_active: boolean
  created_at: timestamp
  updated_at: timestamp
  created_by: UUID (FK -> User)
}
```

---

### Compilation Trace

Records AI reasoning for page creation/update decisions.

```
CompilationTrace {
  id: UUID (PK)
  page_id: UUID (FK -> CanonicalPage)
  source_ids: UUID[]  // sources that triggered this compilation
  template_id: UUID (FK -> PageTemplate, nullable)
  compilation_level: enum('L0', 'L1', 'L2')  // full regen, section patch, surgical
  reasoning: text  // AI's reasoning summary
  decisions: jsonb  // structured trace decisions
  model_used: string
  token_usage: jsonb  // { input: number, output: number }
  created_at: timestamp
}
```

> **Storage policy:** Full traces stored for REVIEW_REQUIRED and DRAFT_ONLY paths. Summary metadata only for AUTO_PUBLISH to control storage costs.

---

### Embedding (Vector Search)

```
PageEmbedding {
  id: UUID (PK)
  page_id: UUID (FK -> CanonicalPage)
  chunk_index: integer
  chunk_text: text
  embedding: vector(1536)  // pgvector
  created_at: timestamp
}

SourceEmbedding {
  id: UUID (PK)
  source_id: UUID (FK -> Source)
  chunk_index: integer
  chunk_text: text
  embedding: vector(1536)
  created_at: timestamp
}
```

---

## Default Collections (Per Workspace)

Every new workspace is initialized with these collections:

| Collection | Type | Description |
|------------|------|-------------|
| Inbox | `inbox` | Newly ingested items awaiting processing |
| Projects | `project` | Project-scoped knowledge pages |
| Entities | `entities` | Entity pages (people, orgs, products) |
| Concepts | `concepts` | Concept/topic pages |
| Briefs | `briefs` | AI-generated briefs and answer pages |
| Review Queue | `review_queue` | Items pending human review |
| Knowledge Index | `knowledge_index` | Catalog of all canonical pages |
| Activity Log | `activity_log` | System event timeline |

---

## Database Indexes (Key)

```sql
-- Source deduplication
CREATE UNIQUE INDEX idx_source_content_hash ON source(workspace_id, content_hash);

-- Page search
CREATE INDEX idx_page_workspace_type ON canonical_page(workspace_id, page_type, status);
CREATE INDEX idx_page_slug ON canonical_page(workspace_id, slug);

-- Entity lookup
CREATE INDEX idx_entity_workspace_type ON entity(workspace_id, entity_type);
CREATE INDEX idx_entity_name ON entity(workspace_id, name);

-- Citation joins
CREATE INDEX idx_citation_page ON citation(page_id);
CREATE INDEX idx_citation_source ON citation(source_id);

-- Review queue
CREATE INDEX idx_review_workspace_status ON review_task(workspace_id, status);

-- Activity log time-series
CREATE INDEX idx_activity_workspace_time ON activity_event(workspace_id, created_at DESC);

-- Graph traversal
CREATE INDEX idx_graph_edge_source ON graph_edge(source_node_id);
CREATE INDEX idx_graph_edge_target ON graph_edge(target_node_id);

-- Vector search
CREATE INDEX idx_page_embedding ON page_embedding USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_source_embedding ON source_embedding USING ivfflat (embedding vector_cosine_ops);
```

---

## Related Documents

- [PRD-03: Source Vault](./03-source-vault.md)
- [PRD-05: Policy Engine](./05-policy-engine.md) — PolicyPack rule schema
- [PRD-06: Knowledge Pages](./06-knowledge-pages.md) — Page lifecycle
