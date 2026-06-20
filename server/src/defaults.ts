import { HabitType } from '@prisma/client';
import { prisma } from './db.js';

// Starter content provisioned for every brand-new account: a small, opinionated
// set of 3 groups and 7 habits that covers the core daily-tracking basics
// without overwhelming someone on day one. (The seed script offers a much
// larger catalogue for the demo account.)

interface GroupSeed {
  key: string;
  name: string;
  color: string;
  sortOrder: number;
}

interface HabitSeed {
  name: string;
  type: HabitType;
  group: string;
  description?: string;
  unit?: string;
  min?: number;
  max?: number;
  goalTarget?: number; // numeric target that defines "done"; direction defaults to at_least
  schedule?: SeedSchedule;
}

// A non-daily schedule for a starter habit. Omit for the default (daily).
type SeedSchedule =
  | { kind: 'weekdays'; days: number[] } // ISO 1..7 (Mon..Sun)
  | { kind: 'weekly_count'; target: number }
  | { kind: 'interval'; every: number; anchor: string }; // anchor 'YYYY-MM-DD'

const defaultGroups: GroupSeed[] = [
  { key: 'health', name: 'Health', color: '#22c55e', sortOrder: 10 },
  { key: 'mind', name: 'Mind & Focus', color: '#a855f7', sortOrder: 20 },
  { key: 'productivity', name: 'Productivity', color: '#3b82f6', sortOrder: 30 },
];

// Ordered as you'd log them through the day; sortOrder follows this array.
const defaultHabits: HabitSeed[] = [
  { name: 'Hours slept', type: 'decimal', unit: 'h', group: 'health' },
  { name: 'Workout completed', type: 'boolean', group: 'health', schedule: { kind: 'weekly_count', target: 3 } },
  { name: 'Water intake', type: 'decimal', unit: 'L', group: 'health' },
  { name: 'Glasses of water', type: 'multi_boolean', unit: 'glasses', group: 'health', goalTarget: 5, description: 'Tap + for each glass — aim for 5 a day' },
  { name: 'Deep work', type: 'duration_hours', unit: 'h', group: 'productivity', goalTarget: 2, description: 'Focused, distraction-free hours' },
  { name: 'Meditation', type: 'duration', unit: 'min', group: 'mind' },
  { name: '30 minutes reading', type: 'boolean', group: 'mind', schedule: { kind: 'weekdays', days: [1, 2, 3, 4, 5] } },
  { name: 'Mood', type: 'score', min: 1, max: 10, group: 'mind', description: 'Overall mood, 1–10' },
  { name: 'Top priority done', type: 'boolean', group: 'productivity', description: "The day's single most important task" },
];

// Create the default groups and habits for a freshly registered user. Runs in a
// single transaction so an account never ends up with groups but no habits.
export async function provisionDefaults(userId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const groupIds = new Map<string, string>();
    for (const g of defaultGroups) {
      const created = await tx.habitGroup.create({
        data: { name: g.name, color: g.color, sortOrder: g.sortOrder, userId },
      });
      groupIds.set(g.key, created.id);
    }

    let sortOrder = 10;
    for (const h of defaultHabits) {
      const groupId = groupIds.get(h.group);
      if (!groupId) throw new Error(`Unknown group "${h.group}" for habit "${h.name}"`);
      const s = h.schedule;
      await tx.habit.create({
        data: {
          name: h.name,
          type: h.type,
          description: h.description,
          unit: h.unit,
          min: h.min,
          max: h.max,
          goalTarget: h.goalTarget,
          groupId,
          sortOrder,
          userId,
          scheduleKind: s?.kind ?? 'daily',
          scheduleDays: s?.kind === 'weekdays' ? s.days : [],
          scheduleTarget: s?.kind === 'weekly_count' ? s.target : null,
          scheduleEvery: s?.kind === 'interval' ? s.every : null,
          scheduleAnchor: s?.kind === 'interval' ? new Date(`${s.anchor}T00:00:00.000Z`) : null,
        },
      });
      sortOrder += 10;
    }
  });
}
