import type {
  AdminUser,
  AuthUser,
  DayPayload,
  Entry,
  Habit,
  HabitGroup,
  HabitStats,
  HabitType,
  ScheduleKind,
} from './types';

const base = import.meta.env.VITE_API_URL ?? '';

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    ...init,
    // Send/receive the session cookie on every request.
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    // Prefer a JSON { error, code } body; fall back to plain text.
    let message = res.statusText;
    let code: string | undefined;
    const text = await res.text();
    if (text) {
      try {
        const parsed = JSON.parse(text);
        message = parsed.error ?? text;
        code = parsed.code;
      } catch {
        message = text;
      }
    }
    throw new ApiError(res.status, message, code);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const auth = {
  register(data: { email: string; password: string; name?: string }): Promise<{ ok: true }> {
    return request(`/api/auth/register`, { method: 'POST', body: JSON.stringify(data) });
  },
  verifyEmail(token: string): Promise<{ ok: true }> {
    return request(`/api/auth/verify-email`, { method: 'POST', body: JSON.stringify({ token }) });
  },
  resendVerification(email: string): Promise<{ ok: true }> {
    return request(`/api/auth/resend-verification`, { method: 'POST', body: JSON.stringify({ email }) });
  },
  login(data: { email: string; password: string }): Promise<{ user: AuthUser }> {
    return request(`/api/auth/login`, { method: 'POST', body: JSON.stringify(data) });
  },
  guest(): Promise<{ user: AuthUser }> {
    return request(`/api/auth/guest`, { method: 'POST' });
  },
  convert(data: { email: string; password: string; name?: string }): Promise<{ user: AuthUser }> {
    return request(`/api/auth/convert`, { method: 'POST', body: JSON.stringify(data) });
  },
  logout(): Promise<{ ok: true }> {
    return request(`/api/auth/logout`, { method: 'POST' });
  },
  me(): Promise<{ user: AuthUser }> {
    return request(`/api/auth/me`);
  },
  forgotPassword(email: string): Promise<{ ok: true }> {
    return request(`/api/auth/forgot-password`, { method: 'POST', body: JSON.stringify({ email }) });
  },
  resetPassword(data: { token: string; password: string }): Promise<{ ok: true }> {
    return request(`/api/auth/reset-password`, { method: 'POST', body: JSON.stringify(data) });
  },
  changePassword(data: { currentPassword: string; newPassword: string }): Promise<{ ok: true }> {
    return request(`/api/auth/change-password`, { method: 'POST', body: JSON.stringify(data) });
  },
};

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
    scheduleKind?: ScheduleKind;
    scheduleDays?: number[];
    scheduleTarget?: number | null;
    scheduleEvery?: number | null;
    scheduleAnchor?: string | null;
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

// Admin-only user management. All endpoints require the signed-in user to be an
// admin; the server returns 403 otherwise.
export const admin = {
  listUsers(search?: string): Promise<{ users: AdminUser[] }> {
    const q = search ? `?search=${encodeURIComponent(search)}` : '';
    return request(`/api/admin/users${q}`);
  },
  suspend(id: string): Promise<{ ok: true }> {
    return request(`/api/admin/users/${id}/suspend`, { method: 'POST' });
  },
  unsuspend(id: string): Promise<{ ok: true }> {
    return request(`/api/admin/users/${id}/unsuspend`, { method: 'POST' });
  },
  deleteUser(id: string): Promise<{ ok: true }> {
    return request(`/api/admin/users/${id}`, { method: 'DELETE' });
  },
  resetPassword(id: string): Promise<{ ok: true }> {
    return request(`/api/admin/users/${id}/reset-password`, { method: 'POST' });
  },
  verifyEmail(id: string): Promise<{ ok: true }> {
    return request(`/api/admin/users/${id}/verify-email`, { method: 'POST' });
  },
  revokeSessions(id: string): Promise<{ ok: true }> {
    return request(`/api/admin/users/${id}/revoke-sessions`, { method: 'POST' });
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
