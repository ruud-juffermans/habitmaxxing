// Pure goal-scoring logic: given a habit's goal and an entry, decide whether the
// entry counts as the goal being *met* (the real definition of "done"). Used by
// streaks, the History calendar bars, the Stats completion rate and the period
// views — everywhere that used to treat "an entry exists" as completion.
//
// NOTE: this module is duplicated verbatim in `server/src/goal.ts` so the
// frontend computes identical results without a shared build step (the same way
// schedule.ts and the API types are mirrored between the two sides). Keep in sync.

export type GoalDirection = 'at_least' | 'at_most';

// Habit types that carry a numeric value a goal can be compared against.
export type GoalHabitType = 'boolean' | 'integer' | 'decimal' | 'score' | 'time' | 'duration' | 'text';

const NUMERIC_TYPES = new Set<GoalHabitType>(['integer', 'decimal', 'score', 'duration']);

/** Does this habit type support a numeric goal target? */
export function isGoalableType(type: GoalHabitType): boolean {
  return NUMERIC_TYPES.has(type);
}

/** The subset of a habit that goal-scoring cares about. */
export interface Goalable {
  type: GoalHabitType;
  goalTarget: number | string | null; // Prisma Decimal / number / string; null means no goal
  goalDirection: GoalDirection;
}

/** The subset of an entry that goal-scoring reads. */
export interface GoalEntry {
  valueBool: boolean | null;
  valueNum: unknown; // Prisma Decimal / number / string / null; coerced via Number()
  valueText: string | null;
  valueTime: string | null;
}

/**
 * Has the habit's goal been met by this entry — the real definition of "done"?
 *
 * - boolean: done when checked (a bare `false` does not count).
 * - numeric (integer/decimal/score/duration): with a goal, the value must clear
 *   the target (>= for `at_least`, <= for `at_most`); with no goal, any value
 *   counts, preserving the pre-goal behaviour.
 * - time/text: no goal concept — done when a non-empty entry exists.
 */
export function meetsGoal(habit: Goalable, entry: GoalEntry): boolean {
  if (habit.type === 'boolean') return entry.valueBool === true;

  if (isGoalableType(habit.type)) {
    if (entry.valueNum == null) return false;
    const value = Number(entry.valueNum);
    if (Number.isNaN(value)) return false;
    if (habit.goalTarget == null) return true; // no goal set: any logged value is "done"
    const target = Number(habit.goalTarget);
    if (Number.isNaN(target)) return true;
    return habit.goalDirection === 'at_most' ? value <= target : value >= target;
  }

  // time / text: presence of a non-empty entry is the only signal available.
  return (
    entry.valueBool === true ||
    entry.valueNum != null ||
    (entry.valueText != null && entry.valueText !== '') ||
    entry.valueTime != null
  );
}
