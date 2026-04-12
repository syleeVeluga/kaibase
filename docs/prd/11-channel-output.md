# PRD-11: Channel & Notifications

> Parent: [PRD-00 Overview](./00-overview.md)  
> Status: Draft

---

## Purpose

The Channel & Notification system delivers outputs from the knowledge space to users through multiple channels: web app notifications, email digests, Slack/Discord messages, and MCP responses.

> **Note:** External app integrations (Slack, Discord, email) are Phase 1 features. Phase 0 focuses on web app notifications only. This document defines the full architecture so Phase 1 implementation is straightforward.

---

## Channel Types

| Channel | Direction | Phase | Description |
|---------|-----------|-------|-------------|
| **Web App** | Outbound | 0 | In-app notification center |
| **Email** | Inbound + Outbound | 1 | Inbound: workspace email → ingest. Outbound: digests, review alerts |
| **Slack** | Inbound + Outbound | 1 | Inbound: channel messages → ingest. Outbound: summaries, alerts |
| **Discord** | Inbound + Outbound | 1 | Same as Slack |
| **MCP** | Inbound + Outbound | 1 | Inbound: agent calls. Outbound: structured responses |
| **Webhook** | Outbound | 2 | Generic webhook for custom integrations |

---

## Notification Types (Phase 0 — Web App)

| Notification | Trigger | Recipient |
|-------------|---------|-----------|
| Source ingested | New source processed | Source submitter / connector owner |
| Page created | AI created new page | Workspace members |
| Page updated | AI updated existing page | Page watchers |
| Review requested | ReviewTask created | Assigned reviewer |
| Review completed | ReviewTask approved/rejected | Task creator |
| Lint finding | Health check found issue | Workspace admins |
| Answer ready | Q&A answer generated | Questioner |

---

## Digest System (Phase 1)

Digests aggregate activity over a time period and deliver as formatted summaries.

```typescript
interface DigestConfig {
  id: string;
  workspace_id: string;
  name: string;
  schedule: 'daily' | 'weekly' | 'custom';
  cron_expression?: string;        // for custom schedule
  channel_endpoint_id: string;     // where to send
  include: DigestSection[];
  language: 'en' | 'ko' | 'both';
  max_items_per_section: number;
}

type DigestSection =
  | 'new_pages'
  | 'updated_pages'
  | 'pending_reviews'
  | 'lint_findings'
  | 'top_queries'
  | 'new_sources'
  | 'entity_updates';
```

---

## Outbox Pattern

All outbound messages use an outbox pattern for reliability:

```
Event occurs (page created, review needed, etc.)
         |
    Write to Notification table (outbox)
         |
    BullMQ job: "notification-send"
         |
    ChannelAdapter formats message for target channel
         |
    Delivery attempt
    ├── Success → mark as delivered
    └── Failure → retry with exponential backoff (max 3 retries)
         |
    Log ActivityEvent (type: 'channel_send')
```

---

## Channel Adapter Architecture

```typescript
interface ChannelAdapter {
  channel_type: string;
  
  // Format a notification for this channel
  format(notification: Notification, language: 'en' | 'ko'): FormattedMessage;
  
  // Send the formatted message
  send(message: FormattedMessage, endpoint: ChannelEndpoint): Promise<DeliveryResult>;
  
  // Check endpoint health/validity
  validate(endpoint: ChannelEndpoint): Promise<boolean>;
}
```

### Phase 0 Adapters
- `WebAppAdapter` — pushes to in-app notification center via WebSocket/SSE

### Phase 1 Adapters (deferred implementation)
- `EmailAdapter` — sends via SMTP (Nodemailer)
- `SlackAdapter` — posts via Slack Web API
- `DiscordAdapter` — posts via discord.js

### Phase 2 Adapters (deferred)
- `WebhookAdapter` — generic HTTP POST

---

## Inbound Channel Processing (Phase 1)

### Email Inbound
- Dedicated email address per workspace (e.g., `workspace-slug@ingest.livingwiki.cloud`)
- Parse MIME: extract subject, body, attachments
- Create Source record with `source_type: 'email'`
- Attachments → SourceAttachment records

### Slack Inbound
- Slack bot installed in workspace
- Listen to configured channels via Slack Events API
- Messages with content → Source records
- Threads captured as context
- Reactions/emoji can trigger priority rules

### Discord Inbound
- Discord bot in configured servers/channels
- Similar to Slack: message → Source records
- Thread context preserved

---

## API Endpoints (Phase 0)

```
GET   /api/v1/workspaces/:wid/notifications              -- list notifications for current user
POST  /api/v1/workspaces/:wid/notifications/:nid/read    -- mark as read
POST  /api/v1/workspaces/:wid/notifications/read-all     -- mark all as read
GET   /api/v1/workspaces/:wid/notifications/unread-count  -- unread count
```

### Phase 1 Additional Endpoints
```
GET   /api/v1/workspaces/:wid/channels                   -- list channel endpoints
POST  /api/v1/workspaces/:wid/channels                   -- configure channel endpoint
PUT   /api/v1/workspaces/:wid/channels/:cid              -- update channel config
GET   /api/v1/workspaces/:wid/digests                    -- list digest configs
POST  /api/v1/workspaces/:wid/digests                    -- create digest config
POST  /api/v1/workspaces/:wid/digests/:did/send-now      -- manually trigger digest
```

---

## FR10: Channel Output

### Acceptance Criteria (Phase 0)

- [ ] Web app notification center shows all notification types
- [ ] Notifications are real-time (WebSocket or SSE)
- [ ] Users can mark notifications as read
- [ ] Unread count badge visible in navigation

### Acceptance Criteria (Phase 1 — deferred)

- [ ] Email digests sent on configured schedule
- [ ] Slack/Discord summary messages sent to configured channels
- [ ] Inbound email creates Source records
- [ ] Inbound Slack/Discord messages create Source records
- [ ] Failed deliveries retry with exponential backoff

---

## Related Documents

- [PRD-02: Data Model](./02-data-model.md) — ChannelEndpoint schema
- [PRD-05: Policy Engine](./05-policy-engine.md) — Channel collection rules
- [PRD-12: MCP Server](./12-mcp-server.md) — MCP as a channel
