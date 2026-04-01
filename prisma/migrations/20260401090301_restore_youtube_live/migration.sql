-- AlterTable
ALTER TABLE "SocialFeedItem" ADD COLUMN     "isLive" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "SocialIngestionTarget" ADD COLUMN     "webSubExpiresAt" TIMESTAMP(3),
ADD COLUMN     "webSubState" TEXT,
ADD COLUMN     "webSubSubscribedAt" TIMESTAMP(3);
