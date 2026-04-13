# Monorepo Structure — Kaibase

> Last Updated: 2026-04-13

---

## Local Development Startup

Use `corepack yarn` for local commands in this repo.

- `corepack yarn docker:up` starts PostgreSQL, Redis, and MinIO.
- `corepack yarn dev` starts the full local stack: web, API, and workers.
- `corepack yarn dev:web` starts only the Vite frontend.
- `corepack yarn dev:api` starts only the Hono API server.
- `corepack yarn dev:workers` starts only the BullMQ workers.

For source uploads, page compilation, and review generation to progress beyond `pending`, the workers process must be running.

---

## Directory Layout

```
kaibase/
│
├── apps/
│   ├── web/                          # Main React web application
│   │   ├── src/
│   │   │   ├── main.tsx              # Entry point
│   │   │   ├── App.tsx               # Root component with router
│   │   │   ├── router.tsx            # Route definitions
│   │   │   │
│   │   │   ├── theme/                # Design tokens & global styles
│   │   │   │   ├── tokens.css.ts     # Color, spacing, typography tokens
│   │   │   │   ├── global.css.ts     # Global CSS reset and base styles
│   │   │   │   └── sprinkles.css.ts  # Utility style atoms (optional)
│   │   │   │
│   │   │   ├── locales/              # i18n translation files
│   │   │   │   ├── en/
│   │   │   │   │   ├── common.json
│   │   │   │   │   ├── pages.json
│   │   │   │   │   ├── qa.json
│   │   │   │   │   ├── reviews.json
│   │   │   │   │   ├── graph.json
│   │   │   │   │   ├── settings.json
│   │   │   │   │   ├── notifications.json
│   │   │   │   │   └── errors.json
│   │   │   │   └── ko/
│   │   │   │       ├── common.json
│   │   │   │       ├── pages.json
│   │   │   │       ├── qa.json
│   │   │   │       ├── reviews.json
│   │   │   │       ├── graph.json
│   │   │   │       ├── settings.json
│   │   │   │       ├── notifications.json
│   │   │   │       └── errors.json
│   │   │   │
│   │   │   ├── components/           # Shared UI components
│   │   │   │   ├── layout/
│   │   │   │   │   ├── Sidebar.tsx
│   │   │   │   │   ├── Sidebar.css.ts
│   │   │   │   │   ├── Header.tsx
│   │   │   │   │   └── Header.css.ts
│   │   │   │   ├── common/
│   │   │   │   │   ├── Button.tsx
│   │   │   │   │   ├── Button.css.ts
│   │   │   │   │   ├── Modal.tsx
│   │   │   │   │   ├── Input.tsx
│   │   │   │   │   └── ...
│   │   │   │   └── notifications/
│   │   │   │       ├── NotificationCenter.tsx
│   │   │   │       └── NotificationCenter.css.ts
│   │   │   │
│   │   │   ├── features/             # Feature modules
│   │   │   │   ├── onboarding/       # Progressive onboarding flow
│   │   │   │   │   ├── OnboardingFlow.tsx
│   │   │   │   │   ├── ConnectFolderStep.tsx
│   │   │   │   │   ├── CompileWatchStep.tsx
│   │   │   │   │   └── ExploreStep.tsx
│   │   │   │   │
│   │   │   │   ├── connectors/       # Source connector management UI
│   │   │   │   │   ├── ConnectorList.tsx
│   │   │   │   │   ├── ConnectorSetup.tsx
│   │   │   │   │   └── SyncStatus.tsx
│   │   │   │   │
│   │   │   │   ├── auth/
│   │   │   │   │   ├── LoginPage.tsx
│   │   │   │   │   ├── RegisterPage.tsx
│   │   │   │   │   ├── hooks/
│   │   │   │   │   │   └── useAuth.ts
│   │   │   │   │   └── api/
│   │   │   │   │       └── authApi.ts
│   │   │   │   │
│   │   │   │   ├── workspace/
│   │   │   │   │   ├── WorkspaceDashboard.tsx
│   │   │   │   │   ├── WorkspaceSettings.tsx
│   │   │   │   │   └── ...
│   │   │   │   │
│   │   │   │   ├── sources/
│   │   │   │   │   ├── SourceList.tsx
│   │   │   │   │   ├── SourceDetail.tsx
│   │   │   │   │   ├── UploadPanel.tsx
│   │   │   │   │   └── ...
│   │   │   │   │
│   │   │   │   ├── pages/
│   │   │   │   │   ├── PageList.tsx
│   │   │   │   │   ├── PageEditor.tsx        # BlockSuite integration
│   │   │   │   │   ├── PageMetaPanel.tsx
│   │   │   │   │   └── ...
│   │   │   │   │
│   │   │   │   ├── qa/
│   │   │   │   │   ├── QAInterface.tsx
│   │   │   │   │   ├── AnswerCard.tsx
│   │   │   │   │   └── ...
│   │   │   │   │
│   │   │   │   ├── reviews/
│   │   │   │   │   ├── ReviewQueue.tsx
│   │   │   │   │   ├── ReviewDetail.tsx
│   │   │   │   │   ├── DiffView.tsx
│   │   │   │   │   └── ...
│   │   │   │   │
│   │   │   │   ├── graph/                    # Phase 1
│   │   │   │   │   ├── GraphView.tsx
│   │   │   │   │   └── ...
│   │   │   │   │
│   │   │   │   ├── activity/
│   │   │   │   │   ├── ActivityTimeline.tsx
│   │   │   │   │   └── ...
│   │   │   │   │
│   │   │   │   └── settings/
│   │   │   │       ├── PolicyEditor.tsx
│   │   │   │       ├── MemberManager.tsx
│   │   │   │       └── ...
│   │   │   │
│   │   │   ├── hooks/                # Global hooks
│   │   │   │   ├── useWorkspace.ts
│   │   │   │   ├── useNotifications.ts
│   │   │   │   └── useI18n.ts
│   │   │   │
│   │   │   └── lib/                  # Utilities
│   │   │       ├── api-client.ts     # Typed API client
│   │   │       ├── ws-client.ts      # WebSocket client
│   │   │       └── blocksuite.ts     # BlockSuite setup helpers
│   │   │
│   │   ├── index.html
│   │   ├── vite.config.ts            # Vite 7.2.7 config
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── api/                          # Hono API server
│   │   ├── src/
│   │   │   ├── index.ts              # Server entry point
│   │   │   ├── app.ts                # Hono app setup with middleware
│   │   │   │
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts           # JWT validation
│   │   │   │   ├── workspace.ts      # Workspace context injection
│   │   │   │   ├── rbac.ts           # Role-based access check
│   │   │   │   ├── rate-limit.ts     # Rate limiting
│   │   │   │   └── error-handler.ts  # Global error handling
│   │   │   │
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts           # /api/v1/auth/*
│   │   │   │   ├── workspaces.ts     # /api/v1/workspaces/*
│   │   │   │   ├── connectors.ts     # /api/v1/workspaces/:wid/connectors/*
│   │   │   │   ├── sources.ts        # /api/v1/workspaces/:wid/sources/*
│   │   │   │   ├── pages.ts          # /api/v1/workspaces/:wid/pages/*
│   │   │   │   ├── collections.ts    # /api/v1/workspaces/:wid/collections/*
│   │   │   │   ├── qa.ts             # /api/v1/workspaces/:wid/qa/*
│   │   │   │   ├── reviews.ts        # /api/v1/workspaces/:wid/reviews/*
│   │   │   │   ├── activity.ts       # /api/v1/workspaces/:wid/activity/*
│   │   │   │   ├── policy.ts         # /api/v1/workspaces/:wid/policy/*
│   │   │   │   ├── search.ts         # /api/v1/workspaces/:wid/search
│   │   │   │   ├── graph.ts          # /api/v1/workspaces/:wid/graph/* (Phase 1)
│   │   │   │   ├── notifications.ts  # /api/v1/workspaces/:wid/notifications/*
│   │   │   │   └── mcp-admin.ts      # /api/v1/workspaces/:wid/mcp/* (Phase 1)
│   │   │   │
│   │   │   └── services/
│   │   │       ├── connector.service.ts
│   │   │       ├── source.service.ts
│   │   │       ├── page.service.ts
│   │   │       ├── collection.service.ts
│   │   │       ├── qa.service.ts
│   │   │       ├── review.service.ts
│   │   │       ├── activity.service.ts
│   │   │       ├── search.service.ts
│   │   │       ├── notification.service.ts
│   │   │       └── workspace.service.ts
│   │   │
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── workers/                      # BullMQ worker processes
│   │   ├── src/
│   │   │   ├── index.ts              # Worker bootstrap
│   │   │   ├── queues.ts             # Queue definitions
│   │   │   │
│   │   │   ├── ingest/
│   │   │   │   ├── classify.worker.ts
│   │   │   │   ├── summarize.worker.ts
│   │   │   │   ├── extract.worker.ts     # Entity/concept extraction
│   │   │   │   └── parse.worker.ts       # File parsing
│   │   │   │
│   │   │   ├── compile/
│   │   │   │   ├── page-create.worker.ts
│   │   │   │   ├── page-update.worker.ts
│   │   │   │   ├── citation.worker.ts
│   │   │   │   └── embedding.worker.ts
│   │   │   │
│   │   │   ├── query/
│   │   │   │   └── answer.worker.ts
│   │   │   │
│   │   │   ├── lint/                     # Phase 2
│   │   │   │   └── health-check.worker.ts
│   │   │   │
│   │   │   ├── graph/                    # Phase 1
│   │   │   │   └── recompute.worker.ts
│   │   │   │
│   │   │   └── notification/
│   │   │       ├── send.worker.ts
│   │   │       └── digest.worker.ts      # Phase 1
│   │   │
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── mcp-server/                   # MCP server (Phase 1)
│       ├── src/
│       │   ├── index.ts
│       │   ├── tools/
│       │   │   ├── read-tools.ts
│       │   │   └── write-tools.ts
│       │   └── auth.ts
│       ├── tsconfig.json
│       └── package.json
│
├── packages/
│   ├── shared/                       # Shared types and utilities
│   │   ├── src/
│   │   │   ├── types/                # TypeScript type definitions
│   │   │   │   ├── workspace.ts
│   │   │   │   ├── source.ts
│   │   │   │   ├── page.ts
│   │   │   │   ├── entity.ts
│   │   │   │   ├── review.ts
│   │   │   │   ├── policy.ts
│   │   │   │   ├── activity.ts
│   │   │   │   ├── graph.ts
│   │   │   │   ├── notification.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── schemas/              # Zod validation schemas
│   │   │   │   ├── workspace.schema.ts
│   │   │   │   ├── source.schema.ts
│   │   │   │   ├── page.schema.ts
│   │   │   │   ├── policy.schema.ts
│   │   │   │   ├── qa.schema.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   └── utils/
│   │   │       ├── id.ts             # UUID generation
│   │   │       ├── hash.ts           # Content hashing
│   │   │       └── language.ts       # Language detection helpers
│   │   │
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── db/                           # Database schema and migrations
│   │   ├── src/
│   │   │   ├── schema/               # Drizzle table definitions
│   │   │   │   ├── workspace.ts
│   │   │   │   ├── user.ts
│   │   │   │   ├── source.ts
│   │   │   │   ├── page.ts
│   │   │   │   ├── entity.ts
│   │   │   │   ├── concept.ts
│   │   │   │   ├── citation.ts
│   │   │   │   ├── review.ts
│   │   │   │   ├── policy.ts
│   │   │   │   ├── activity.ts
│   │   │   │   ├── graph.ts
│   │   │   │   ├── collection.ts
│   │   │   │   ├── notification.ts
│   │   │   │   ├── embedding.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── migrations/           # Drizzle migration files
│   │   │   ├── seed.ts               # Backfill script for existing workspaces (collections auto-seeded at workspace creation)
│   │   │   └── client.ts             # Database connection setup
│   │   │
│   │   ├── drizzle.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── ai/                           # AI/LLM integration
│   │   ├── src/
│   │   │   ├── providers/
│   │   │   │   ├── openai.ts
│   │   │   │   ├── anthropic.ts
│   │   │   │   └── provider.interface.ts
│   │   │   │
│   │   │   ├── prompts/              # Versioned prompt templates
│   │   │   │   ├── classify.ts
│   │   │   │   ├── summarize.ts
│   │   │   │   ├── extract-entities.ts
│   │   │   │   ├── create-page.ts
│   │   │   │   ├── update-page.ts
│   │   │   │   ├── answer-question.ts
│   │   │   │   ├── detect-contradiction.ts
│   │   │   │   └── generate-digest.ts
│   │   │   │
│   │   │   ├── embeddings.ts         # Embedding generation
│   │   │   └── index.ts
│   │   │
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── policy/                       # Policy engine core
│   │   ├── src/
│   │   │   ├── engine.ts             # Policy evaluation logic
│   │   │   ├── rules.ts              # Rule matching
│   │   │   ├── defaults.ts           # Default policy pack
│   │   │   └── index.ts
│   │   │
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── connectors/                   # Source connector implementations
│   │   ├── src/
│   │   │   ├── base.ts               # Base connector interface
│   │   │   ├── local-folder.ts       # Local folder watcher (Phase 0a)
│   │   │   ├── google-drive.ts       # Google Drive connector (Phase 1)
│   │   │   ├── s3.ts                 # S3/GCS connector (Phase 1)
│   │   │   └── index.ts
│   │   │
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── editor/                       # BlockSuite integration + custom blocks
│       ├── src/
│       │   ├── setup.ts              # BlockSuite initialization (registers AffineSchemas + lwc:* blocks)
│       │   ├── blocks/               # Custom block definitions (lwc:* namespace, NEW files — proprietary)
│       │   │   ├── citation-block.ts          # lwc:citation — inline source reference
│       │   │   ├── entity-mention-block.ts    # lwc:entity-mention — auto-linked entity
│       │   │   ├── review-status-block.ts     # lwc:review-status — page review indicator
│       │   │   ├── source-panel-block.ts      # lwc:source-panel — embedded source evidence
│       │   │   └── index.ts
│       │   ├── sync.ts               # Custom Y.Doc WebSocket sync provider (Yjs MIT)
│       │   └── index.ts
│       │
│       ├── tsconfig.json
│       └── package.json
│
├── docker/
│   ├── docker-compose.yml            # Local dev: Postgres + Redis + MinIO
│   ├── docker-compose.prod.yml       # Production template
│   ├── Dockerfile.api
│   ├── Dockerfile.workers
│   ├── Dockerfile.web
│   └── init-db.sql                   # pgvector extension setup
│
├── .github/
│   └── workflows/
│       ├── ci.yml                    # Lint, type-check, test
│       ├── build.yml                 # Build all apps
│       └── deploy.yml                # Deploy pipeline
│
├── package.json                      # Root workspace config
├── yarn.lock
├── .yarnrc.yml
├── .nvmrc
├── tsconfig.base.json                # Shared TS config
├── .eslintrc.cjs                     # ESLint config
├── .prettierrc                       # Prettier config
└── README.md
```

---

## Workspace Configuration (package.json root)

```json
{
  "name": "kaibase",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "packageManager": "yarn@4.13.0",
  "engines": {
    "node": ">=24.0.0 <25.0.0"
  },
  "scripts": {
    "dev": "yarn workspaces foreach -A -p run dev",
    "dev:web": "yarn workspace @kaibase/web dev",
    "dev:api": "yarn workspace @kaibase/api dev",
    "dev:workers": "yarn workspace @kaibase/workers dev",
    "build": "yarn workspaces foreach -A -t run build",
    "test": "yarn workspaces foreach -A run test",
    "lint": "yarn workspaces foreach -A run lint",
    "typecheck": "yarn workspaces foreach -A run typecheck",
    "db:generate": "yarn workspace @kaibase/db generate",
    "db:migrate": "yarn workspace @kaibase/db migrate",
    "db:seed": "yarn workspace @kaibase/db seed",
    "docker:up": "docker compose -f docker/docker-compose.yml up -d",
    "docker:down": "docker compose -f docker/docker-compose.yml down"
  }
}
```

---

## Package Naming Convention

All workspace packages use the `@kaibase/` scope:

| Package | Name |
|---------|------|
| apps/web | `@kaibase/web` |
| apps/api | `@kaibase/api` |
| apps/workers | `@kaibase/workers` |
| apps/mcp-server | `@kaibase/mcp-server` |
| packages/shared | `@kaibase/shared` |
| packages/db | `@kaibase/db` |
| packages/ai | `@kaibase/ai` |
| packages/policy | `@kaibase/policy` |
| packages/connectors | `@kaibase/connectors` |
| packages/editor | `@kaibase/editor` |

---

## Docker Compose (Local Development)

```yaml
# docker/docker-compose.yml
services:
  postgres:
    image: pgvector/pgvector:pg18
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: lwc
      POSTGRES_PASSWORD: lwc_dev
      POSTGRES_DB: kaibase
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-db.sql:/docker-entrypoint-initdb.d/init.sql

  redis:
    image: redis:8.6
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  minio:
    image: minio/minio:latest
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: lwc_minio
      MINIO_ROOT_PASSWORD: lwc_minio_dev
    command: server /data --console-address ":9001"
    volumes:
      - minio_data:/data

volumes:
  postgres_data:
  redis_data:
  minio_data:
```

---

## Related Documents

- [Implementation Plan](./00-implementation-plan.md)
- [Stack Versions](./01-stack-versions.md)
- [Claude Code Instructions](./02-claude-code-instructions.md)
