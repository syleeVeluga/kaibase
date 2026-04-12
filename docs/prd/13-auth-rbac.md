# PRD-13: Auth & RBAC

> Parent: [PRD-00 Overview](./00-overview.md)  
> Status: Draft

---

## Purpose

Authentication and Role-Based Access Control are handled as an external layer, separate from the knowledge compiler and document surface. This document defines the auth and permission model for Kaibase.

---

## Design Principles

1. **External auth layer** — Auth is not embedded in the document editor or AI compiler.
2. **Workspace-scoped permissions** — All access is scoped to workspaces.
3. **Simple role model** — Start with a small set of roles; expand only if needed.
4. **Standard protocols** — OAuth 2.0 / OIDC for authentication.

---

## Authentication

### Phase 0: Email/Password + OAuth

- Email/password registration and login
- OAuth 2.0 via Google (primary)
- OAuth 2.0 via GitHub (secondary)
- JWT-based session tokens
- Refresh token rotation

### Phase 1: Additional Providers

- SAML/OIDC for enterprise SSO
- API key authentication for MCP and programmatic access

---

## User Model

```typescript
interface User {
  id: string;
  email: string;
  name: string;
  display_name?: string;
  avatar_url?: string;
  locale: 'en' | 'ko';          // preferred language
  auth_provider: 'email' | 'google' | 'github' | 'saml';
  created_at: string;
  last_login_at?: string;
  is_active: boolean;
}
```

---

## Workspace Membership

```typescript
interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  joined_at: string;
  invited_by?: string;
}

type WorkspaceRole = 'owner' | 'admin' | 'editor' | 'reviewer' | 'viewer';
```

---

## Role Permissions

| Permission | Owner | Admin | Editor | Reviewer | Viewer |
|-----------|-------|-------|--------|----------|--------|
| Manage workspace settings | Yes | Yes | — | — | — |
| Manage members | Yes | Yes | — | — | — |
| Manage policy pack | Yes | Yes | — | — | — |
| Manage channel endpoints | Yes | Yes | — | — | — |
| Manage MCP credentials | Yes | Yes | — | — | — |
| Upload sources | Yes | Yes | Yes | — | — |
| Create pages manually | Yes | Yes | Yes | — | — |
| Edit pages | Yes | Yes | Yes | — | — |
| Ask questions (Q&A) | Yes | Yes | Yes | Yes | Yes |
| Approve/reject reviews | Yes | Yes | — | Yes | — |
| View pages | Yes | Yes | Yes | Yes | Yes |
| View sources | Yes | Yes | Yes | Yes | Yes |
| View activity log | Yes | Yes | Yes | Yes | — |
| View graph | Yes | Yes | Yes | Yes | Yes |
| Export data | Yes | Yes | — | — | — |
| Delete workspace | Yes | — | — | — | — |

---

## Workspace Isolation

- Complete data isolation between workspaces at the database level
- All queries include `workspace_id` filter
- Cross-workspace access is not possible
- Users can belong to multiple workspaces with different roles

---

## Invitation Flow

```
Admin invites user by email
         |
    System sends invitation email
         |
    Invitee clicks link
    ├── Existing user → added to workspace
    └── New user → registration flow → added to workspace
         |
    Default role assigned (configurable per workspace)
         |
    Log ActivityEvent
```

---

## API Endpoints

```
# Authentication
POST   /api/v1/auth/register                             -- register with email/password
POST   /api/v1/auth/login                                -- login
POST   /api/v1/auth/refresh                              -- refresh token
POST   /api/v1/auth/logout                               -- logout
GET    /api/v1/auth/oauth/:provider                      -- OAuth redirect
GET    /api/v1/auth/oauth/:provider/callback              -- OAuth callback
GET    /api/v1/auth/me                                   -- current user profile
PUT    /api/v1/auth/me                                   -- update profile

# Workspace Management
POST   /api/v1/workspaces                                -- create workspace
GET    /api/v1/workspaces                                -- list user's workspaces
GET    /api/v1/workspaces/:wid                           -- get workspace details
PUT    /api/v1/workspaces/:wid                           -- update workspace settings
DELETE /api/v1/workspaces/:wid                           -- delete workspace (owner only)

# Membership
GET    /api/v1/workspaces/:wid/members                   -- list members
POST   /api/v1/workspaces/:wid/members/invite            -- invite user
PUT    /api/v1/workspaces/:wid/members/:uid/role         -- change member role
DELETE /api/v1/workspaces/:wid/members/:uid               -- remove member
```

---

## Security Requirements

- Passwords hashed with bcrypt (cost factor 12+)
- JWT access tokens: 15-minute expiry
- Refresh tokens: 7-day expiry with rotation
- Rate limiting on auth endpoints (5 attempts per minute)
- CSRF protection on web app
- CORS restricted to known origins
- All API endpoints require authentication except registration/login/OAuth

---

## Related Documents

- [PRD-02: Data Model](./02-data-model.md) — User, WorkspaceMember schemas
- [PRD-05: Policy Engine](./05-policy-engine.md) — Policy interacts with role system
- [PRD-12: MCP Server](./12-mcp-server.md) — API key auth for MCP
