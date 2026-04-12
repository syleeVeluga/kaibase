# Stack Version Lock — Kaibase

> Last Updated: 2026-04-11  
> This file defines the exact versions for all dependencies. AI code generation tools and developers must use these versions unless explicitly told otherwise.

---

## Runtime

| Package | Version | Notes |
|---------|---------|-------|
| Node.js | 24.14.1 LTS | Runtime for all backend services |
| Yarn | 4.13.0 | Package manager (monorepo workspaces) |

---

## Frontend

| Package | Version | Notes |
|---------|---------|-------|
| react | 19.2.x | UI framework |
| react-dom | 19.2.x | React DOM renderer |
| typescript | 6.0.2 | Type system |
| vite | 7.2.7 | Build tool for main web app (BlockSuite compatibility) |
| vite (standalone) | 8.0.5 | Build tool for admin/marketing subapps |
| @vanilla-extract/css | 1.18.0 | CSS-in-TS styling |
| @vanilla-extract/vite-plugin | 5.0.0 | Vite integration for vanilla-extract |
| @tanstack/react-query | 5.97.0 | Data fetching and caching |
| zod | 4.3.6 | Schema validation (shared frontend/backend) |
| react-i18next | latest stable | i18n framework |
| i18next | latest stable | i18n core |
| date-fns | latest stable | Date formatting with locale support |

---

## Editor / Collaboration

| Package | Version | Notes |
|---------|---------|-------|
| @blocksuite/presets | 0.19.5 | BlockSuite editor presets — PageEditor, EdgelessEditor (MPL 2.0, use as-is) |
| @blocksuite/blocks | 0.19.5 | Standard block schemas incl. AffineSchemas (MPL 2.0, use as-is) |
| @blocksuite/store | 0.19.5 | Document store — Doc, Schema, DocCollection (MPL 2.0, use as-is) |
| yjs | 13.6.30 | CRDT engine for real-time collaboration (MIT license) |

> **Note:** BlockSuite packages are MPL 2.0. Do NOT modify BlockSuite source files — this triggers copyleft obligations. Custom blocks must be in separate new files with `lwc:*` namespace. Pin to 0.19.5 initially. Upgrade only after compatibility and license review.

---

## Graph Visualization

| Package | Version | Notes |
|---------|---------|-------|
| react-force-graph | 1.48.2 | Force-directed graph (Phase 1) |

---

## Backend

| Package | Version | Notes |
|---------|---------|-------|
| hono | 4.12.x | API framework |
| drizzle-orm | 0.45.2 | TypeScript-first ORM |
| drizzle-kit | latest compatible | Migration tooling |
| bullmq | 5.69.3 | Background job queue |
| pgvector (node) | 0.2.1 | Vector search integration |
| pino | latest stable | Structured logging |
| jose | latest stable | JWT handling |
| bcrypt | latest stable | Password hashing |

---

## Database / Infrastructure

| Technology | Version | Notes |
|-----------|---------|-------|
| PostgreSQL | 18.3 | Primary database |
| Redis | 8.6.2 | Queue, cache, pub/sub |
| pgvector | latest (PostgreSQL extension) | Vector similarity search |
| MinIO | latest stable | S3-compatible object storage (dev) |

---

## AI / LLM

| Package | Version | Notes |
|---------|---------|-------|
| openai | 6.33.0 | OpenAI API client |
| @anthropic-ai/sdk | 0.86.1 | Anthropic API client |

---

## MCP (Phase 1)

| Package | Version | Notes |
|---------|---------|-------|
| @modelcontextprotocol/sdk | 1.29.0 | MCP server SDK |

---

## Channel Adapters (Phase 1)

| Package | Version | Notes |
|---------|---------|-------|
| @slack/web-api | 7.15.0 | Slack integration |
| discord.js | 14.25.1 | Discord integration |
| nodemailer | latest stable | Email sending |

---

## Testing

| Package | Version | Notes |
|---------|---------|-------|
| vitest | 4.0.x | Unit and integration testing |
| @playwright/test | latest stable | E2E testing |
| @testing-library/react | latest stable | React component testing |

---

## Version Policy

1. **Exact pinning** in package.json for all dependencies listed above.
2. **BlockSuite packages (MPL 2.0)** stay on versions compatible with BlockSuite 0.19.5. Review license on each upgrade.
3. **Vite 7.2.7** for the main web app; Vite 8.0.5 only for standalone admin/marketing apps.
4. **Monthly dependency audit** to check for security patches within pinned major versions.
5. **Breaking version upgrades** require a dedicated PR with compatibility testing.

---

## .nvmrc

```
v24.14.1
```

## .yarnrc.yml

```yaml
nodeLinker: node-modules
yarnPath: .yarn/releases/yarn-4.13.0.cjs
```
