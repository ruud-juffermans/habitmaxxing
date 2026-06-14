import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { asyncRoute } from '../http.js';
import { isDueOn, weekStart } from '../schedule.js';
import { isLogged, toSchedulable } from '../habitSchedule.js';

export const entriesRouter = Router();

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');

const entryBody = z.object({
  habitId: z.string().uuid(),
  entryDate: dateStr,
  valueBool: z.boolean().nullish(),
  valueNum: z.number().nullish(),
  valueText: z.string().nullish(),
  valueTime: z.string().regex(/^\d{2}:\d{2}$/).nullish(),
});

function toDate(yyyyMmDd: string): Date {
  return new Date(`${yyyyMmDd}T00:00:00.000Z`);
}

function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

entriesRouter.get(
  '/',
  asyncRoute(async (req, res) => {
    const date = dateStr.parse(req.query.date);
    // Pull the whole ISO week up to `date` so weekly_count habits know how much
    // of their target is already met when deciding if they're still due.
    const ws = weekStart(date);
    const [habits, weekEntries] = await Promise.all([
      prisma.habit.findMany({
        where: { userId: req.user!.id, archived: false },
        orderBy: [
          { group: { sortOrder: 'asc' } },
          { sortOrder: 'asc' },
          { createdAt: 'asc' },
        ],
      }),
      prisma.entry.findMany({
        where: { userId: req.user!.id, entryDate: { gte: toDate(ws), lte: toDate(date) } },
      }),
    ]);

    const dayEntries = weekEntries.filter((e) => toDateOnly(e.entryDate) === date);

    // Times each habit has been logged so far this week (for weekly_count).
    const weekCount = new Map<string, number>();
    for (const e of weekEntries) {
      if (isLogged(e)) weekCount.set(e.habitId, (weekCount.get(e.habitId) ?? 0) + 1);
    }

    const dueHabitIds = habits
      .filter((h) => isDueOn(toSchedulable(h), date, weekCount.get(h.id) ?? 0))
      .map((h) => h.id);

    res.json({
      date,
      habits,
      dueHabitIds,
      entries: dayEntries.map((e) => ({ ...e, entryDate: toDateOnly(e.entryDate) })),
    });
  }),
);

entriesRouter.get(
  '/range',
  asyncRoute(async (req, res) => {
    const from = dateStr.parse(req.query.from);
    const to = dateStr.parse(req.query.to);
    const entries = await prisma.entry.findMany({
      where: { userId: req.user!.id, entryDate: { gte: toDate(from), lte: toDate(to) } },
      orderBy: { entryDate: 'asc' },
    });
    res.json(entries.map((e) => ({ ...e, entryDate: toDateOnly(e.entryDate) })));
  }),
);

entriesRouter.put(
  '/',
  asyncRoute(async (req, res) => {
    const body = entryBody.parse(req.body);
    // Only allow writing entries for a habit the user owns.
    const habit = await prisma.habit.findFirst({
      where: { id: body.habitId, userId: req.user!.id },
      select: { id: true },
    });
    if (!habit) return res.status(404).json({ error: 'Habit not found' });

    const data = {
      valueBool: body.valueBool ?? null,
      valueNum: body.valueNum ?? null,
      valueText: body.valueText ?? null,
      valueTime: body.valueTime ?? null,
    };
    const entry = await prisma.entry.upsert({
      where: {
        habitId_entryDate: { habitId: body.habitId, entryDate: toDate(body.entryDate) },
      },
      create: { habitId: body.habitId, userId: req.user!.id, entryDate: toDate(body.entryDate), ...data },
      update: data,
    });
    res.json({ ...entry, entryDate: toDateOnly(entry.entryDate) });
  }),
);
