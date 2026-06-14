export type HabitType = 'boolean' | 'integer' | 'decimal' | 'score' | 'time' | 'duration' | 'text';

export type ScheduleKind = 'daily' | 'weekdays' | 'weekly_count' | 'interval';

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
export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
  isGuest: boolean;
  role: UserRole;
  disabledAt: string | null;
  createdAt: string;
  _count: { habits: number; entries: number; groups: number };
}

export interface Habit {
  id: string;
  name: string;
  description: string | null;
  type: HabitType;
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
}

/** The schedule-only slice of a Habit, used by the schedule editor. */
export type HabitSchedule = Pick<
  Habit,
  'scheduleKind' | 'scheduleDays' | 'scheduleTarget' | 'scheduleEvery' | 'scheduleAnchor'
>;

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
  latestValue: Entry | null;
}
