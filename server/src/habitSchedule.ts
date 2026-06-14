import type { Schedulable, ScheduleKind } from './schedule.js';

// The schedule-related columns of a Habit row, as Prisma returns them (the
// anchor is a Date). A structural subset so this and the streak logic are unit
// testable without constructing a full Prisma Habit.
export interface HabitScheduleFields {
  scheduleKind: ScheduleKind;
  scheduleDays: number[];
  scheduleTarget: number | null;
  scheduleEvery: number | null;
  scheduleAnchor: Date | null;
}

// Bridge between a Prisma Habit row and the pure scheduling logic in
// schedule.ts, which works in 'YYYY-MM-DD' strings. Lives server-side only so
// schedule.ts can stay framework-agnostic and identical to its client twin.
export function toSchedulable(h: HabitScheduleFields): Schedulable {
  return {
    scheduleKind: h.scheduleKind,
    scheduleDays: h.scheduleDays,
    scheduleTarget: h.scheduleTarget,
    scheduleEvery: h.scheduleEvery,
    scheduleAnchor: h.scheduleAnchor ? h.scheduleAnchor.toISOString().slice(0, 10) : null,
  };
}

// Whether an entry counts as the habit having been done that day. Used for
// streaks and for tallying weekly_count progress. A bare `false` boolean or an
// empty text note does not count.
export function isLogged(e: {
  valueBool: boolean | null;
  valueNum: unknown;
  valueText: string | null;
  valueTime: string | null;
}): boolean {
  return e.valueBool === true || e.valueNum != null || (e.valueText != null && e.valueText !== '') || e.valueTime != null;
}
