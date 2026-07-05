import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { asyncRoute } from '../http.js';

export const integrationsRouter = Router();

const habitSources = ['fitness_workout', 'journal_entry'] as const;
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');

const eventBody = z.object({
  source: z.enum(habitSources),
  // The user's identity in the source app; accounts are matched by email.
  email: z.string().trim().toLowerCase().email().max(254),
  date: dateStr,
  // true: the day has activity (finished workout / journal entry);
  // false: it no longer does (workout deleted / entry removed).
  active: z.boolean(),
});

function toDate(yyyyMmDd: string): Date {
  return new Date(`${yyyyMmDd}T00:00:00.000Z`);
}

// POST /api/integrations/events — a sibling app reports that a user's daily
// activity changed. Every habit that user linked to the source is checked or
// unchecked for that day. Unknown emails and users without linked habits are a
// successful no-op, so source apps can fire events blindly for any account.
integrationsRouter.post(
  '/events',
  asyncRoute(async (req, res) => {
    const body = eventBody.parse(req.body);
    const entryDate = toDate(body.date);

    const user = await prisma.user.findUnique({
      where: { email: body.email },
      select: { id: true },
    });
    const habits = user
      ? await prisma.habit.findMany({
          where: { userId: user.id, source: body.source },
          select: { id: true },
        })
      : [];
    if (habits.length === 0) return res.json({ ok: true, updated: 0 });

    if (body.active) {
      await prisma.$transaction(
        habits.map((h) =>
          prisma.entry.upsert({
            where: { habitId_entryDate: { habitId: h.id, entryDate } },
            create: { habitId: h.id, userId: user!.id, entryDate, valueBool: true },
            update: { valueBool: true },
          }),
        ),
      );
    } else {
      // Clearing removes the entry entirely, matching an unchecked checkbox.
      await prisma.entry.deleteMany({
        where: { habitId: { in: habits.map((h) => h.id) }, entryDate },
      });
    }
    res.json({ ok: true, updated: habits.length });
  }),
);
