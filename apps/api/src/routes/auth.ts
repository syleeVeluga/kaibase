import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  authMiddleware,
} from '../middleware/auth.js';
import { AppError } from '../middleware/error-handler.js';
import { db } from '@kaibase/db/client';
import { users, workspaces, workspaceMembers, policyPacks } from '@kaibase/db/schema';
import { eq } from 'drizzle-orm';
import { generateId } from '@kaibase/shared';
import { getDefaultPolicyPack } from '@kaibase/policy';
import type { AppEnv } from '../types.js';

export const authRoutes = new Hono<AppEnv>();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(255),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const refreshSchema = z.object({
  refreshToken: z.string(),
});

const updateProfileSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  avatarUrl: z.string().url().nullish(),
});

authRoutes.post('/register', zValidator('json', registerSchema), async (c) => {
  const { email, password, name } = c.req.valid('json');

  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) {
    throw new AppError(409, 'EMAIL_EXISTS', 'errors.emailExists');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const id = generateId();

  await db.insert(users).values({ id, email, name, passwordHash });

  const accessToken = await signAccessToken({ sub: id, email });
  const refreshToken = await signRefreshToken({ sub: id, email });

  return c.json(
    { accessToken, refreshToken, user: { id, email, name } },
    201,
  );
});

authRoutes.post('/login', zValidator('json', loginSchema), async (c) => {
  const { email, password } = c.req.valid('json');

  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const user = rows[0];
  if (!user) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'errors.invalidCredentials');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'errors.invalidCredentials');
  }

  const accessToken = await signAccessToken({ sub: user.id, email: user.email });
  const refreshToken = await signRefreshToken({ sub: user.id, email: user.email });

  return c.json({
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, name: user.name },
  });
});

authRoutes.post('/refresh', zValidator('json', refreshSchema), async (c) => {
  const { refreshToken } = c.req.valid('json');

  let payload: { sub: string; email: string };
  try {
    payload = await verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError(401, 'INVALID_TOKEN', 'errors.invalidToken');
  }

  const rows = await db.select().from(users).where(eq(users.id, payload.sub)).limit(1);
  if (rows.length === 0) {
    throw new AppError(401, 'INVALID_TOKEN', 'errors.invalidToken');
  }

  const accessToken = await signAccessToken({ sub: payload.sub, email: payload.email });
  const newRefreshToken = await signRefreshToken({ sub: payload.sub, email: payload.email });

  return c.json({ accessToken, refreshToken: newRefreshToken });
});

authRoutes.get('/me', authMiddleware(), async (c) => {
  const { userId } = c.get('user');

  const rows = await db.select({
    id: users.id,
    email: users.email,
    name: users.name,
    avatarUrl: users.avatarUrl,
    createdAt: users.createdAt,
  }).from(users).where(eq(users.id, userId)).limit(1);

  if (rows.length === 0) {
    throw new AppError(404, 'NOT_FOUND', 'errors.notFound');
  }

  return c.json({ user: rows[0] });
});

authRoutes.put('/me', authMiddleware(), zValidator('json', updateProfileSchema), async (c) => {
  const { userId } = c.get('user');
  const updates = c.req.valid('json');

  const rows = await db
    .update(users)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
      avatarUrl: users.avatarUrl,
    });

  if (rows.length === 0) {
    throw new AppError(404, 'NOT_FOUND', 'errors.notFound');
  }

  return c.json({ user: rows[0] });
});

authRoutes.post('/logout', authMiddleware(), async (c) => {
  // Stateless JWT — client discards tokens. Server-side token revocation
  // can be added later with a Redis blocklist if needed.
  return c.json({ success: true });
});

// Dev-only: one-click login without credentials
authRoutes.post('/dev-login', async (c) => {
  if (process.env['NODE_ENV'] === 'production') {
    throw new AppError(404, 'NOT_FOUND', 'errors.notFound');
  }

  const DEV_EMAIL = 'dev@kaibase.local';
  const DEV_NAME = 'Dev User';

  // Upsert dev user
  const existing = await db.select().from(users).where(eq(users.email, DEV_EMAIL)).limit(1);
  let devUser: { id: string; email: string; name: string };

  if (existing[0]) {
    devUser = { id: existing[0].id, email: existing[0].email, name: existing[0].name };
  } else {
    const id = generateId();
    const passwordHash = await bcrypt.hash('dev-password', 4); // fast hash for dev
    await db.insert(users).values({ id, email: DEV_EMAIL, name: DEV_NAME, passwordHash });
    devUser = { id, email: DEV_EMAIL, name: DEV_NAME };
  }

  // Auto-create workspace if user has none
  const memberRows = await db
    .select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, devUser.id))
    .limit(1);

  if (memberRows.length === 0) {
    const wsId = generateId();
    await db.transaction(async (tx) => {
      await tx.insert(workspaces).values({
        id: wsId,
        name: 'Dev Workspace',
        slug: 'dev-workspace',
      });
      await tx.insert(workspaceMembers).values({
        workspaceId: wsId,
        userId: devUser.id,
        role: 'owner',
      });
      const packId = generateId();
      const defaultPack = getDefaultPolicyPack(wsId, packId);
      await tx.insert(policyPacks).values({
        id: packId,
        workspaceId: wsId,
        name: defaultPack.name,
        version: defaultPack.version,
        isActive: true,
        rules: defaultPack.rules,
        defaultOutcome: defaultPack.defaultOutcome,
        createdBy: devUser.id,
      });
    });
  }

  const accessToken = await signAccessToken({ sub: devUser.id, email: devUser.email });
  const refreshToken = await signRefreshToken({ sub: devUser.id, email: devUser.email });

  return c.json({ accessToken, refreshToken, user: devUser });
});
