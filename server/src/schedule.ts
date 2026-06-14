// Pure habit-scheduling logic: given a habit's schedule, decide whether it is
// "due" on a given day and how many times it was scheduled to occur over a date
// range. Used by the entries endpoint (due-today), stats (streaks) and the
// period views (completion denominators).
//
// NOTE: this module is duplicated verbatim in `client/src/schedule.ts` so the
// frontend computes identical results without a shared build step (the same way
// the API types are mirrored between the two sides). Keep them in sync.
//
// All dates are 'YYYY-MM-DD' strings interpreted at UTC midnight, matching the
// rest of the codebase's date math, so there is no timezone/DST drift. Weekdays
// use the ISO convention 1=Mon … 7=Sun to align with the Mon–Sun week views.

export type ScheduleKind = 'daily' | 'weekdays' | 'weekly_count' | 'interval';

/** The subset of a habit that scheduling cares about. */
export interface Schedulable {
  scheduleKind: ScheduleKind;
  scheduleDays: number[]; // ISO weekdays 1..7, for `weekdays`
  scheduleTarget: number | null; // times per week, for `weekly_count`
  scheduleEvery: number | null; // every N days, for `interval`
  scheduleAnchor: string | null; // 'YYYY-MM-DD' anchor date, for `interval`
}

const MS_PER_DAY = 86_400_000;

function parse(date: string): number {
  return Date.parse(`${date}T00:00:00.000Z`);
}

/** ISO weekday for a date: 1=Mon … 7=Sun. */
export function isoWeekday(date: string): number {
  const d = new Date(parse(date));
  return ((d.getUTCDay() + 6) % 7) + 1;
}

/** Shift a 'YYYY-MM-DD' string by whole calendar days. */
export function shiftDays(date: string, n: number): string {
  const d = new Date(parse(date));
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Monday (ISO week start) of the week containing `date`. */
export function weekStart(date: string): string {
  return shiftDays(date, -(isoWeekday(date) - 1));
}

/** Whole days from `from` to `to` (negative if `to` precedes `from`). */
export function daysBetween(from: string, to: string): number {
  return Math.round((parse(to) - parse(from)) / MS_PER_DAY);
}

/**
 * Is `habit` due on `date`?
 *
 * For `weekly_count`, dueness depends on how much of the week's target is
 * already met, so callers pass `weekCount` — the number of times the habit has
 * been logged in `date`'s ISO week so far. It stops being due once the target
 * is reached. For the other kinds `weekCount` is ignored.
 */
export function isDueOn(habit: Schedulable, date: string, weekCount = 0): boolean {
  switch (habit.scheduleKind) {
    case 'daily':
      return true;
    case 'weekdays':
      return habit.scheduleDays.includes(isoWeekday(date));
    case 'weekly_count':
      return habit.scheduleTarget != null && weekCount < habit.scheduleTarget;
    case 'interval': {
      if (habit.scheduleEvery == null || habit.scheduleEvery < 1 || !habit.scheduleAnchor) return false;
      const diff = daysBetween(habit.scheduleAnchor, date);
      return diff >= 0 && diff % habit.scheduleEvery === 0;
    }
    default:
      return false;
  }
}

/**
 * How many times `habit` was scheduled to occur within [from, to] inclusive —
 * the denominator for completion percentages and streaks.
 *
 * For `weekly_count` this is `target × weeks overlapping the range`, counting
 * partial weeks at each end as whole weeks; it is therefore approximate over
 * ranges that don't align to week boundaries.
 */
export function scheduledOccurrences(habit: Schedulable, from: string, to: string): number {
  if (daysBetween(from, to) < 0) return 0;
  switch (habit.scheduleKind) {
    case 'daily':
      return daysBetween(from, to) + 1;
    case 'weekdays': {
      if (habit.scheduleDays.length === 0) return 0;
      let count = 0;
      for (let d = from; d <= to; d = shiftDays(d, 1)) {
        if (habit.scheduleDays.includes(isoWeekday(d))) count += 1;
      }
      return count;
    }
    case 'interval': {
      if (habit.scheduleEvery == null || habit.scheduleEvery < 1 || !habit.scheduleAnchor) return 0;
      // First scheduled day on/after `from` that aligns with the anchor.
      const start = habit.scheduleAnchor > from ? habit.scheduleAnchor : from;
      const offset = daysBetween(habit.scheduleAnchor, start); // >= 0 by construction
      const rem = offset % habit.scheduleEvery;
      const firstDue = rem === 0 ? start : shiftDays(start, habit.scheduleEvery - rem);
      if (firstDue > to) return 0;
      return Math.floor(daysBetween(firstDue, to) / habit.scheduleEvery) + 1;
    }
    case 'weekly_count': {
      if (habit.scheduleTarget == null) return 0;
      const weeks = daysBetween(weekStart(from), weekStart(to)) / 7 + 1;
      return habit.scheduleTarget * weeks;
    }
    default:
      return 0;
  }
}
