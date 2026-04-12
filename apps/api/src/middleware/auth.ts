import type { MiddlewareHandler } from 'hono';
import * as jose from 'jose';
import { AppError } from './error-handler.js';

const JWT_SECRET = new TextEncoder().encode(process.env['JWT_SECRET'] ?? 'dev-secret-change-me');

export interface AuthUser {
  userId: string;
  email: string;
}

export function authMiddleware(): MiddlewareHandler {
  return async (c, next) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError(401, 'UNAUTHORIZED', 'errors.unauthorized');
    }

    const token = authHeader.slice(7);
    try {
      const { payload } = await jose.jwtVerify(token, JWT_SECRET);
      c.set('user', { userId: payload['sub'], email: payload['email'] } as AuthUser);
    } catch {
      throw new AppError(401, 'INVALID_TOKEN', 'errors.invalidToken');
    }

    await next();
  };
}

export async function signAccessToken(payload: { sub: string; email: string }): Promise<string> {
  return new jose.SignJWT({ ...payload, type: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(JWT_SECRET);
}

export async function signRefreshToken(payload: { sub: string; email: string }): Promise<string> {
  return new jose.SignJWT({ ...payload, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifyRefreshToken(token: string): Promise<{ sub: string; email: string }> {
  const { payload } = await jose.jwtVerify(token, JWT_SECRET);
  if (payload['type'] !== 'refresh') {
    throw new Error('Not a refresh token');
  }
  return { sub: payload['sub'] as string, email: payload['email'] as string };
}
