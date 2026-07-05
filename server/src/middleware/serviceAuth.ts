import type { Request, Response, NextFunction } from 'express';
import { requireAuth, requireAdmin } from './auth.js';

// The central admin app (ruudjuffermans-infra) calls this service's admin API
// machine-to-machine, so it has no browser session. Instead it presents a shared
// secret in the X-Service-Token header. When that secret matches ADMIN_SERVICE_TOKEN
// we treat the request as a trusted admin and skip the session checks entirely.
//
// For normal browser traffic (no token, or a wrong one) we fall back to the usual
// requireAuth + requireAdmin chain, so a logged-in admin user still works exactly
// as before. If ADMIN_SERVICE_TOKEN is unset, the service path is disabled and only
// session-based admins are allowed — fail closed.
const serviceToken = process.env.ADMIN_SERVICE_TOKEN?.trim();

function hasValidServiceToken(req: Request): boolean {
  if (!serviceToken) return false;
  const header = req.header('x-service-token')?.trim();
  return Boolean(header) && header === serviceToken;
}

// Sibling apps (fitnessmaxxing, journalmaxxing) push activity events to
// /api/integrations/* machine-to-machine using their own shared secret in the
// same X-Service-Token header. Unlike the admin gate there is no session
// fallback: no valid token, no access. If INTEGRATIONS_TOKEN is unset the
// integration is disabled entirely — fail closed.
const integrationsToken = process.env.INTEGRATIONS_TOKEN?.trim();

export function requireIntegrationsToken(req: Request, res: Response, next: NextFunction): void {
  const header = req.header('x-service-token')?.trim();
  if (!integrationsToken || !header || header !== integrationsToken) {
    res.status(401).json({ error: 'Invalid service token' });
    return;
  }
  next();
}

// Gate admin routes for EITHER a valid service token OR a session admin user.
export function requireServiceOrAdmin(req: Request, res: Response, next: NextFunction): void {
  if (hasValidServiceToken(req)) {
    // Trusted service caller. No req.user is set; the admin router's self-guards
    // simply never trip because there is no "self" to lock out.
    next();
    return;
  }
  // Not a service caller — run the standard browser-admin checks. requireAuth is
  // async and populates req.user; chain requireAdmin only once it succeeds.
  requireAuth(req, res, (err?: unknown) => {
    if (err) {
      next(err);
      return;
    }
    if (res.headersSent) return; // requireAuth already responded (401/403)
    requireAdmin(req, res, next);
  });
}
