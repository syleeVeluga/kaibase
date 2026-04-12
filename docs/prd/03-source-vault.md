# PRD-03: Source Vault & Ingestion

> Parent: [PRD-00 Overview](./00-overview.md)  
> Status: Draft

---

## Purpose

The Source Vault is the immutable reference layer for all raw materials entering the system. Sources are **not duplicated** into Kaibase storage — they stay where the user already keeps them (local folders, Google Drive, S3, etc.). Kaibase stores references (paths, URIs, storage keys) and extracted content (text, metadata, embeddings). All downstream knowledge (canonical pages, entities, citations) traces back to source references in this vault.

**Design philosophy:** Users should not need to "upload" documents into yet another system. They point Kaibase at their existing folders and storage, and the system watches for changes. This dramatically lowers adoption friction.

---

## Source Connector Model

### How Connected Sources Work

```
User's Existing Storage
  ├── Local folder (~/Documents/project-alpha/)
  ├── Google Drive (shared team folder)
  ├── S3 bucket (s3://company-docs/)
  └── ...
       |
  Source Connector (watches for new/changed files)
       |
  Detects new or modified file
       |
  Sends IngestEvent to Intake Gateway
       |
  System stores:
  ├── Source reference (URI, path, connector_id, last_synced_at)
  ├── Extracted content (content_text, metadata)
  ├── Content hash (SHA-256 for change detection)
  └── Embeddings (pgvector)
       |
  Original file is NEVER copied or moved
```

### Connector Types

| Connector | Phase | Watch Method | Authentication |
|-----------|-------|-------------|----------------|
| **Local folder** | Phase 0 | File system watcher (via desktop agent) | None (local) |
| **Web file upload** | Phase 0 | Direct upload (fallback for ad-hoc files) | Session auth |
| **URL submission** | Phase 0 | One-time fetch | None |
| **Text input** | Phase 0 | Direct entry | Session auth |
| **Google Drive** | Phase 1 | Drive API push notifications / polling | OAuth 2.0 |
| **S3 / GCS** | Phase 1 | S3 event notifications / polling | IAM credentials |
| **Dropbox / OneDrive** | Phase 2 | Webhook / polling | OAuth 2.0 |
| **Email inbound** | Phase 1 | Dedicated workspace email address | SMTP webhook |
| **Slack inbound** | Phase 1 | Bot listens to configured channels | Slack OAuth |
| **Discord inbound** | Phase 1 | Bot listens to configured channels | Bot token |
| **MCP inbound** | Phase 1 | External agents send data via MCP `ingest_source` tool | MCP auth |

### Change Detection

When a connector detects a file change:
1. Recompute `content_hash` (SHA-256 of extracted content)
2. If hash differs from stored hash → create new `IngestEvent` (update type)
3. AI Compiler re-processes and updates affected canonical pages
4. Previous source version is preserved (version history)

---

## Ingest Channels (Legacy — kept for backward compatibility)

### Phase 0 (V1 Launch)
- **Connected local folder** — primary ingest method; user configures folder paths via desktop agent
- **Web file upload** — drag-and-drop or file picker (PDF, DOCX, XLSX, TXT, MD, images) — secondary/ad-hoc
- **URL submission** — user pastes a URL; system fetches and stores content
- **Text input** — direct text entry via web app

> Implementation note (Apr 2026): the verified fallback ingest path is currently markdown web upload plus direct text input. The markdown upload path is validated end-to-end through parse and source status progression. Broader file-type coverage and object-storage-backed direct upload handling remain follow-up work.

### Phase 1
- **Cloud storage connectors** — Google Drive, S3/GCS (see connector table above)
- **Email inbound** — dedicated workspace email address; system parses and stores
- **Slack inbound** — bot listens to configured channels
- **Discord inbound** — bot listens to configured channels
- **MCP inbound** — external agents send data via MCP `ingest_source` tool

---

## Ingest Flow

```
User/Channel Input
       |
  Intake Gateway
       |
  +----+----+
  |         |
  v         v
Dedupe   Normalize
Check    & Parse
  |         |
  +----+----+
       |
  Policy Engine
       |
  +----+----+----+
  |    |    |    |
  v    v    v    v
 AUTO DRAFT REV  BLOCK
       |
  Store to Source Vault
       |
  Create SourceAttachments (if any)
       |
  Queue AI Compiler Job
       |
  Log ActivityEvent
```

---

## Supported File Types

| Category | Extensions | Parsing Strategy |
|----------|-----------|-----------------|
| Documents | PDF, DOCX, XLSX, PPTX, TXT, MD, HTML | Text extraction + metadata |
| Images | PNG, JPG, JPEG, GIF, WEBP, SVG | OCR (optional) + metadata |
| Data | CSV, TSV, JSON, XML | Structured parsing |
| Archives | ZIP | Extract and process individually |
| Links | URL | Fetch page content, store snapshot |

---

## Deduplication

- Compute `content_hash` (SHA-256 of normalized content) on ingest
- Check against existing sources in the same workspace
- If duplicate found:
  - Do not create new Source record
  - Optionally notify user
  - Log as `ActivityEvent(type: 'ingest', detail: { deduplicated: true })`

---

## Storage Architecture

| Data | Storage |
|------|---------|
| Source metadata, content_text, status, **source_uri** | PostgreSQL `source` table |
| **Source reference** (connector_id, original_path, storage_uri, last_synced_at) | PostgreSQL `source_connector_ref` table |
| Binary files (only for direct uploads and URL snapshots) | Object Storage (S3-compatible) |
| Extracted text from attachments | PostgreSQL `source_attachment.content_text` |
| Source embeddings | PostgreSQL `source_embedding` table (pgvector) |

> **Key distinction:** For connected sources (local folders, cloud storage), the binary file stays in the user's original location. Kaibase stores only the reference URI and extracted content. For direct uploads and URL submissions, the binary is stored in Kaibase's object storage as a fallback.

---

## Parsing & Normalization

Each source type goes through a normalization pipeline:

1. **File upload** — Extract text via appropriate parser (pdf-parse, mammoth for docx, etc.). Store raw binary in object storage, extracted text in `content_text`.
2. **URL** — Fetch page with readability extraction. Store HTML snapshot and extracted text.
3. **Email** — Parse MIME, extract body text, separate attachments. Each attachment becomes a `SourceAttachment`.
4. **Slack/Discord message** — Store message text, thread context, and any attachments.
5. **MCP input** — Accept structured payload, store as-is with metadata.
6. **Text input** — Store directly.

---

## Immutability Contract

- Source records are **insert-only** after creation
- The only mutable fields are `status` (processing state) and `last_synced_at` (connector sync timestamp)
- `content_text`, `raw_metadata`, and binary files are never modified
- When a connected source file changes, a new version record is created (previous version preserved)
- Kaibase never modifies the original file in the user's storage
- Deleting sources requires admin action and creates an audit trail

---

## FR1: Source Collection (Functional Requirement)

> Users can connect existing folders/storage and submit materials via upload, URL, email, Slack/Discord, or MCP.

### Acceptance Criteria

- [ ] Users can connect a local folder path; system watches for new/changed files (via desktop agent)
- [ ] Connected source changes are detected and re-processed automatically
- [ ] Web upload accepts files up to 100MB per file (fallback for ad-hoc files)
- [ ] URL submission fetches and stores page content within 30 seconds
- [ ] Text input accepts up to 100,000 characters
- [ ] Each ingest creates a Source record with proper `source_type`, `channel`, and `connector_id`
- [ ] Connected sources store reference URI only (binary stays in original location)
- [ ] Direct uploads store binary in object storage with proper `storage_key`
- [ ] Duplicate content is detected and handled without creating duplicate records
- [ ] All ingests are logged as ActivityEvents
- [ ] Failed ingests set `status: 'failed'` with error detail in metadata

---

## API Endpoints (Phase 0)

```
-- Source Connectors
POST   /api/v1/workspaces/:workspaceId/connectors            -- register a source connector (folder path, etc.)
GET    /api/v1/workspaces/:workspaceId/connectors             -- list connectors
PUT    /api/v1/workspaces/:workspaceId/connectors/:connId     -- update connector config
DELETE /api/v1/workspaces/:workspaceId/connectors/:connId     -- disconnect
POST   /api/v1/workspaces/:workspaceId/connectors/:connId/sync -- trigger manual sync

-- Sources
POST   /api/v1/workspaces/:workspaceId/sources          -- upload file/text/URL (ad-hoc)
GET    /api/v1/workspaces/:workspaceId/sources           -- list sources (paginated)
GET    /api/v1/workspaces/:workspaceId/sources/:sourceId -- get source detail
GET    /api/v1/workspaces/:workspaceId/sources/:sourceId/attachments -- list attachments
GET    /api/v1/workspaces/:workspaceId/sources/:sourceId/attachments/:id/download -- download
GET    /api/v1/workspaces/:workspaceId/sources/:sourceId/versions -- list source versions (for connected sources)
```

---

## Related Documents

- [PRD-02: Data Model](./02-data-model.md) — Source, SourceAttachment schemas
- [PRD-04: AI Compiler](./04-ai-compiler.md) — Processing after ingest
- [PRD-05: Policy Engine](./05-policy-engine.md) — Policy evaluation on ingest
