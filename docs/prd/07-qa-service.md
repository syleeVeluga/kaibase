# PRD-07: Q&A Service

> Parent: [PRD-00 Overview](./00-overview.md)  
> Status: Draft

---

## Purpose

The Q&A Service answers user questions with cited evidence, searching canonical pages first and raw sources second. Valuable answers can be promoted to canonical pages, turning ephemeral Q&A into persistent knowledge assets.

This service is the **Output → Re-deposit** stage of the accumulation loop. Every high-value answer that gets saved as a page enriches the wiki for future queries — this is where the compounding knowledge effect manifests most directly.

---

## Query Flow

```
User Question (text, EN or KO)
         |
    Language Detection
         |
    Intent Analysis
    (factual / comparative / exploratory / actionable)
         |
    Search Canonical Pages (primary)
    ├── Full-text search (tsvector)
    ├── Semantic search (pgvector)
    └── Hybrid ranking
         |
    Sufficient evidence?
    ├── Yes → Generate answer from canonical pages
    └── No  → Search Raw Sources (secondary)
              ├── Full-text search
              ├── Semantic search
              └── Merge with canonical results
         |
    Generate Answer with Citations
         |
    Evaluate Promotion Eligibility
    ├── Auto-promote (if policy allows + threshold met)
    ├── Suggest promotion to user
    └── No promotion (simple/one-off answer)
         |
    Track resolution source:
    ├── canonical_only = true (if no raw source fallback needed)
    └── canonical_only = false (if raw sources were used)
         |
    Log ActivityEvent (type: 'query' + 'answer' + resolution_source)
         |
    Return Answer to User
```

---

## Answer Structure

```typescript
interface QAAnswer {
  id: string;
  workspace_id: string;
  question: string;
  question_language: 'en' | 'ko';
  answer_text: string;
  answer_language: 'en' | 'ko';
  citations: AnswerCitation[];
  intent_type: 'factual' | 'comparative' | 'exploratory' | 'actionable';
  confidence: number;            // 0.0 - 1.0
  sources_used: {
    canonical_pages: number;     // count of pages referenced
    raw_sources: number;         // count of raw sources referenced
  };
  canonical_only_resolution: boolean;  // true if answered from canonical pages alone (no raw source fallback)
  promotion_eligible: boolean;
  promoted_to_page_id?: string;  // if promoted
  compilation_trace_id?: string; // reference to CompilationTrace (if promoted)
  created_at: string;
  created_by: string;            // user ID
}

interface AnswerCitation {
  type: 'canonical_page' | 'raw_source';
  ref_id: string;                // page ID or source ID
  title: string;
  excerpt: string;               // relevant quote
  relevance_score: number;
}
```

---

## Citation Requirements

1. Every factual claim must have at least one citation
2. Citations link to specific pages or sources with excerpts
3. Answer displays numbered citation markers (e.g., [1], [2])
4. User can click citations to navigate to the source
5. If no relevant evidence exists, AI states this clearly rather than hallucinating

---

## Answer Promotion (Output → Re-deposit)

Promoted answers close the accumulation loop: Q&A outputs become wiki inputs, raising the knowledge floor for every future query.

### Criteria for Promotion Eligibility

An answer is promotion-eligible when any of these conditions are met:

- Synthesizes information from 3+ distinct sources/pages
- The same or similar question has been asked before (dedup detection)
- Answer confidence > workspace-configured threshold
- User explicitly requests promotion
- Policy Pack has `auto_promote_answers: true` and threshold is met

### Promotion Process

1. User clicks "Save as Page" or auto-promotion triggers
2. System creates a new CanonicalPage of type `answer` or `brief`
3. Original citations transfer to the new page
4. **Compilation trace is generated** (see [PRD-04: Compilation Trace](./04-ai-compiler.md)) — records which sources informed the answer and the AI's reasoning
5. The promoted page is treated as a **new source event** — Ingest AI may discover further pages to update (e.g., entity pages that mention the answered topic)
6. Policy engine evaluates (may require review)
7. Page enters standard lifecycle (draft → published)
8. Knowledge Index collection is updated

### Accumulation Loop Metrics

Track these to verify the loop is healthy:

| Metric | Target | Description |
|--------|--------|-------------|
| Promotion rate | ≥ 20% of answered questions | Fraction of Q&A answers promoted to pages |
| Re-deposit depth | ≥ 2 pages updated per promoted answer | Pages updated by Ingest AI after promotion |
| Loop closure time | < 5 minutes | Time from Q&A answer to page appearing in search |

---

## Conversation Context

The Q&A service supports multi-turn conversations within a session:

- Previous questions and answers in the session inform context
- Users can refine or follow up on previous answers
- Session history is stored but separate from canonical pages
- Only explicitly promoted answers become pages

---

## API Endpoints

```
POST   /api/v1/workspaces/:wid/qa/ask                  -- ask a question
GET    /api/v1/workspaces/:wid/qa/history               -- list Q&A history (paginated)
GET    /api/v1/workspaces/:wid/qa/sessions/:sid         -- get session with full conversation
POST   /api/v1/workspaces/:wid/qa/answers/:aid/promote  -- promote answer to page
GET    /api/v1/workspaces/:wid/qa/suggested              -- suggested questions based on recent activity
```

---

## FR5: Q&A with Citations

### Acceptance Criteria

- [ ] Questions can be asked in English or Korean
- [ ] Answers are generated in the same language as the question
- [ ] Every factual claim has at least one citation
- [ ] Citations are clickable, linking to source pages/documents
- [ ] Canonical pages are searched before raw sources
- [ ] When no evidence exists, the system says so rather than fabricating

## FR6: Answer Promotion

### Acceptance Criteria

- [ ] "Save as Page" button on every answer
- [ ] Promoted answers become canonical pages with proper citations
- [ ] Auto-promotion respects workspace policy configuration
- [ ] Promoted pages appear in the Briefs collection by default unless policy overrides the target collection
- [ ] Duplicate question detection prevents redundant page creation

---

## Related Documents

- [PRD-04: AI Compiler](./04-ai-compiler.md) — Query AI capabilities
- [PRD-05: Policy Engine](./05-policy-engine.md) — Auto-promotion policy
- [PRD-06: Knowledge Pages](./06-knowledge-pages.md) — Page creation from answers
