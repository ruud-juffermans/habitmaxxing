import { isDueOn, weekStart, shiftDays } from './schedule.js';
import { toGoalable, toSchedulable, type HabitGoalFields, type HabitScheduleFields } from './habitSchedule.js';
import { meetsGoal } from './goal.js';

/** Everything the streak calculation needs about a habit: schedule + goal. */
export type StreakHabit = HabitScheduleFields & HabitGoalFields;

export type StreakResult = { streak: number; streakUnit: 'days' | 'weeks' };

/** The entry fields the streak calculation reads (a structural subset of Entry). */
export interface StreakEntry {
  entryDate: Date;
  valueBool: boolean | null;
  valueNum: unknown;
  valueText: string | null;
  valueTime: string | null;
}

function dateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Streak that respects the habit's schedule, walking back from `today` and
 * bounded by `since` (both 'YYYY-MM-DD').
 *
 * - daily/weekdays/interval: consecutive *scheduled* days the goal was met. Non-
 *   scheduled days are skipped (they neither count nor break). An unlogged
 *   *today* doesn't break the streak — only a missed past scheduled day does.
 * - weekly_count: consecutive ISO weeks that met the weekly target; the current
 *   week counts once met but, while still in progress, doesn't break it.
 *
 * "Completed" means the habit's goal was met (see meetsGoal) — not merely that
 * an entry exists. Habits without a goal fall back to "any logged value".
 *
 * `since` is the caller's data window (the stats route loads ~30 days), so very
 * long streaks are capped — a pre-existing limitation of that endpoint.
 */
export function computeStreak(
  habit: StreakHabit,
  habitEntries: StreakEntry[],
  today: string,
  since: string,
): StreakResult {
  const goalable = toGoalable(habit);
  if (habit.scheduleKind === 'weekly_count') {
    const target = habit.scheduleTarget ?? 0;
    if (target <= 0) return { streak: 0, streakUnit: 'weeks' };
    const weekLogged = new Map<string, number>();
    for (const e of habitEntries) {
      if (!meetsGoal(goalable, e)) continue;
      const w = weekStart(dateOnly(e.entryDate));
      weekLogged.set(w, (weekLogged.get(w) ?? 0) + 1);
    }
    let streak = 0;
    let current = true;
    const floor = weekStart(since);
    for (let cursor = weekStart(today); cursor >= floor; cursor = shiftDays(cursor, -7)) {
      const met = (weekLogged.get(cursor) ?? 0) >= target;
      if (met) streak += 1;
      else if (!current) break; // a fully past week that missed target ends the streak
      current = false;
    }
    return { streak, streakUnit: 'weeks' };
  }

  const schedulable = toSchedulable(habit);
  const completed = new Set<string>();
  for (const e of habitEntries) if (meetsGoal(goalable, e)) completed.add(dateOnly(e.entryDate));

  let streak = 0;
  for (let cursor = today; cursor >= since; cursor = shiftDays(cursor, -1)) {
    if (!isDueOn(schedulable, cursor)) continue; // not a scheduled day
    if (completed.has(cursor)) streak += 1;
    else if (cursor === today) continue; // today isn't logged yet — don't break
    else break;
  }
  return { streak, streakUnit: 'days' };
}
