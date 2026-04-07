-- AlterTable
ALTER TABLE "ChummeArtist" ADD COLUMN     "isLive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastLiveAt" TIMESTAMP(3),
ADD COLUMN     "subscriberCount" INTEGER,
ADD COLUMN     "totalViews" BIGINT;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "onboardingCompleted" SET DEFAULT true;
