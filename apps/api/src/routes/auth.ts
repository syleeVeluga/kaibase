import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { signToken } from '../middleware/auth.js';
import { AppError } from '../middleware/error-handler.js';
import { db } from '@kaibase/db/client';
import { users } from '@kaibase/db/schema';
import { eq } from 'drizzle-orm';
import { generateId } from '@kaibase/shared';
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

authRoutes.post('/register', zValidator('json', registerSchema), async (c) => {
  const { email, password, name } = c.req.valid('json');

  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) {
    throw new AppError(409, 'EMAIL_EXISTS', 'errors.emailExists');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const id = generateId();

  await db.insert(users).values({ id, email, name, passwordHash });

  const token = await signToken({ sub: id, email });
  return c.json({ token, user: { id, email, name } }, 201);
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

  const token = await signToken({ sub: user.id, email: user.email });
  return c.json({ token, user: { id: user.id, email: user.email, name: user.name } });
});
