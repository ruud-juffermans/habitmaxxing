import type {
  AdminUser,
  AuthUser,
  DayPayload,
  Entry,
  GoalDirection,
  Habit,
  HabitGroup,
  HabitStats,
  WorkoutPlanSummary,
  HabitType,
  ScheduleKind,
} from './types';

// The platform API (ruudjuffermans-server) — shared by all maxxing apps. One
// session cookie lives on this origin, so signing in on the account app signs
// you in here too.
const base = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

// The account app — the only place with auth UI. Unauthenticated visitors are
// sent there and come back via return_url (see redirectToLogin).
const accountUrl = (import.meta.env.VITE_ACCOUNT_URL ?? 'http://localhost:3004').replace(/\/$/, '');

// Hand off to the central login page, asking it to send the user back here.
// `app=habit` labels the session and lets the login page brand the flow.
export function redirectToLogin(): void {
  const returnUrl = encodeURIComponent(window.location.href);
  window.location.assign(`${accountUrl}/login?return_url=${returnUrl}&app=habit`);
}

// Deep link into the account dashboard (apps overview; guests convert there).
export function accountDashboardUrl(): string {
  return accountUrl;
}

// Deep link into the account settings page (profile, password, sessions).
export function accountSettingsUrl(): string {
  return `${accountUrl}/settings`;
}

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

// Account endpoints still used from inside the app: session check and
// sign-out. Registration, login, guest start/conversion, password reset and
// password change all live in the account app now.
export const auth = {
  logout(): Promise<{ ok: true }> {
    return request(`/api/account/auth/logout`, { method: 'POST' });
  },
  me(): Promise<{ user: AuthUser }> {
    return request(`/api/account/auth/me`);
  },
};

export const api = {
  listHabits(includeArchived = false): Promise<Habit[]> {
    return request(`/api/habit/habits${includeArchived ? '?includeArchived=true' : ''}`);
  },
  // The user's workout plans from the fitness module (same platform API/session)
  // — feeds the workout picker for workout-type habits.
  listWorkoutPlans(): Promise<WorkoutPlanSummary[]> {
    return request(`/api/fitness/plans`);
  },
  createHabit(data: {
    name: string;
    description?: string | null;
    type: HabitType;
    workoutSplitId?: string | null;
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
    goalTarget?: number | null;
    goalDirection?: GoalDirection;
  }): Promise<Habit> {
    return request(`/api/habit/habits`, { method: 'POST', body: JSON.stringify(data) });
  },
  updateHabit(id: string, data: Partial<Omit<Habit, 'id' | 'createdAt'>>): Promise<Habit> {
    return request(`/api/habit/habits/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  },
  deleteHabit(id: string): Promise<void> {
    return request(`/api/habit/habits/${id}`, { method: 'DELETE' });
  },
  getDay(date: string): Promise<DayPayload> {
    return request(`/api/habit/entries?date=${date}`);
  },
  getRange(from: string, to: string): Promise<Entry[]> {
    return request(`/api/habit/entries/range?from=${from}&to=${to}`);
  },
  upsertEntry(data: {
    habitId: string;
    entryDate: string;
    valueBool?: boolean | null;
    valueNum?: number | null;
    valueText?: string | null;
    valueTime?: string | null;
  }): Promise<Entry> {
    return request(`/api/habit/entries`, { method: 'PUT', body: JSON.stringify(data) });
  },
  getStats(): Promise<HabitStats[]> {
    return request(`/api/habit/stats`);
  },
  listGroups(): Promise<HabitGroup[]> {
    return request(`/api/habit/groups`);
  },
  createGroup(data: { name: string; color: string; sortOrder?: number }): Promise<HabitGroup> {
    return request(`/api/habit/groups`, { method: 'POST', body: JSON.stringify(data) });
  },
  updateGroup(id: string, data: Partial<Omit<HabitGroup, 'id' | 'createdAt'>>): Promise<HabitGroup> {
    return request(`/api/habit/groups/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  },
  deleteGroup(id: string): Promise<void> {
    return request(`/api/habit/groups/${id}`, { method: 'DELETE' });
  },
};

// Admin-only user management, served by the platform (accounts are shared
// across all maxxing apps now). All endpoints require the signed-in user to be
// an admin; the server returns 403 otherwise.
export const admin = {
  listUsers(search?: string): Promise<{ users: AdminUser[] }> {
    const q = search ? `?search=${encodeURIComponent(search)}` : '';
    return request(`/api/account/admin/users${q}`);
  },
  suspend(id: string): Promise<{ ok: true }> {
    return request(`/api/account/admin/users/${id}/suspend`, { method: 'POST' });
  },
  unsuspend(id: string): Promise<{ ok: true }> {
    return request(`/api/account/admin/users/${id}/unsuspend`, { method: 'POST' });
  },
  deleteUser(id: string): Promise<{ ok: true }> {
    return request(`/api/account/admin/users/${id}`, { method: 'DELETE' });
  },
  resetPassword(id: string): Promise<{ ok: true }> {
    return request(`/api/account/admin/users/${id}/reset-password`, { method: 'POST' });
  },
  verifyEmail(id: string): Promise<{ ok: true }> {
    return request(`/api/account/admin/users/${id}/verify-email`, { method: 'POST' });
  },
  revokeSessions(id: string): Promise<{ ok: true }> {
    return request(`/api/account/admin/users/${id}/revoke-sessions`, { method: 'POST' });
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
