-- CreateEnum
CREATE TYPE "TokenType" AS ENUM ('email_verification', 'password_reset');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "user_agent" TEXT,
    "ip" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "type" "TokenType" NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_hash_key" ON "verification_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "verification_tokens_user_id_idx" ON "verification_tokens"("user_id");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_tokens" ADD CONSTRAINT "verification_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: add user_id columns (nullable first so existing rows can be backfilled)
ALTER TABLE "habit_groups" ADD COLUMN "user_id" UUID;
ALTER TABLE "habits" ADD COLUMN "user_id" UUID;
ALTER TABLE "entries" ADD COLUMN "user_id" UUID;

-- Backfill: any pre-existing global data is assigned to a single legacy owner so
-- it is not lost when user scoping becomes mandatory. The legacy account has an
-- unusable password hash and an unverified email; reset its password to use it.
DO $$
DECLARE
    legacy_user UUID;
BEGIN
    IF EXISTS (SELECT 1 FROM "habit_groups" WHERE "user_id" IS NULL)
        OR EXISTS (SELECT 1 FROM "habits" WHERE "user_id" IS NULL)
        OR EXISTS (SELECT 1 FROM "entries" WHERE "user_id" IS NULL) THEN

        legacy_user := gen_random_uuid();
        INSERT INTO "users" ("id", "email", "password_hash", "name", "email_verified", "created_at", "updated_at")
        VALUES (legacy_user, 'legacy@habitmaxxing.local', '!unusable', 'Legacy data', false, now(), now());

        UPDATE "habit_groups" SET "user_id" = legacy_user WHERE "user_id" IS NULL;
        UPDATE "habits" SET "user_id" = legacy_user WHERE "user_id" IS NULL;
        UPDATE "entries" SET "user_id" = legacy_user WHERE "user_id" IS NULL;
    END IF;
END $$;

-- Now enforce NOT NULL
ALTER TABLE "habit_groups" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "habits" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "entries" ALTER COLUMN "user_id" SET NOT NULL;

-- CreateIndex
CREATE INDEX "habit_groups_user_id_idx" ON "habit_groups"("user_id");
CREATE INDEX "habits_user_id_idx" ON "habits"("user_id");
CREATE INDEX "entries_user_id_idx" ON "entries"("user_id");

-- AddForeignKey
ALTER TABLE "habit_groups" ADD CONSTRAINT "habit_groups_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "habits" ADD CONSTRAINT "habits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "entries" ADD CONSTRAINT "entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
