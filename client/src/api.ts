import type { DayPayload, Entry, Habit, HabitGroup, HabitStats, HabitType } from './types';

const base = import.meta.env.VITE_API_URL ?? '';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  listHabits(includeArchived = false): Promise<Habit[]> {
    return request(`/api/habits${includeArchived ? '?includeArchived=true' : ''}`);
  },
  createHabit(data: {
    name: string;
    description?: string | null;
    type: HabitType;
    unit?: string | null;
    min?: number | null;
    max?: number | null;
    sortOrder?: number;
    groupId?: string | null;
  }): Promise<Habit> {
    return request(`/api/habits`, { method: 'POST', body: JSON.stringify(data) });
  },
  updateHabit(id: string, data: Partial<Omit<Habit, 'id' | 'createdAt'>>): Promise<Habit> {
    return request(`/api/habits/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  },
  deleteHabit(id: string): Promise<void> {
    return request(`/api/habits/${id}`, { method: 'DELETE' });
  },
  getDay(date: string): Promise<DayPayload> {
    return request(`/api/entries?date=${date}`);
  },
  getRange(from: string, to: string): Promise<Entry[]> {
    return request(`/api/entries/range?from=${from}&to=${to}`);
  },
  upsertEntry(data: {
    habitId: string;
    entryDate: string;
    valueBool?: boolean | null;
    valueNum?: number | null;
    valueText?: string | null;
    valueTime?: string | null;
  }): Promise<Entry> {
    return request(`/api/entries`, { method: 'PUT', body: JSON.stringify(data) });
  },
  getStats(): Promise<HabitStats[]> {
    return request(`/api/stats`);
  },
  listGroups(): Promise<HabitGroup[]> {
    return request(`/api/groups`);
  },
  createGroup(data: { name: string; color: string; sortOrder?: number }): Promise<HabitGroup> {
    return request(`/api/groups`, { method: 'POST', body: JSON.stringify(data) });
  },
  updateGroup(id: string, data: Partial<Omit<HabitGroup, 'id' | 'createdAt'>>): Promise<HabitGroup> {
    return request(`/api/groups/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  },
  deleteGroup(id: string): Promise<void> {
    return request(`/api/groups/${id}`, { method: 'DELETE' });
  },
};

// Falls back to the browser's timezone when VITE_APP_TZ is unset, so the UI's
// notion of "today" matches the server's stats day boundaries (APP_TZ).
const APP_TZ = import.meta.env.VITE_APP_TZ || undefined;

export function todayISO(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}
