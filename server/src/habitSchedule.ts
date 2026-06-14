import type { Schedulable, ScheduleKind } from './schedule.js';
import type { Goalable, GoalDirection, GoalHabitType } from './goal.js';

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

// The goal-related columns of a Habit row, as Prisma returns them (the target
// is a Decimal). A structural subset so the goal scoring stays unit-testable
// without constructing a full Prisma Habit.
export interface HabitGoalFields {
  type: GoalHabitType;
  goalTarget: unknown; // Prisma Decimal | number | string | null
  goalDirection: GoalDirection;
}

// Bridge between a Prisma Habit row and the pure goal logic in goal.ts. Coerces
// the Decimal target to a number; lives server-side only so goal.ts can stay
// framework-agnostic and identical to its client twin.
export function toGoalable(h: HabitGoalFields): Goalable {
  return {
    type: h.type,
    goalTarget: h.goalTarget == null ? null : Number(h.goalTarget),
    goalDirection: h.goalDirection,
  };
}

// Whether an entry counts as the habit having been done that day. Used for
// streaks and for tallying weekly_count progress. A bare `false` boolean or an
// empty text note does not count.
//
// NOTE: this is the *presence* test (an entry exists). For goal-aware completion
// — the real definition of "done" — use `meetsGoal` from goal.ts instead.
export function isLogged(e: {
  valueBool: boolean | null;
  valueNum: unknown;
  valueText: string | null;
  valueTime: string | null;
}): boolean {
  return e.valueBool === true || e.valueNum != null || (e.valueText != null && e.valueText !== '') || e.valueTime != null;
}
