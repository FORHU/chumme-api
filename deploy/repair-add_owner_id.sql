-- Repair for the failed 20260814085246_add_owner_id migration on chumme-main.
--
-- Cause: staging already had ChummeArtist."ownerId" before Prisma ran this
-- migration (error 42701, column already exists). Prisma wraps each migration
-- in a transaction, so the collision aborted the whole file and nothing landed
-- — applied_steps_count = 0 on all three attempts.
--
-- This script brings the schema to the migration's intended end state without
-- tripping over whatever drift is already present. Every statement is
-- idempotent, so it is safe to run more than once and safe regardless of how
-- much of the migration already exists.
--
-- Foreign keys are dropped and re-added rather than skipped when present: the
-- point of that half of the migration is to CHANGE their ON DELETE behaviour,
-- so leaving a pre-existing constraint in place would silently preserve the
-- drift. The orphan check returned 0 across all six relations, so re-adding
-- them cannot fail on a constraint violation.
--
-- Run inside a transaction. If anything raises, nothing is left half-applied.

BEGIN;

-- ── Columns ────────────────────────────────────────────────────────────────
ALTER TABLE "ChummeArtist"         ADD COLUMN IF NOT EXISTS "ownerId" TEXT;
ALTER TABLE "Music"                ADD COLUMN IF NOT EXISTS "ownerId" TEXT;

ALTER TABLE "ChummeCategoryDesign" ADD COLUMN IF NOT EXISTS "aiChatEnabled"    BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ChummeCategoryDesign" ADD COLUMN IF NOT EXISTS "discoveryEnabled" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "SystemAsset"          ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "SystemAsset"          ADD COLUMN IF NOT EXISTS "isDeleted"   BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SystemAsset"          ADD COLUMN IF NOT EXISTS "title"       TEXT;

-- ── Column default ─────────────────────────────────────────────────────────
ALTER TABLE "User" ALTER COLUMN "onboardingCompleted" SET DEFAULT false;

-- ── Foreign keys: drop then re-add so ON DELETE matches the schema ─────────
ALTER TABLE "ChummeArtist" DROP CONSTRAINT IF EXISTS "ChummeArtist_ownerId_fkey";
ALTER TABLE "ChummeArtist" ADD CONSTRAINT "ChummeArtist_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Music" DROP CONSTRAINT IF EXISTS "Music_ownerId_fkey";
ALTER TABLE "Music" ADD CONSTRAINT "Music_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SocialFeedItem" DROP CONSTRAINT IF EXISTS "SocialFeedItem_postId_fkey";
ALTER TABLE "SocialFeedItem" ADD CONSTRAINT "SocialFeedItem_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "SocialUserPost"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SocialFeedSnapshot" DROP CONSTRAINT IF EXISTS "SocialFeedSnapshot_socialFeedId_fkey";
ALTER TABLE "SocialFeedSnapshot" ADD CONSTRAINT "SocialFeedSnapshot_socialFeedId_fkey"
  FOREIGN KEY ("socialFeedId") REFERENCES "SocialFeedItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SocialFeedSignal" DROP CONSTRAINT IF EXISTS "SocialFeedSignal_socialFeedId_fkey";
ALTER TABLE "SocialFeedSignal" ADD CONSTRAINT "SocialFeedSignal_socialFeedId_fkey"
  FOREIGN KEY ("socialFeedId") REFERENCES "SocialFeedItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SocialFeedItemComment" DROP CONSTRAINT IF EXISTS "SocialFeedItemComment_socialFeedItemId_fkey";
ALTER TABLE "SocialFeedItemComment" ADD CONSTRAINT "SocialFeedItemComment_socialFeedItemId_fkey"
  FOREIGN KEY ("socialFeedItemId") REFERENCES "SocialFeedItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SocialIngestionSchedule" DROP CONSTRAINT IF EXISTS "SocialIngestionSchedule_socialIngestionTargetId_fkey";
ALTER TABLE "SocialIngestionSchedule" ADD CONSTRAINT "SocialIngestionSchedule_socialIngestionTargetId_fkey"
  FOREIGN KEY ("socialIngestionTargetId") REFERENCES "SocialIngestionTarget"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Conversation" DROP CONSTRAINT IF EXISTS "Conversation_userId_fkey";
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── Clear the failed history ───────────────────────────────────────────────
-- Three rows exist for this migration: two already marked rolled back, one
-- still open (started 09:45:02, never finished). Prisma's P3009 guard trips on
-- that open row. Marking it rolled back is exactly what
-- `prisma migrate resolve --rolled-back` does, done here so the whole repair is
-- one transaction against a database the deploy container cannot reach.
UPDATE "_prisma_migrations"
SET rolled_back_at = now()
WHERE migration_name = '20260814085246_add_owner_id'
  AND finished_at IS NULL
  AND rolled_back_at IS NULL;

-- Record it as applied. The schema above now matches the migration's end state,
-- so the next `migrate deploy` should skip it and move on to the ones after.
INSERT INTO "_prisma_migrations"
  (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
VALUES (
  gen_random_uuid()::text,
  '',                       -- checksum is not verified for already-applied rows
  now(),
  '20260814085246_add_owner_id',
  'Applied manually via deploy/repair-add_owner_id.sql after 42701 schema drift.',
  NULL,
  now(),
  1
);

COMMIT;

-- ── Verify ─────────────────────────────────────────────────────────────────
-- Expect exactly one row with a finished_at and no rolled_back_at.
--
--   SELECT migration_name, started_at, finished_at, rolled_back_at
--   FROM "_prisma_migrations"
--   WHERE migration_name = '20260814085246_add_owner_id'
--   ORDER BY started_at;
--
-- Then check nothing else is stuck:
--
--   SELECT migration_name, started_at FROM "_prisma_migrations"
--   WHERE finished_at IS NULL AND rolled_back_at IS NULL;
