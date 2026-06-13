import { PrismaClient, HabitType } from '@prisma/client';

const prisma = new PrismaClient();

const defaults: Array<{
  name: string;
  type: HabitType;
  unit?: string;
  min?: number;
  max?: number;
  sortOrder: number;
}> = [
  { name: '30 minutes reading', type: 'boolean', sortOrder: 10 },
  { name: 'Wake-up time', type: 'time', sortOrder: 20 },
  { name: 'Sleep score', type: 'score', min: 1, max: 10, sortOrder: 30 },
  { name: 'Hours slept', type: 'decimal', unit: 'h', sortOrder: 40 },
  { name: 'Workout completed', type: 'boolean', sortOrder: 50 },
  { name: 'Steps', type: 'integer', sortOrder: 60 },
  { name: 'Water intake', type: 'decimal', unit: 'L', sortOrder: 70 },
  { name: 'Meditation', type: 'duration', unit: 'min', sortOrder: 80 },
  { name: 'No screens 1h before bed', type: 'boolean', sortOrder: 90 },
  { name: 'Daily mood notes', type: 'text', sortOrder: 100 },
  { name: 'Weight', type: 'decimal', unit: 'kg', sortOrder: 110 },
  { name: 'Caffeine cups', type: 'integer', sortOrder: 120 },
  { name: 'Alcohol drinks', type: 'integer', sortOrder: 130 },
];

async function main() {
  const existing = await prisma.habit.count();
  if (existing > 0) {
    console.log(`Seed skipped: ${existing} habits already present.`);
    return;
  }
  for (const h of defaults) {
    await prisma.habit.create({ data: h });
  }
  console.log(`Seeded ${defaults.length} default habits.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
