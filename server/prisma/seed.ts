import { PrismaClient, HabitType } from '@prisma/client';

const prisma = new PrismaClient();

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
  { name: 'Workout completed', type: 'boolean', group: 'fitness' },
  { name: 'Workout type', type: 'text', group: 'fitness', description: 'Strength, run, yoga, etc.' },
  { name: 'Steps', type: 'integer', group: 'fitness' },
  { name: 'Active minutes', type: 'duration', unit: 'min', group: 'fitness' },
  { name: 'Stretch / mobility', type: 'boolean', group: 'fitness' },
  { name: 'Resting heart rate', type: 'integer', unit: 'bpm', group: 'fitness' },
  { name: 'Weight', type: 'decimal', unit: 'kg', group: 'fitness' },

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
  { name: 'Deep work', type: 'duration', unit: 'min', group: 'mind', description: 'Focused, distraction-free work' },
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
  const existing = await prisma.habit.count();
  if (existing > 0) {
    console.log(`Seed skipped: ${existing} habits already present.`);
    return;
  }

  const groupIds = new Map<string, string>();
  for (const g of groups) {
    const created = await prisma.habitGroup.create({
      data: { name: g.name, color: g.color, sortOrder: g.sortOrder },
    });
    groupIds.set(g.key, created.id);
  }

  let sortOrder = 10;
  for (const h of habits) {
    const groupId = groupIds.get(h.group);
    if (!groupId) throw new Error(`Unknown group "${h.group}" for habit "${h.name}"`);
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
      },
    });
    sortOrder += 10;
  }

  console.log(`Seeded ${groups.length} groups and ${habits.length} habits.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
