import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { asyncRoute } from '../http.js';

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
    const [habits, entries] = await Promise.all([
      prisma.habit.findMany({
        where: { archived: false },
        orderBy: [
          { group: { sortOrder: 'asc' } },
          { sortOrder: 'asc' },
          { createdAt: 'asc' },
        ],
      }),
      prisma.entry.findMany({ where: { entryDate: toDate(date) } }),
    ]);
    res.json({
      date,
      habits,
      entries: entries.map((e) => ({ ...e, entryDate: toDateOnly(e.entryDate) })),
    });
  }),
);

entriesRouter.get(
  '/range',
  asyncRoute(async (req, res) => {
    const from = dateStr.parse(req.query.from);
    const to = dateStr.parse(req.query.to);
    const entries = await prisma.entry.findMany({
      where: { entryDate: { gte: toDate(from), lte: toDate(to) } },
      orderBy: { entryDate: 'asc' },
    });
    res.json(entries.map((e) => ({ ...e, entryDate: toDateOnly(e.entryDate) })));
  }),
);

entriesRouter.put(
  '/',
  asyncRoute(async (req, res) => {
    const body = entryBody.parse(req.body);
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
      create: { habitId: body.habitId, entryDate: toDate(body.entryDate), ...data },
      update: data,
    });
    res.json({ ...entry, entryDate: toDateOnly(entry.entryDate) });
  }),
);
