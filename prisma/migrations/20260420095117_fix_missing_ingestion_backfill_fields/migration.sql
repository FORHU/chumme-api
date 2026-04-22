-- AlterTable
ALTER TABLE "SocialIngestionTarget" ADD COLUMN     "backfillToken" TEXT,
ADD COLUMN     "isHistoryCaughtUp" BOOLEAN NOT NULL DEFAULT false;
