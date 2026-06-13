export type HabitType = 'boolean' | 'integer' | 'decimal' | 'score' | 'time' | 'duration' | 'text';

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
  entries: Entry[];
}

export interface HabitStats {
  habitId: string;
  name: string;
  description: string | null;
  type: HabitType;
  streak: number;
  avg7: number | null;
  avg30: number | null;
  totalEntries: number;
  latestValue: Entry | null;
}
