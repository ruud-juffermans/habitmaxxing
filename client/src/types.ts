// `workout` and `journal` are auto-completed habits: the sibling app checks
// and unchecks them (finish a workout, write a journal entry) — never the user.
export type HabitType =
  | 'boolean'
  | 'integer'
  | 'decimal'
  | 'score'
  | 'time'
  | 'duration'
  | 'duration_hours'
  | 'multi_boolean'
  | 'text'
  | 'workout'
  | 'journal';

export type ScheduleKind = 'daily' | 'weekdays' | 'weekly_count' | 'interval';

export type GoalDirection = 'at_least' | 'at_most';

export type UserRole = 'user' | 'admin';

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
  isGuest: boolean;
  role: UserRole;
}

// A user row as seen by an admin: account metadata + activity counts only.
// Counts come from the platform server, which reports per-app activity for
// the shared account (journal entries, workouts, habits).
export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
  isGuest: boolean;
  role: UserRole;
  disabledAt: string | null;
  createdAt: string;
  _count: { journalEntries: number; workouts: number; habits: number };
}

export interface Habit {
  id: string;
  name: string;
  description: string | null;
  type: HabitType;
  /** For type=workout only: the split this habit tracks; null = any workout. */
  workoutSplitId: string | null;
  unit: string | null;
  min: string | number | null;
  max: string | number | null;
  sortOrder: number;
  archived: boolean;
  createdAt: string;
  groupId: string | null;
  scheduleKind: ScheduleKind;
  scheduleDays: number[]; // ISO weekdays 1..7 (Mon..Sun), for `weekdays`
  scheduleTarget: number | null; // times per week, for `weekly_count`
  scheduleEvery: number | null; // every N days, for `interval`
  scheduleAnchor: string | null; // 'YYYY-MM-DD' anchor date, for `interval`
  goalTarget: string | number | null; // numeric target that defines "done"; null = no goal
  goalDirection: GoalDirection; // at_least: hit >= target; at_most: stay <= target
}

/** The schedule-only slice of a Habit, used by the schedule editor. */
export type HabitSchedule = Pick<
  Habit,
  'scheduleKind' | 'scheduleDays' | 'scheduleTarget' | 'scheduleEvery' | 'scheduleAnchor'
>;

// Minimal slice of the fitness app's plans list (GET /api/fitness/plans) —
// just enough to render the workout picker for workout-type habits.
export interface WorkoutPlanSummary {
  id: string;
  name: string;
  splits: { id: string; name: string }[];
}

export interface HabitGroup {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  createdAt: string;
}

export interface Entry {
  id: string;
  habitId: string;
  entryDate: string;
  valueBool: boolean | null;
  valueNum: string | number | null;
  valueText: string | null;
  valueTime: string | null;
  updatedAt: string;
}

export interface DayPayload {
  date: string;
  habits: Habit[];
  /** IDs of the habits scheduled (due) on `date`. */
  dueHabitIds: string[];
  entries: Entry[];
}

export interface HabitStats {
  habitId: string;
  name: string;
  description: string | null;
  type: HabitType;
  streak: number;
  streakUnit: 'days' | 'weeks';
  avg7: number | null;
  avg30: number | null;
  totalEntries: number;
  completed: number; // scheduled occurrences whose goal was met, in the window
  scheduled: number; // scheduled occurrences in the window
  completionRate: number | null; // completed / scheduled; null when nothing scheduled
  latestValue: Entry | null;
}
