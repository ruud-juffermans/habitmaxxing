import { Router } from 'express';
import { prisma } from '../db.js';
import { asyncRoute } from '../http.js';

export const statsRouter = Router();

const TZ = process.env.APP_TZ ?? 'UTC';

// Current calendar date (YYYY-MM-DD) in the configured app timezone, so that
// "today" matches what the user is logging rather than the server's UTC clock.
function todayStr(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

// Shift a YYYY-MM-DD string by whole calendar days.
function shiftDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function dateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

statsRouter.get(
  '/',
  asyncRoute(async (_req, res) => {
    const habits = await prisma.habit.findMany({ where: { archived: false } });
    const today = todayStr();
    const since = shiftDays(today, -30);
    const entries = await prisma.entry.findMany({
      where: { entryDate: { gte: new Date(`${since}T00:00:00.000Z`) } },
      orderBy: { entryDate: 'desc' },
    });

    const result = habits.map((habit) => {
      const habitEntries = entries.filter((e) => e.habitId === habit.id);

      let streak = 0;
      if (habit.type === 'boolean') {
        let cursor = today;
        for (;;) {
          const entry = habitEntries.find((e) => dateOnly(e.entryDate) === cursor);
          if (entry?.valueBool === true) {
            streak += 1;
            cursor = shiftDays(cursor, -1);
          } else {
            break;
          }
        }
      }

      const numericValues = habitEntries
        .map((e) => (e.valueNum !== null ? Number(e.valueNum) : null))
        .filter((v): v is number => v !== null);

      const avg7 = averageInWindow(habitEntries, today, 7);
      const avg30 = averageInWindow(habitEntries, today, 30);

      return {
        habitId: habit.id,
        name: habit.name,
        description: habit.description,
        type: habit.type,
        streak,
        avg7,
        avg30,
        totalEntries: habitEntries.length,
        latestValue: habitEntries[0] ?? null,
        allNumericCount: numericValues.length,
      };
    });

    res.json(result);
  }),
);

function averageInWindow(
  entries: Array<{ entryDate: Date; valueNum: unknown; valueBool: boolean | null }>,
  today: string,
  days: number,
): number | null {
  const cutoff = shiftDays(today, -(days - 1));
  const window = entries.filter((e) => dateOnly(e.entryDate) >= cutoff);
  const nums = window
    .map((e) => (e.valueNum != null ? Number(e.valueNum) : e.valueBool === true ? 1 : e.valueBool === false ? 0 : null))
    .filter((v): v is number => v !== null);
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}
