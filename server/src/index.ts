import express from 'express';
import cors from 'cors';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { habitsRouter } from './routes/habits.js';
import { entriesRouter } from './routes/entries.js';
import { statsRouter } from './routes/stats.js';
import { groupsRouter } from './routes/groups.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/groups', groupsRouter);
app.use('/api/habits', habitsRouter);
app.use('/api/entries', entriesRouter);
app.use('/api/stats', statsRouter);

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
app.listen(port, () => {
  console.log(`server listening on :${port}`);
});
