-- CreateEnum
CREATE TYPE "HabitScheduleKind" AS ENUM ('daily', 'weekdays', 'weekly_count', 'interval');

-- AlterTable
ALTER TABLE "habits" ADD COLUMN "schedule_kind" "HabitScheduleKind" NOT NULL DEFAULT 'daily';
ALTER TABLE "habits" ADD COLUMN "schedule_days" INTEGER[] NOT NULL DEFAULT '{}';
ALTER TABLE "habits" ADD COLUMN "schedule_target" INTEGER;
ALTER TABLE "habits" ADD COLUMN "schedule_every" INTEGER;
ALTER TABLE "habits" ADD COLUMN "schedule_anchor" DATE;
