import { PrismaClient, HabitType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// A ready-to-use, email-verified demo account that owns all seeded data so you
// can log in immediately after seeding. Override via env vars.
const DEMO_EMAIL = (process.env.SEED_USER_EMAIL ?? 'demo@habitmaxxing.local').toLowerCase();
const DEMO_PASSWORD = process.env.SEED_USER_PASSWORD ?? 'password123';

interface GroupSeed {
  key: string;
  name: string;
  color: string;
  sortOrder: number;
}

// A non-daily schedule for a seeded habit. Omit for the default (daily).
type SeedSchedule =
  | { kind: 'weekdays'; days: number[] } // ISO 1..7 (Mon..Sun)
  | { kind: 'weekly_count'; target: number }
  | { kind: 'interval'; every: number; anchor: string }; // anchor 'YYYY-MM-DD'

interface HabitSeed {
  name: string;
  type: HabitType;
  group: string;
  description?: string;
  unit?: string;
  min?: number;
  max?: number;
  schedule?: SeedSchedule;
}

const groups: GroupSeed[] = [
  { key: 'sleep', name: 'Sleep & Recovery', color: '#6366f1', sortOrder: 10 },
  { key: 'fitness', name: 'Fitness & Movement', color: '#22c55e', sortOrder: 20 },
  { key: 'nutrition', name: 'Nutrition', color: '#f59e0b', sortOrder: 30 },
  { key: 'mind', name: 'Mind & Focus', color: '#a855f7', sortOrder: 40 },
  { key: 'mood', name: 'Mood & Wellbeing', color: '#ec4899', sortOrder: 50 },
  { key: 'productivity', name: 'Productivity', color: '#3b82f6', sortOrder: 60 },
  { key: 'finance', name: 'Finance', color: '#14b8a6', sortOrder: 70 },
];

// Ordered as you'd log them through the day; sortOrder is assigned from this array.
const habits: HabitSeed[] = [
  // Sleep & Recovery
  { name: 'Wake-up time', type: 'time', group: 'sleep' },
  { name: 'Bedtime', type: 'time', group: 'sleep' },
  { name: 'Hours slept', type: 'decimal', unit: 'h', group: 'sleep' },
  { name: 'Sleep score', type: 'score', min: 1, max: 10, group: 'sleep', description: 'How rested you feel, 1–10' },
  { name: 'No screens 1h before bed', type: 'boolean', group: 'sleep' },
  { name: 'Morning sunlight', type: 'boolean', group: 'sleep', description: 'Daylight within an hour of waking' },

  // Fitness & Movement
  { name: 'Workout completed', type: 'boolean', group: 'fitness', schedule: { kind: 'weekly_count', target: 4 } },
  { name: 'Workout type', type: 'text', group: 'fitness', description: 'Strength, run, yoga, etc.' },
  { name: 'Steps', type: 'integer', group: 'fitness' },
  { name: 'Active minutes', type: 'duration', unit: 'min', group: 'fitness' },
  { name: 'Stretch / mobility', type: 'boolean', group: 'fitness' },
  { name: 'Resting heart rate', type: 'integer', unit: 'bpm', group: 'fitness' },
  { name: 'Weight', type: 'decimal', unit: 'kg', group: 'fitness', schedule: { kind: 'interval', every: 7, anchor: '2026-01-05' } },

  // Nutrition
  { name: 'Water intake', type: 'decimal', unit: 'L', group: 'nutrition' },
  { name: 'Servings of vegetables', type: 'integer', group: 'nutrition' },
  { name: 'Protein', type: 'integer', unit: 'g', group: 'nutrition' },
  { name: 'Cooked at home', type: 'boolean', group: 'nutrition' },
  { name: 'No junk food', type: 'boolean', group: 'nutrition' },
  { name: 'Caffeine cups', type: 'integer', group: 'nutrition' },
  { name: 'Alcohol drinks', type: 'integer', group: 'nutrition' },

  // Mind & Focus
  { name: '30 minutes reading', type: 'boolean', group: 'mind' },
  { name: 'Meditation', type: 'duration', unit: 'min', group: 'mind' },
  { name: 'Deep work', type: 'duration', unit: 'min', group: 'mind', description: 'Focused, distraction-free work', schedule: { kind: 'weekdays', days: [1, 2, 3, 4, 5] } },
  { name: 'Learning / study', type: 'duration', unit: 'min', group: 'mind' },
  { name: 'Journaling', type: 'boolean', group: 'mind' },
  { name: 'Phone screen time', type: 'duration', unit: 'min', group: 'mind' },

  // Mood & Wellbeing
  { name: 'Mood', type: 'score', min: 1, max: 10, group: 'mood', description: 'Overall mood, 1–10' },
  { name: 'Energy level', type: 'score', min: 1, max: 10, group: 'mood' },
  { name: 'Stress level', type: 'score', min: 1, max: 10, group: 'mood' },
  { name: 'Time outdoors', type: 'duration', unit: 'min', group: 'mood' },
  { name: 'Meaningful social contact', type: 'boolean', group: 'mood', description: 'Real connection with someone' },
  { name: 'Gratitude — three things', type: 'text', group: 'mood' },
  { name: 'Daily highlight', type: 'text', group: 'mood', description: 'Best moment of the day' },

  // Productivity
  { name: 'Top priority done', type: 'boolean', group: 'productivity', description: "The day's single most important task" },
  { name: 'Made bed', type: 'boolean', group: 'productivity' },
  { name: 'Tidied space', type: 'boolean', group: 'productivity' },
  { name: 'Inbox zero', type: 'boolean', group: 'productivity' },

  // Finance
  { name: 'Tracked spending', type: 'boolean', group: 'finance' },
  { name: 'Money spent', type: 'decimal', group: 'finance' },
  { name: 'No impulse purchase', type: 'boolean', group: 'finance' },
];

async function main() {
  // Ensure the demo user exists (email already verified for convenience).
  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: {
      email: DEMO_EMAIL,
      passwordHash: await bcrypt.hash(DEMO_PASSWORD, 12),
      name: 'Demo',
      emailVerified: true,
    },
  });

  const existing = await prisma.habit.count({ where: { userId: user.id } });
  if (existing > 0) {
    console.log(`Seed skipped: ${existing} habits already present for ${DEMO_EMAIL}.`);
    return;
  }

  const groupIds = new Map<string, string>();
  for (const g of groups) {
    const created = await prisma.habitGroup.create({
      data: { name: g.name, color: g.color, sortOrder: g.sortOrder, userId: user.id },
    });
    groupIds.set(g.key, created.id);
  }

  let sortOrder = 10;
  for (const h of habits) {
    const groupId = groupIds.get(h.group);
    if (!groupId) throw new Error(`Unknown group "${h.group}" for habit "${h.name}"`);
    const s = h.schedule;
    await prisma.habit.create({
      data: {
        name: h.name,
        type: h.type,
        description: h.description,
        unit: h.unit,
        min: h.min,
        max: h.max,
        groupId,
        sortOrder,
        userId: user.id,
        scheduleKind: s?.kind ?? 'daily',
        scheduleDays: s?.kind === 'weekdays' ? s.days : [],
        scheduleTarget: s?.kind === 'weekly_count' ? s.target : null,
        scheduleEvery: s?.kind === 'interval' ? s.every : null,
        scheduleAnchor: s?.kind === 'interval' ? new Date(`${s.anchor}T00:00:00.000Z`) : null,
      },
    });
    sortOrder += 10;
  }

  console.log(
    `Seeded ${groups.length} groups and ${habits.length} habits for ${DEMO_EMAIL} (password: ${DEMO_PASSWORD}).`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
