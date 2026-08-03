-- DDL only. Kept separate from the backfill (next migration) on purpose:
-- Prisma runs each migration file in one transaction, and ADD COLUMN takes an
-- ACCESS EXCLUSIVE lock on "User" that is held until that transaction commits.
-- Bundling the backfill UPDATE in here would hold a full table lock — no reads,
-- no writes — for the length of a sequential scan over every user.
--
-- On their own these three statements are metadata-only on PostgreSQL 11+
-- (nullable columns, no DEFAULT), so they commit in milliseconds.

-- Do not sit in the lock queue. ADD COLUMN waits behind any open transaction
-- touching "User", and everything arriving after it queues behind the ALTER —
-- one long-running read can stall the whole table. Failing fast and retrying is
-- strictly better than that pile-up.
SET LOCAL lock_timeout = '5s';

-- CreateEnum
CREATE TYPE "OtpPurpose" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET', 'PASSWORD_CHANGE', 'EMAIL_CHANGE');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "otpPurpose" "OtpPurpose",
ADD COLUMN     "pendingEmail" TEXT;
