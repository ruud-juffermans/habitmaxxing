-- CreateTable
CREATE TABLE "habit_groups" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "habit_groups_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "habits" ADD COLUMN "group_id" UUID;

-- CreateIndex
CREATE INDEX "habits_group_id_idx" ON "habits"("group_id");

-- AddForeignKey
ALTER TABLE "habits" ADD CONSTRAINT "habits_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "habit_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
