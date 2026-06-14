import { Router } from 'express';
import { prisma } from '../db.js';
import { asyncRoute } from '../http.js';
import { computeStreak, type StreakHabit } from '../streak.js';
import { isDueOn, weekStart } from '../schedule.js';
import { toGoalable, toSchedulable } from '../habitSchedule.js';
import { meetsGoal } from '../goal.js';

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
  asyncRoute(async (req, res) => {
    const habits = await prisma.habit.findMany({ where: { userId: req.user!.id, archived: false } });
    const today = todayStr();
    const since = shiftDays(today, -30);
    const entries = await prisma.entry.findMany({
      where: { userId: req.user!.id, entryDate: { gte: new Date(`${since}T00:00:00.000Z`) } },
      orderBy: { entryDate: 'desc' },
    });

    const result = habits.map((habit) => {
      const habitEntries = entries.filter((e) => e.habitId === habit.id);
      const { streak, streakUnit } = computeStreak(habit, habitEntries, today, since);

      const numericValues = habitEntries
        .map((e) => (e.valueNum !== null ? Number(e.valueNum) : null))
        .filter((v): v is number => v !== null);

      const avg7 = averageInWindow(habitEntries, today, 7);
      const avg30 = averageInWindow(habitEntries, today, 30);
      const { completed, scheduled } = completionInWindow(habit, habitEntries, today, since);

      return {
        habitId: habit.id,
        name: habit.name,
        description: habit.description,
        type: habit.type,
        streak,
        streakUnit,
        avg7,
        avg30,
        totalEntries: habitEntries.length,
        // Goal attainment over the window: days the goal was met vs days it was
        // scheduled. `completionRate` is null when nothing was scheduled.
        completed,
        scheduled,
        completionRate: scheduled > 0 ? completed / scheduled : null,
        latestValue: habitEntries[0] ?? null,
        allNumericCount: numericValues.length,
      };
    });

    res.json(result);
  }),
);

// Goal attainment over [since, today]: how many scheduled occurrences had their
// goal met (`completed`) out of how many were scheduled (`scheduled`). Mirrors
// the streak logic's notion of "done" so the two stay consistent.
function completionInWindow(
  habit: StreakHabit,
  entries: Array<{ entryDate: Date; valueBool: boolean | null; valueNum: unknown; valueText: string | null; valueTime: string | null }>,
  today: string,
  since: string,
): { completed: number; scheduled: number } {
  const goalable = toGoalable(habit);

  if (habit.scheduleKind === 'weekly_count') {
    const target = habit.scheduleTarget ?? 0;
    if (target <= 0) return { completed: 0, scheduled: 0 };
    const metPerWeek = new Map<string, number>();
    for (const e of entries) {
      if (!meetsGoal(goalable, e)) continue;
      const w = weekStart(dateOnly(e.entryDate));
      metPerWeek.set(w, (metPerWeek.get(w) ?? 0) + 1);
    }
    let completed = 0;
    let weeks = 0;
    const floor = weekStart(since);
    for (let cursor = weekStart(today); cursor >= floor; cursor = shiftDays(cursor, -7)) {
      completed += Math.min(metPerWeek.get(cursor) ?? 0, target); // a week can't over-count
      weeks += 1;
    }
    return { completed, scheduled: target * weeks };
  }

  const schedulable = toSchedulable(habit);
  const metDays = new Set<string>();
  for (const e of entries) if (meetsGoal(goalable, e)) metDays.add(dateOnly(e.entryDate));

  let completed = 0;
  let scheduled = 0;
  for (let cursor = since; cursor <= today; cursor = shiftDays(cursor, 1)) {
    if (!isDueOn(schedulable, cursor)) continue; // only scheduled days count toward the rate
    scheduled += 1;
    if (metDays.has(cursor)) completed += 1;
  }
  return { completed, scheduled };
}

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
