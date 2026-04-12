# PRD-08: Review Queue & Approval Flow

> Parent: [PRD-00 Overview](./00-overview.md)  
> Status: Draft

---

## Purpose

The Review Queue is where AI-generated changes await human approval. When the Policy Engine determines a change is `REVIEW_REQUIRED`, a ReviewTask is created and the proposed change is held until a designated reviewer approves or rejects it.

---

## Review Task Lifecycle

```
AI Action triggers REVIEW_REQUIRED
         |
    Create ReviewTask
    (status: pending, proposed_change stored)
         |
    Notify assigned reviewer(s)
         |
    Reviewer opens task in Review Queue UI
         |
    ┌─────┴─────┐
    │           │
  Approve    Reject
    │           │
    ▼           ▼
  Execute    Return to draft
  proposed   with reviewer
  change     feedback
    │           │
    ▼           ▼
  PUBLISHED  DRAFT (editable)
    │           │
    ▼           ▼
  Log event  Log event
```

---

## Review Task Types

| Type | Trigger | What Reviewer Sees |
|------|---------|-------------------|
| `page_creation` | AI created a new page | Full page preview with source citations. **Phase 0a/0b:** L0 strategy = AI generates full page; reviewer sees complete output + compilation trace. |
| `page_update` | AI wants to update existing page | Diff view: current vs. proposed changes. **Phase 0a/0b:** L0 strategy = AI regenerates full page; diff shows all changes from regeneration. **Phase 1+:** L1 strategy = only changed sections shown. |
| `classification` | AI classified a source but confidence is low | Source content + proposed classification + alternatives |
| `contradiction` | AI detected conflicting claims | Both claims side-by-side with sources |
| `stale_content` | Lint AI found outdated information | Flagged content + suggested update |
| `lint_issue` | Other lint findings (orphan, duplicate, etc.) | Issue description + AI recommendation |

---

## Reviewer Assignment

Reviewers are determined by:

1. **Policy rule** — specific rule can name reviewer user IDs
2. **Collection owner** — owner of the target collection
3. **Workspace admin** — fallback if no specific reviewer
4. **Round-robin** — distribute among eligible reviewers

---

## Review Queue UI

The Review Queue provides:

- **Task list** — filterable by type, status, date, assigned reviewer
- **Task detail** — full context for the review decision:
  - Source material that triggered the task
  - AI's proposed action with reasoning
  - Diff view for page updates
  - Citation links to evidence
  - AI confidence score
- **Action buttons** — Approve / Reject / Edit then Approve / Reassign
- **Batch actions** — approve/reject multiple tasks at once (for trusted patterns)
- **Expiration** — tasks can auto-expire per policy (returns to DRAFT)

---

## Review Notification

When a ReviewTask is created:
- In-app notification to assigned reviewer(s)
- Optional email notification (per user preference)
- Optional Slack/Discord notification (Phase 1, per workspace policy)

When a ReviewTask is completed:
- Notify the AI action initiator (if user-triggered)
- Log the decision in Activity Log

---

## API Endpoints

```
GET    /api/v1/workspaces/:wid/reviews                  -- list review tasks (paginated, filterable)
GET    /api/v1/workspaces/:wid/reviews/:rid              -- get review task detail
POST   /api/v1/workspaces/:wid/reviews/:rid/approve      -- approve task
POST   /api/v1/workspaces/:wid/reviews/:rid/reject       -- reject task (with feedback)
POST   /api/v1/workspaces/:wid/reviews/:rid/reassign     -- reassign to different reviewer
GET    /api/v1/workspaces/:wid/reviews/stats              -- review queue statistics
```

---

## FR4: Review Queue

### Acceptance Criteria

- [ ] All REVIEW_REQUIRED policy outcomes create a ReviewTask
- [ ] ReviewTasks appear in the Review Queue UI
- [ ] Reviewers see full context: source, proposed change, AI reasoning, citations
- [ ] Page updates show diff view (current vs. proposed)
- [ ] Approve action publishes the proposed change
- [ ] Reject action returns the page to draft with reviewer feedback
- [ ] Reviewer assignment follows policy rules → collection owner → workspace admin fallback
- [ ] Tasks can expire per policy configuration
- [ ] All review decisions are logged as ActivityEvents
- [ ] Review queue has filtering and search

---

## Related Documents

- [PRD-05: Policy Engine](./05-policy-engine.md) — REVIEW_REQUIRED outcome
- [PRD-06: Knowledge Pages](./06-knowledge-pages.md) — Page lifecycle
- [PRD-10: Activity Log](./10-activity-log.md) — Review decision logging
