-- Linked habits: a habit can be bound to a sibling app (fitnessmaxxing /
-- journalmaxxing) that auto-completes it via /api/integrations/events.
-- Null source = normal manually tracked habit.

-- CreateEnum
CREATE TYPE "HabitSource" AS ENUM ('fitness_workout', 'journal_entry');

-- AlterTable
ALTER TABLE "habits" ADD COLUMN "source" "HabitSource";
