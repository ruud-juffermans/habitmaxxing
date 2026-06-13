import type { Request, Response } from 'express';
import { prisma } from '../db.js';
import { authConfig } from './config.js';
import { generateToken, hashToken } from './tokens.js';

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
  isGuest: boolean;
  role: 'user' | 'admin';
}

// Create a DB-backed session and set the httpOnly session cookie on the response.
export async function createSession(req: Request, res: Response, userId: string): Promise<void> {
  const { token, tokenHash } = generateToken();
  const expiresAt = new Date(Date.now() + authConfig.sessionTtlMs);

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      userAgent: req.get('user-agent')?.slice(0, 255) ?? null,
      ip: req.ip ?? null,
    },
  });

  res.cookie(authConfig.cookieName, token, {
    httpOnly: true,
    // SameSite=None mandates Secure; otherwise follow prod/explicit override.
    secure: authConfig.cookieSameSite === 'none' || authConfig.cookieSecure || authConfig.isProd,
    sameSite: authConfig.cookieSameSite,
    expires: expiresAt,
    path: '/',
  });
}

// Resolve the current user from the session cookie, or null when there is no
// valid, unexpired session. Expired sessions are cleaned up opportunistically.
export async function getSessionUser(req: Request): Promise<SessionUser | null> {
  const token = req.cookies?.[authConfig.cookieName];
  if (!token || typeof token !== 'string') return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session) return null;

  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  // A suspended account is treated as logged out everywhere (defense in depth;
  // suspending already revokes sessions). Drop the lingering session too.
  if (session.user.disabledAt) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    emailVerified: session.user.emailVerified,
    isGuest: session.user.isGuest,
    role: session.user.role,
  };
}

export async function destroySession(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.[authConfig.cookieName];
  if (token && typeof token === 'string') {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  res.clearCookie(authConfig.cookieName, { path: '/' });
}

// Invalidate every session for a user (used after a password reset/change).
export async function destroyAllSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}
