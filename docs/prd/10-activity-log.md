# PRD-10: Activity Log

> Parent: [PRD-00 Overview](./00-overview.md)  
> Status: Draft

---

## Purpose

The Activity Log is an append-only record of every significant event in the system. It maps to Karpathy's LLM Wiki `log.md` concept — a complete audit trail of ingest, query, lint, review, and publish actions.

---

## Design Principles

1. **Append-only** — Events are never modified or deleted.
2. **Workspace-scoped** — Each workspace has its own activity stream.
3. **Comprehensive** — Every AI action, user action, and system event is logged.
4. **Traceable** — Events link to their targets (sources, pages, review tasks).
5. **Replayable** — The event stream can reconstruct the history of any object.

---

## Event Types

| Event Type | Actor | Description |
|-----------|-------|-------------|
| `ingest` | user / system / mcp_agent | New source ingested |
| `classify` | ai | Source classified into section/project/topic |
| `page_create` | ai / user | New canonical page created |
| `page_update` | ai / user | Existing page updated |
| `page_publish` | ai / user / system | Page published (from draft or review) |
| `page_archive` | user / system | Page archived |
| `query` | user / mcp_agent | Question asked |
| `answer` | ai | Answer generated |
| `answer_promote` | user / ai | Answer promoted to page |
| `review_create` | ai / system | Review task created |
| `review_complete` | user | Review task approved or rejected |
| `lint` | ai | Health check run |
| `lint_finding` | ai | Specific lint issue found |
| `digest` | system | Digest generated and sent |
| `channel_send` | system | Output sent to a channel |
| `mcp_call` | mcp_agent | External MCP tool invocation |
| `policy_decision` | system | Policy engine evaluation result |
| `entity_create` | ai | New entity extracted |
| `concept_create` | ai | New concept extracted |
| `graph_update` | system | Graph recomputed |

---

## Event Schema

```typescript
interface ActivityEvent {
  id: string;
  workspace_id: string;
  event_type: EventType;
  actor_type: 'user' | 'ai' | 'system' | 'mcp_agent';
  actor_id?: string;              // user ID, agent ID, or null for system
  target_type?: string;           // 'source', 'page', 'review_task', 'entity', etc.
  target_id?: string;             // ID of the target object
  detail: Record<string, any>;    // event-specific payload
  created_at: string;             // ISO 8601 timestamp
}
```

### Detail Payload Examples

```typescript
// ingest event
{ source_type: 'file_upload', filename: 'report.pdf', channel: 'web', size_bytes: 524288 }

// classify event
{ source_id: '...', classification: { section: 'projects', project: 'alpha', topic: 'architecture' }, confidence: 0.92 }

// page_create event
{ page_id: '...', page_type: 'summary', title: 'Report Analysis', source_ids: ['...'], citation_count: 3 }

// policy_decision event
{ rule_id: '...', rule_name: 'Review MCP writes', outcome: 'REVIEW_REQUIRED', input_summary: '...' }

// query event
{ question: 'How does auth work?', language: 'en', canonical_hits: 5, raw_hits: 2 }

// lint_finding event
{ finding_type: 'stale_claim', page_id: '...', description: 'Claim about pricing is 6 months old', severity: 'medium' }
```

---

## Activity Log UI

The Activity Log collection in the web app provides:

- **Timeline view** — chronological event stream with filters
- **Filter by**: event type, actor type, target type, date range
- **Event detail** — clicking an event shows full context with links to related objects
- **Object history** — view all events related to a specific page, source, or entity
- **Export** — CSV/JSON export for external analysis

---

## Retention Policy

- Default: events retained indefinitely
- Workspace admins can configure retention period (minimum 90 days)
- Archived events can be exported before deletion

---

## API Endpoints

```
GET  /api/v1/workspaces/:wid/activity                    -- list events (paginated, filterable)
GET  /api/v1/workspaces/:wid/activity/:eid               -- get event detail
GET  /api/v1/workspaces/:wid/activity/by-target/:type/:tid -- events for a specific object
GET  /api/v1/workspaces/:wid/activity/stats               -- activity statistics (counts by type, time series)
GET  /api/v1/workspaces/:wid/activity/export              -- export events as CSV/JSON
```

---

## FR8: Activity Log

### Acceptance Criteria

- [ ] All event types listed above are logged when they occur
- [ ] Events are append-only (no modification or deletion via API)
- [ ] Each event records actor, target, and detail payload
- [ ] Activity log is viewable in the web UI with filtering
- [ ] Object-specific history is accessible (all events for a given page/source)
- [ ] Events include proper timestamps in ISO 8601 format
- [ ] Activity log supports pagination for large workspaces

---

## Related Documents

- [PRD-02: Data Model](./02-data-model.md) — ActivityEvent schema
- [PRD-04: AI Compiler](./04-ai-compiler.md) — AI action logging
- [PRD-05: Policy Engine](./05-policy-engine.md) — Policy decision logging
