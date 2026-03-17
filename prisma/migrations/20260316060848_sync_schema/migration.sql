/*
  Warnings:

  - You are about to drop the `SocialFeedStats` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "SocialFeedStats" DROP CONSTRAINT "SocialFeedStats_socialFeedId_fkey";

-- AlterTable
ALTER TABLE "ChummeArtist" ADD COLUMN     "discoveredAt" TIMESTAMP(3),
ADD COLUMN     "isDraft" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ChummeCategory" ADD COLUMN     "discoveryKeywords" TEXT[];

-- AlterTable
ALTER TABLE "ChummeSubCategory" ADD COLUMN     "discoveryKeywords" TEXT[];

-- AlterTable
ALTER TABLE "ChummeTopicCategory" ADD COLUMN     "discoveryKeywords" TEXT[];

-- AlterTable
ALTER TABLE "SocialFeedItem" ADD COLUMN     "allowedCountries" TEXT[],
ADD COLUMN     "blockedCountries" TEXT[],
ADD COLUMN     "bookmarks" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "chummeCategoryId" TEXT,
ADD COLUMN     "chummeSubCategoryId" TEXT,
ADD COLUMN     "chummeTopicCategoryId" TEXT,
ADD COLUMN     "comments" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "likes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "videoId" TEXT,
ADD COLUMN     "views" INTEGER NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE "SocialFeedStats";

-- CreateTable
CREATE TABLE "SocialFeedSnapshot" (
    "id" TEXT NOT NULL,
    "socialFeedId" TEXT NOT NULL,
    "snapshotAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "views" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "bookmarks" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SocialFeedSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialFeedSignal" (
    "id" TEXT NOT NULL,
    "socialFeedId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialFeedSignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialIngestionTarget" (
    "id" TEXT NOT NULL,
    "chummeArtistId" TEXT,
    "chummeCategoryId" TEXT,
    "chummeSubCategoryId" TEXT,
    "chummeTopicCategoryId" TEXT,
    "platform" "SocialPlatform" NOT NULL,
    "externalHandle" TEXT NOT NULL,
    "lastCrawledAt" TIMESTAMP(3),
    "crawlIntervalHours" INTEGER NOT NULL DEFAULT 24,
    "crawlPriority" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "quotaLimitHitAt" TIMESTAMP(3),
    "nextPageToken" TEXT,

    CONSTRAINT "SocialIngestionTarget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SocialFeedSnapshot_socialFeedId_snapshotAt_idx" ON "SocialFeedSnapshot"("socialFeedId", "snapshotAt");

-- CreateIndex
CREATE INDEX "SocialFeedSignal_socialFeedId_idx" ON "SocialFeedSignal"("socialFeedId");

-- CreateIndex
CREATE INDEX "SocialFeedSignal_type_idx" ON "SocialFeedSignal"("type");

-- CreateIndex
CREATE INDEX "SocialIngestionTarget_chummeArtistId_idx" ON "SocialIngestionTarget"("chummeArtistId");

-- CreateIndex
CREATE UNIQUE INDEX "SocialIngestionTarget_platform_externalHandle_key" ON "SocialIngestionTarget"("platform", "externalHandle");

-- AddForeignKey
ALTER TABLE "SocialFeedItem" ADD CONSTRAINT "SocialFeedItem_chummeCategoryId_fkey" FOREIGN KEY ("chummeCategoryId") REFERENCES "ChummeCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialFeedItem" ADD CONSTRAINT "SocialFeedItem_chummeSubCategoryId_fkey" FOREIGN KEY ("chummeSubCategoryId") REFERENCES "ChummeSubCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialFeedItem" ADD CONSTRAINT "SocialFeedItem_chummeTopicCategoryId_fkey" FOREIGN KEY ("chummeTopicCategoryId") REFERENCES "ChummeTopicCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialFeedSnapshot" ADD CONSTRAINT "SocialFeedSnapshot_socialFeedId_fkey" FOREIGN KEY ("socialFeedId") REFERENCES "SocialFeedItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialFeedSignal" ADD CONSTRAINT "SocialFeedSignal_socialFeedId_fkey" FOREIGN KEY ("socialFeedId") REFERENCES "SocialFeedItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialIngestionTarget" ADD CONSTRAINT "SocialIngestionTarget_chummeArtistId_fkey" FOREIGN KEY ("chummeArtistId") REFERENCES "ChummeArtist"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialIngestionTarget" ADD CONSTRAINT "SocialIngestionTarget_chummeCategoryId_fkey" FOREIGN KEY ("chummeCategoryId") REFERENCES "ChummeCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialIngestionTarget" ADD CONSTRAINT "SocialIngestionTarget_chummeSubCategoryId_fkey" FOREIGN KEY ("chummeSubCategoryId") REFERENCES "ChummeSubCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialIngestionTarget" ADD CONSTRAINT "SocialIngestionTarget_chummeTopicCategoryId_fkey" FOREIGN KEY ("chummeTopicCategoryId") REFERENCES "ChummeTopicCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
