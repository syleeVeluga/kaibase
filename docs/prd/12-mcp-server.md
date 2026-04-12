# PRD-12: MCP Server

> Parent: [PRD-00 Overview](./00-overview.md)  
> Status: Draft

---

## Purpose

Kaibase exposes a custom MCP (Model Context Protocol) server that allows external AI agents, IDEs, and tools to interact with the knowledge space. The MCP server is a **domain action API** — not a low-level editor — meaning all operations go through the Policy Engine.

> **Note:** MCP integration is a Phase 1 feature. This document defines the full specification so implementation can proceed cleanly when Phase 1 begins. Phase 0 should implement the underlying service layer so MCP tools map directly to existing internal APIs.

---

## Design Principles

1. **Domain actions, not raw editing** — MCP tools represent meaningful knowledge operations, not file/block-level mutations.
2. **Policy-governed** — Every MCP write action goes through the same Policy Engine as web-initiated actions.
3. **Authenticated** — Each MCP connection is scoped to a workspace with proper API key/token.
4. **Audited** — All MCP calls logged as ActivityEvents with `actor_type: 'mcp_agent'`.
5. **Self-hosted server** — Custom implementation on `@modelcontextprotocol/sdk`. No AFFiNE product code dependency.

---

## MCP Tools (V1)

### Read Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `search_knowledge` | Search canonical pages and sources | `query: string`, `filters?: { page_type?, collection?, language? }`, `limit?: number` |
| `get_page` | Get a specific page with content | `page_id: string` |
| `get_source` | Get a specific source with metadata | `source_id: string` |
| `list_recent_activity` | List recent activity events | `event_types?: string[]`, `limit?: number`, `since?: string` |
| `list_collections` | List workspace collections | — |
| `list_entities` | List entities with optional type filter | `entity_type?: string`, `limit?: number` |
| `get_graph_subgraph` | Get graph around a focal node | `node_id: string`, `depth?: number` |

### Write Tools (Policy-Governed)

| Tool | Description | Parameters | Policy Check |
|------|-------------|------------|-------------|
| `ingest_source` | Submit new source material | `content: string`, `source_type: string`, `title?: string`, `metadata?: object` | Yes |
| `propose_page` | Propose a new canonical page | `title: string`, `content: string`, `page_type: string`, `collection?: string`, `citations?: Citation[]` | Yes |
| `propose_page_update` | Propose an update to existing page | `page_id: string`, `proposed_changes: string`, `reasoning: string`, `citations?: Citation[]` | Yes |
| `ask_workspace` | Ask a question and get cited answer | `question: string`, `language?: 'en' \| 'ko'` | No (read-only) |
| `create_review_task` | Create a review task | `task_type: string`, `description: string`, `target_page_id?: string` | Yes |
| `publish_digest` | Trigger a digest generation | `digest_config_id?: string`, `sections?: string[]` | Yes |

---

## Authentication

MCP connections are authenticated via workspace-scoped API keys:

```typescript
interface MCPCredential {
  id: string;
  workspace_id: string;
  name: string;                    // human-readable name (e.g., "Cursor IDE", "GitHub Agent")
  api_key_hash: string;           // hashed API key
  permissions: MCPPermission[];   // which tools this key can access
  rate_limit: number;             // requests per minute
  created_by: string;             // user who created this key
  created_at: string;
  last_used_at?: string;
  is_active: boolean;
}

type MCPPermission = 
  | 'read:pages'
  | 'read:sources'
  | 'read:activity'
  | 'read:graph'
  | 'write:ingest'
  | 'write:propose_page'
  | 'write:propose_update'
  | 'write:ask'
  | 'write:review_task'
  | 'write:digest';
```

---

## MCP Server Implementation

Built on `@modelcontextprotocol/sdk` (v1.29.0):

```
MCP Client (Cursor, Claude, GPT, custom agent)
         |
    MCP Protocol (stdio or SSE transport)
         |
    Living Wiki MCP Server
         |
    Auth middleware (validate API key, check permissions)
         |
    Route to internal service
    ├── SearchService
    ├── PageService
    ├── SourceService
    ├── QAService
    ├── ReviewService
    ├── ActivityService
    └── GraphService
         |
    Policy Engine check (for write operations)
         |
    Execute and return result
         |
    Log ActivityEvent (actor_type: 'mcp_agent')
```

---

## Management API (for workspace admins)

```
GET    /api/v1/workspaces/:wid/mcp/credentials           -- list MCP API keys
POST   /api/v1/workspaces/:wid/mcp/credentials           -- create new API key
DELETE /api/v1/workspaces/:wid/mcp/credentials/:cid       -- revoke API key
GET    /api/v1/workspaces/:wid/mcp/credentials/:cid/usage -- usage statistics
```

---

## FR9: MCP Access

### Acceptance Criteria (Phase 1)

- [ ] MCP server exposes all listed read and write tools
- [ ] All write tools pass through Policy Engine
- [ ] MCP connections authenticated via workspace API keys
- [ ] Permissions are granular per API key
- [ ] Rate limiting enforced per API key
- [ ] All MCP calls logged as ActivityEvents
- [ ] MCP server supports both stdio and SSE transports
- [ ] `ask_workspace` returns cited answers matching Q&A Service quality

---

## Related Documents

- [PRD-04: AI Compiler](./04-ai-compiler.md) — AI capabilities exposed via MCP
- [PRD-05: Policy Engine](./05-policy-engine.md) — Policy governs MCP writes
- [PRD-07: Q&A Service](./07-qa-service.md) — `ask_workspace` implementation
- [PRD-10: Activity Log](./10-activity-log.md) — MCP call logging
