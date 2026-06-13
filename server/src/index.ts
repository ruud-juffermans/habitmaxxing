import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { authRouter } from './routes/auth.js';
import { habitsRouter } from './routes/habits.js';
import { entriesRouter } from './routes/entries.js';
import { statsRouter } from './routes/stats.js';
import { groupsRouter } from './routes/groups.js';
import { adminRouter } from './routes/admin.js';
import { requireAuth, requireAdmin } from './middleware/auth.js';
import { bootstrapAdmin } from './auth/bootstrapAdmin.js';

const app = express();

// Credentialed CORS: the browser must send the session cookie, which requires an
// explicit origin (not "*"). Configure allowed origins via CORS_ORIGIN (comma
// separated); defaults to the local Vite dev server.
const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

// Public auth endpoints.
app.use('/api/auth', authRouter);

// Everything below requires an authenticated, email-verified user.
app.use('/api/groups', requireAuth, groupsRouter);
app.use('/api/habits', requireAuth, habitsRouter);
app.use('/api/entries', requireAuth, entriesRouter);
app.use('/api/stats', requireAuth, statsRouter);

// Admin-only user management.
app.use('/api/admin', requireAuth, requireAdmin, adminRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Validation failed', details: err.flatten() });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Not found' });
    if (err.code === 'P2002') return res.status(409).json({ error: 'Already exists' });
  }
  console.error(err);
  const message = err instanceof Error ? err.message : 'Internal error';
  res.status(500).json({ error: message });
});

const port = Number(process.env.SERVER_PORT ?? 3001);
// Reconcile the configured admin account, then start accepting requests. A
// bootstrap failure is logged but never blocks the server from coming up.
bootstrapAdmin()
  .catch((err) => console.error('[admin] bootstrap failed:', err))
  .finally(() => {
    app.listen(port, () => {
      console.log(`server listening on :${port}`);
    });
  });
