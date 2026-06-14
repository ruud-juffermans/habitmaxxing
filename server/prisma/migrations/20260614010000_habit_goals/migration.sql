-- CreateEnum
CREATE TYPE "GoalDirection" AS ENUM ('at_least', 'at_most');

-- AlterTable
ALTER TABLE "habits" ADD COLUMN "goal_target" DECIMAL(12,4);
ALTER TABLE "habits" ADD COLUMN "goal_direction" "GoalDirection" NOT NULL DEFAULT 'at_least';
