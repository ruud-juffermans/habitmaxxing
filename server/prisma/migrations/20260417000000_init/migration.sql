-- CreateEnum
CREATE TYPE "HabitType" AS ENUM ('boolean', 'integer', 'decimal', 'score', 'time', 'duration', 'text');

-- CreateTable
CREATE TABLE "habits" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "HabitType" NOT NULL,
    "unit" TEXT,
    "min" DECIMAL(12,4),
    "max" DECIMAL(12,4),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "habits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entries" (
    "id" UUID NOT NULL,
    "habit_id" UUID NOT NULL,
    "entry_date" DATE NOT NULL,
    "value_bool" BOOLEAN,
    "value_num" DECIMAL(12,4),
    "value_text" TEXT,
    "value_time" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "entries_entry_date_idx" ON "entries"("entry_date");

-- CreateIndex
CREATE UNIQUE INDEX "entries_habit_id_entry_date_key" ON "entries"("habit_id", "entry_date");

-- AddForeignKey
ALTER TABLE "entries" ADD CONSTRAINT "entries_habit_id_fkey" FOREIGN KEY ("habit_id") REFERENCES "habits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
