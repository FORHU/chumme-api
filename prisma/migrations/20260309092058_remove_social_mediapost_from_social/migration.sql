/*
  Warnings:

  - You are about to drop the `SocialMediaPost` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "MediaPostEmotion" DROP CONSTRAINT "MediaPostEmotion_mediaPostId_fkey";

-- DropForeignKey
ALTER TABLE "SocialFeedItem" DROP CONSTRAINT "SocialFeedItem_mediaPostId_fkey";

-- DropForeignKey
ALTER TABLE "SocialFeedItem" DROP CONSTRAINT "SocialFeedItem_videoId_fkey";

-- DropForeignKey
ALTER TABLE "SocialMediaPost" DROP CONSTRAINT "SocialMediaPost_artistId_fkey";

-- DropForeignKey
ALTER TABLE "SocialMediaPost" DROP CONSTRAINT "SocialMediaPost_fileId_fkey";

-- DropIndex
DROP INDEX "SocialFeedItem_videoId_idx";

-- DropTable
DROP TABLE "SocialMediaPost";

-- CreateTable
CREATE TABLE "SocialAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "providerUserId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "scopes" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaPost" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "platform" "VideoPlatform" NOT NULL,
    "artistId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "fileId" TEXT NOT NULL,
    "meta_data" JSONB,
    "externalUrl" TEXT,

    CONSTRAINT "MediaPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SocialAccount_userId_platform_key" ON "SocialAccount"("userId", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "MediaPost_externalUrl_key" ON "MediaPost"("externalUrl");

-- CreateIndex
CREATE INDEX "MediaPost_artistId_idx" ON "MediaPost"("artistId");

-- CreateIndex
CREATE INDEX "MediaPost_platform_idx" ON "MediaPost"("platform");

-- CreateIndex
CREATE INDEX "MediaPost_fileId_idx" ON "MediaPost"("fileId");

-- AddForeignKey
ALTER TABLE "SocialAccount" ADD CONSTRAINT "SocialAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialFeedItem" ADD CONSTRAINT "SocialFeedItem_mediaPostId_fkey" FOREIGN KEY ("mediaPostId") REFERENCES "MediaPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialFeedItem" ADD CONSTRAINT "SocialFeedItem_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaPost" ADD CONSTRAINT "MediaPost_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaPost" ADD CONSTRAINT "MediaPost_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaPostEmotion" ADD CONSTRAINT "MediaPostEmotion_mediaPostId_fkey" FOREIGN KEY ("mediaPostId") REFERENCES "MediaPost"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
