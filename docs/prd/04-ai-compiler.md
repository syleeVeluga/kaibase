# PRD-04: AI Knowledge Compiler

> Parent: [PRD-00 Overview](./00-overview.md)  
> Status: Draft

---

## Purpose

The AI Knowledge Compiler is the core intelligence layer. It transforms raw sources into structured, linked, searchable canonical knowledge. It consists of four sub-systems: **Ingest AI**, **Query AI**, **Lint AI**, and **Channel AI**.

### Design Principle: Single Source → Multiple Pages

Following Karpathy's LLM Wiki insight, a single new source is expected to affect **10–15 canonical pages** on average. A meeting note about "Project Alpha" might update the project page, 3 entity pages (people mentioned), 2 concept pages (technical topics), and the knowledge index. This fan-out is by design — it's the core mechanism of the compounding knowledge effect. The Ingest AI must always resolve: "which existing pages are touched?" before deciding to create new ones.

### Design Principle: Phased AI Writing Strategy

AI page writing evolves through 3 maturity levels. Phase 0 starts conservative; surgical block updates come later.

| Level | Strategy | When |
|-------|----------|------|
| **L0: Full Page Generation** | AI generates complete page content (markdown-like), converts to BlockSuite blocks, creates a new Y.Doc. For updates: regenerate the full page and present a diff for review. | **Phase 0** |
| **L1: Section-Level Patch** | AI identifies which sections (heading-delimited) need changes and generates replacement content for those sections only. Unchanged sections are preserved. | **Phase 1** |
| **L2: Surgical Block Update** | AI targets specific blocks (paragraphs, table rows, list items) for update via Y.Doc CRDT operations. Full understanding of block tree structure required. | **Phase 2+** |

**Rationale:** Surgical block updates (L2) require the AI to understand BlockSuite's block tree, issue correct CRDT operations, and handle concurrent edits. This is the hardest technical challenge in the system. Starting with L0 (full generation + diff) is pragmatic — it delivers value immediately while the system matures.

### Design Principle: Template-Driven Compilation

Users can define **page templates** that guide AI output structure. When a source matches template criteria, the AI generates content following the template's section structure.

```typescript
interface PageTemplate {
  id: string;
  workspace_id: string;
  name: string;                     // e.g., "Competitive Analysis"
  page_type: PageType;              // e.g., "brief"
  trigger_conditions: {             // when to apply this template
    source_types?: string[];        // e.g., ["report", "research"]
    topic_match?: string[];         // e.g., ["competitor", "competitive"]
    entity_types?: string[];        // e.g., ["organization"]
  };
  sections: TemplateSection[];      // ordered section definitions
  ai_instructions?: string;         // additional AI guidance for this template
}

interface TemplateSection {
  heading: string;                  // e.g., "Overview", "Product Comparison"
  description: string;              // AI guidance for what goes here
  required: boolean;
  block_types?: string[];           // allowed block types in this section
}
```

**Example:** A "Competitive Analysis" template with sections: Overview, Product Comparison, Pricing, Strengths/Weaknesses, Strategic Implications. When a source about a competitor is ingested, the AI fills each section from the source evidence.

This gives users a concrete handle to control AI output quality — they define the structure, AI fills the content.

---

## 4.1 Ingest AI

Processes newly ingested sources and compiles them into canonical knowledge. The Ingest AI is an **incremental compiler** — every new source triggers a targeted update to all related pages, not a full rebuild. This is the engine of the compounding knowledge loop.

### Pipeline

```
Source (new/updated)
       |
  Policy Check (already passed at Intake)
       |
  Classification
  (type, workspace section, project, topic, urgency)
       |
  Summarization (EN + KO if bilingual workspace)
       |
  Entity / Concept Extraction
       |
  Source-local Relation Triple Capture
  (candidate facts stored on the source for later resolution)
       |
  Page Matching ← KEY STEP
  "Which existing pages does this source touch?"
  Target: avg 10-15 pages per source
       |
  +----+-------+----------+
  |    |       |          |
  v    v       v          v
New  Update  Update    Update
Page Proj.  Entity    Concept
     Page   Pages     Pages
  |    |       |          |
  +----+-------+----------+
       |
  Attach Citations (to all updated pages)
       |
  Contradiction Detection
  (compare new claims against existing pages)
       |
  Review Task (if policy requires)
       |
  Activity Log
  (log all created/updated pages with source_id)
```

### Capabilities

| Capability | Description | Output |
|-----------|-------------|--------|
| `classify` | Determine source type, workspace section, project/topic | Classification metadata |
| `summarize` | Generate concise summary of source content | Summary text (EN + KO if bilingual workspace) |
| `extract_entities` | Identify people, organizations, products, technologies, locations | Entity records |
| `extract_concepts` | Identify abstract topics/themes | Concept records |
| `extract_relations` | Capture source-local entity/relation triples before page resolution | Candidate fact JSON stored on the source |
| `match_pages` | Find existing canonical pages related to this source | Page match list with confidence |
| `create_page` | Generate new canonical page from source(s) | CanonicalPage draft |
| `update_page` | Propose updates to existing page based on new source | Page update diff |
| `attach_citations` | Link page content to source evidence | Citation records |
| `detect_contradictions` | Compare new claims against existing pages | Contradiction alerts |
| `create_review_task` | Generate review task when policy or contradiction requires it | ReviewTask record |

### Classification Taxonomy

The AI classifies sources into:

- **Workspace section:** Which collection/area (project, entity, concept, etc.)
- **Project:** Specific project association (if applicable)
- **Topic:** Subject matter tags
- **Urgency:** normal / important / critical
- **Content type:** report, meeting_notes, feedback, incident, research, code, design, other

### Prototype Note: Source-local Candidate Facts

Phase 0 prototypes may capture candidate entity/relation triples directly on the source record before page matching is mature. This is a low-cost extraction step intended to preserve machine-readable facts for later entity resolution and page update logic.

- Candidate triples are stored as source-local JSON metadata, not as canonical graph truth.
- This step can run on the fast model tier to validate usability and the ingest pipeline before introducing a dedicated revalidation pass.
- Existing page matching may ignore these triples initially; preserving them early is still valuable because it reduces information loss between ingest and later resolution work.

---

## 4.2 Query AI

Answers user questions and turns valuable answers into knowledge assets.

### Flow

```
User Question
       |
  Parse & Understand Intent
       |
  Search Canonical Pages (primary)
       |
  Search Raw Sources (secondary, if needed)
       |
  Generate Answer with Citations
       |
  Evaluate Answer Value
       |
  +----+----+
  |         |
  v         v
Return   Promote to
Answer   Page/Brief
```

### Capabilities

| Capability | Description |
|-----------|-------------|
| `answer_with_citations` | Generate answer referencing canonical pages and/or sources |
| `compare_pages` | Compare two or more pages/sources on specific dimensions |
| `generate_brief` | Create a structured brief from multiple sources/pages |
| `save_as_page` | Promote an answer to a canonical page (with user approval or auto-mode) |

### Citation Requirements

- Every factual claim in an answer **must** reference at least one canonical page or source
- Citations include: page/source ID, relevant excerpt, confidence score
- Answers display citation markers that link to sources

### Answer Promotion Criteria

An answer is considered promotable when:
- It synthesizes information from 3+ sources
- It answers a question that has been asked more than once
- The user explicitly saves it
- Policy auto-promote rules match

---

## 4.3 Lint AI

Maintains knowledge space health through periodic checks.

### Health Check Types

| Check | Description | Trigger |
|-------|-------------|---------|
| `stale_claim` | Page content references outdated information | Scheduled (daily/weekly) |
| `orphan_page` | Page has no citations and no incoming links | Scheduled |
| `duplicate_page` | Two pages cover substantially the same topic | On page creation + scheduled |
| `contradiction` | Two pages make conflicting claims | On page update + scheduled |
| `missing_citation` | Page makes claims without source backing | Scheduled |
| `missing_link` | Related pages not linked to each other | Scheduled |
| `graph_isolation` | Graph nodes with no connections | Scheduled |
| `hub_overload` | Single page/entity has too many connections (possible over-tagging) | Scheduled |

### Output

Each issue found creates a `ReviewTask` with:
- `task_type` matching the check type
- `proposed_change` with AI's suggested fix
- `ai_reasoning` explaining why this was flagged

---

## 4.4 Channel AI

Formats output for different delivery channels.

| Channel | Format |
|---------|--------|
| Web app | Rich notification with links |
| Slack/Discord | Formatted summary message |
| Email | Digest HTML email |
| MCP | Structured JSON response |

### Digest Generation

- Configurable schedule per workspace (daily, weekly, custom)
- Summarizes: new pages, updated pages, pending reviews, lint findings
- Delivered to configured channels

---

## AI Worker Architecture

```
BullMQ Queue: "ai-ingest"
  -> IngestWorker (classification, summarization, extraction)

BullMQ Queue: "ai-page-compile"
  -> PageCompileWorker (page creation, update, citation)

BullMQ Queue: "ai-query"
  -> QueryWorker (Q&A, brief generation)

BullMQ Queue: "ai-lint"
  -> LintWorker (health checks)

BullMQ Queue: "ai-channel"
  -> ChannelWorker (formatting, digest generation)
```

### Worker Configuration

- Each worker type can use different LLM models/providers
- Model selection is configurable per workspace via Policy Pack
- Default: use most capable model for page compilation, faster model for classification
- All AI calls logged for auditability and cost tracking

---

## FR3: AI Page Writing (Functional Requirement)

> System creates new pages, proposes updates to existing pages, and links entities/concepts. A single source should affect multiple pages (target: avg 10–15).

### Acceptance Criteria

- [ ] New sources trigger automatic classification within 60 seconds
- [ ] AI generates summary in the workspace's configured language(s)
- [ ] Entities are extracted and matched to existing entity records (or new ones created)
- [ ] When a matching page exists (>80% relevance), system proposes an update rather than creating a new page
- [ ] All generated content includes citations to source material
- [ ] Page creation/update follows policy engine rules (auto-publish, draft, review-required)
- [ ] Contradictions with existing pages are flagged as review tasks
- [ ] Each ingest job logs the number of pages created/updated (metric: pages-per-source, target avg ≥ 5)
- [ ] Knowledge Index collection is updated whenever a new page is published

## FR5: Q&A with Citations (Functional Requirement)

> All answers include references to canonical pages or raw sources.

### Acceptance Criteria

- [ ] Answers search canonical pages first, raw sources second
- [ ] Every factual claim has at least one citation
- [ ] Citations are clickable/linkable to source material
- [ ] Users can save answers as pages/briefs with one action
- [ ] Answer language matches the query language (EN or KO)

## FR6: Answer Promotion (Functional Requirement)

> Users can save answers as pages/briefs; auto-save is policy-configurable.

### Acceptance Criteria

- [ ] "Save as page" button available on every Q&A answer
- [ ] Saved answers become canonical pages with proper citations
- [ ] Auto-promotion rules in policy pack are respected
- [ ] Promoted answers appear in the appropriate collection

---

## AI Quality Feedback Loop

AI writing quality must improve over time. Rejection patterns are the primary signal.

### Feedback Signals

| Signal | Source | Action |
|--------|--------|--------|
| Review rejection | ReviewTask rejected by user | Log rejection reason; adjust template/prompt weighting |
| Manual reclassification | User moves page to different collection | Retrain classification heuristics for this workspace |
| User edit after auto-publish | User significantly edits an auto-published page | Detect "heavy edit" (>30% content change); flag as implicit quality signal |
| Repeated question | Same question asked multiple times | Indicates the existing page didn't answer well; trigger page improvement |

### Adaptation Mechanism (Phase 1+)

1. **Per-workspace prompt tuning:** Accumulate rejection reasons and user edits into a workspace-specific `prompt_context` that is prepended to AI compilation prompts
2. **Template refinement suggestions:** If a template consistently produces rejected pages, flag it for user review
3. **Model escalation:** If rejection rate for a page type exceeds threshold, escalate from cheap model to capable model for that type
4. **Confidence recalibration:** Track actual approval rates vs. AI confidence scores; adjust confidence thresholds accordingly

---

## Compilation Trace

When AI creates or updates a page, the reasoning trace is stored for auditability and review support.

```typescript
interface CompilationTrace {
  id: string;
  page_id: string;
  source_ids: string[];           // sources that triggered this compilation
  template_id?: string;           // template used (if any)
  compilation_level: 'L0' | 'L1' | 'L2';  // which strategy was used
  reasoning: string;              // AI's reasoning for structural decisions
  decisions: TraceDecision[];     // key decisions made during compilation
  model_used: string;             // which LLM model was used
  token_usage: { input: number; output: number };
  created_at: string;
}

interface TraceDecision {
  type: 'page_match' | 'section_update' | 'entity_extract' | 'contradiction_found' | 'template_applied';
  description: string;            // e.g., "Matched to existing page 'Project Alpha' (confidence: 0.92)"
  evidence: string;               // relevant excerpt from source
}
```

**Usage:** When a reviewer sees a `REVIEW_REQUIRED` page, they can view the compilation trace to understand *why* the AI made specific decisions — not just *what* it wrote. This is critical for building trust in governed autonomy.

**Cost note:** Full traces are stored only for `REVIEW_REQUIRED` and `DRAFT_ONLY` paths. For `AUTO_PUBLISH`, only summary metadata (model, token count, source IDs) is stored to control storage costs.

---

## LLM Provider Strategy

- Support multiple providers (OpenAI, Anthropic) via adapter pattern
- Workspace policy can specify preferred provider/model
- Fallback chain: primary provider -> secondary provider
- All prompts versioned and stored for reproducibility
- Token usage tracked per workspace for billing
- **Model tiering by operation:** cheap/fast model for classification + embedding; capable model for page creation + Q&A; mid-tier for lint and summarization

---

## Related Documents

- [PRD-02: Data Model](./02-data-model.md) — CanonicalPage, Entity, Concept, Citation schemas
- [PRD-05: Policy Engine](./05-policy-engine.md) — Rules governing AI actions
- [PRD-07: Q&A Service](./07-qa-service.md) — Q&A API design
- [PRD-10: Activity Log](./10-activity-log.md) — AI action logging
- [PRD-16: AI Prompt Studio](./16-ai-prompt-studio.md) — Per-workspace AI prompt/model configuration UI
