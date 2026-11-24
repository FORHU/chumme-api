-- Idempotent audio-merge saves.
--
-- A save job can be delivered more than once (SQS retries it after a crash or
-- a deploy), and each delivery used to write a second MusicRecord. The job's
-- id now goes on the row, and the unique index turns a repeat into P2002,
-- which the result handler treats as "already saved".
--
-- Additive and nullable: existing rows keep NULL, and Postgres allows any
-- number of NULLs under a unique index, so this is safe on the shared staging
-- database.

-- AlterTable
ALTER TABLE "MusicRecord" ADD COLUMN "jobId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "MusicRecord_jobId_key" ON "MusicRecord"("jobId");
