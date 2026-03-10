/*
  Warnings:

  - You are about to drop the column `mediaPostId` on the `SocialFeedItem` table. All the data in the column will be lost.
  - You are about to drop the column `videoId` on the `SocialFeedItem` table. All the data in the column will be lost.
  - You are about to drop the `SocialAccount` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SocialBookmark` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SocialComment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SocialLike` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SocialPost` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Video` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `VideoEmotion` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[postId]` on the table `SocialFeedItem` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[externalUrl]` on the table `SocialFeedItem` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "MediaPost" DROP CONSTRAINT "MediaPost_artistId_fkey";

-- DropForeignKey
ALTER TABLE "MediaPost" DROP CONSTRAINT "MediaPost_fileId_fkey";

-- DropForeignKey
ALTER TABLE "SocialAccount" DROP CONSTRAINT "SocialAccount_userId_fkey";

-- DropForeignKey
ALTER TABLE "SocialBookmark" DROP CONSTRAINT "SocialBookmark_feedId_fkey";

-- DropForeignKey
ALTER TABLE "SocialBookmark" DROP CONSTRAINT "SocialBookmark_userId_fkey";

-- DropForeignKey
ALTER TABLE "SocialComment" DROP CONSTRAINT "SocialComment_postId_fkey";

-- DropForeignKey
ALTER TABLE "SocialComment" DROP CONSTRAINT "SocialComment_userId_fkey";

-- DropForeignKey
ALTER TABLE "SocialFeedItem" DROP CONSTRAINT "SocialFeedItem_mediaPostId_fkey";

-- DropForeignKey
ALTER TABLE "SocialFeedItem" DROP CONSTRAINT "SocialFeedItem_postId_fkey";

-- DropForeignKey
ALTER TABLE "SocialFeedItem" DROP CONSTRAINT "SocialFeedItem_videoId_fkey";

-- DropForeignKey
ALTER TABLE "SocialLike" DROP CONSTRAINT "SocialLike_postId_fkey";

-- DropForeignKey
ALTER TABLE "SocialLike" DROP CONSTRAINT "SocialLike_userId_fkey";

-- DropForeignKey
ALTER TABLE "SocialPost" DROP CONSTRAINT "SocialPost_userId_fkey";

-- DropForeignKey
ALTER TABLE "Video" DROP CONSTRAINT "Video_artistId_fkey";

-- DropForeignKey
ALTER TABLE "Video" DROP CONSTRAINT "Video_fileId_fkey";

-- DropForeignKey
ALTER TABLE "VideoEmotion" DROP CONSTRAINT "VideoEmotion_emotionId_fkey";

-- DropForeignKey
ALTER TABLE "VideoEmotion" DROP CONSTRAINT "VideoEmotion_videoId_fkey";

-- DropIndex
DROP INDEX "SocialFeedItem_mediaPostId_idx";

-- AlterTable
ALTER TABLE "SocialFeedItem" DROP COLUMN "mediaPostId",
DROP COLUMN "videoId",
ADD COLUMN     "externalUrl" TEXT,
ADD COLUMN     "metaData" JSONB,
ADD COLUMN     "platform" "VideoPlatform",
ADD COLUMN     "title" TEXT;

-- DropTable
DROP TABLE "SocialAccount";

-- DropTable
DROP TABLE "SocialBookmark";

-- DropTable
DROP TABLE "SocialComment";

-- DropTable
DROP TABLE "SocialLike";

-- DropTable
DROP TABLE "SocialPost";

-- DropTable
DROP TABLE "Video";

-- DropTable
DROP TABLE "VideoEmotion";

-- CreateTable
CREATE TABLE "SessionSocialAccount" (
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

    CONSTRAINT "SessionSocialAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialUserPost" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "mediaUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SocialUserPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialUserLike" (
    "id" TEXT NOT NULL,
    "socialPostId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SocialUserLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialUserComment" (
    "id" TEXT NOT NULL,
    "socialUserPostId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "parentSocialCommentId" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SocialUserComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialUserBookmark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "socialFeedItemId" TEXT NOT NULL,

    CONSTRAINT "SocialUserBookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialUserView" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "socialFeedItemId" TEXT NOT NULL,

    CONSTRAINT "SocialUserView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialFeedStats" (
    "socialFeedId" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "bookmarks" INTEGER NOT NULL DEFAULT 0,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "SocialFeedStats_pkey" PRIMARY KEY ("socialFeedId")
);

-- CreateIndex
CREATE UNIQUE INDEX "SessionSocialAccount_userId_platform_key" ON "SessionSocialAccount"("userId", "platform");

-- CreateIndex
CREATE INDEX "SocialUserPost_userId_idx" ON "SocialUserPost"("userId");

-- CreateIndex
CREATE INDEX "SocialUserLike_socialPostId_idx" ON "SocialUserLike"("socialPostId");

-- CreateIndex
CREATE INDEX "SocialUserLike_userId_idx" ON "SocialUserLike"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SocialUserLike_socialPostId_userId_key" ON "SocialUserLike"("socialPostId", "userId");

-- CreateIndex
CREATE INDEX "SocialUserComment_socialUserPostId_idx" ON "SocialUserComment"("socialUserPostId");

-- CreateIndex
CREATE INDEX "SocialUserComment_userId_idx" ON "SocialUserComment"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SocialUserBookmark_socialFeedItemId_userId_key" ON "SocialUserBookmark"("socialFeedItemId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "SocialUserView_socialFeedItemId_userId_key" ON "SocialUserView"("socialFeedItemId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "SocialFeedItem_postId_key" ON "SocialFeedItem"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "SocialFeedItem_externalUrl_key" ON "SocialFeedItem"("externalUrl");

-- AddForeignKey
ALTER TABLE "SessionSocialAccount" ADD CONSTRAINT "SessionSocialAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialUserPost" ADD CONSTRAINT "SocialUserPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialUserLike" ADD CONSTRAINT "SocialUserLike_socialPostId_fkey" FOREIGN KEY ("socialPostId") REFERENCES "SocialUserPost"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialUserLike" ADD CONSTRAINT "SocialUserLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialUserComment" ADD CONSTRAINT "SocialUserComment_parentSocialCommentId_fkey" FOREIGN KEY ("parentSocialCommentId") REFERENCES "SocialUserComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialUserComment" ADD CONSTRAINT "SocialUserComment_socialUserPostId_fkey" FOREIGN KEY ("socialUserPostId") REFERENCES "SocialUserPost"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialUserComment" ADD CONSTRAINT "SocialUserComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialUserBookmark" ADD CONSTRAINT "SocialUserBookmark_socialFeedItemId_fkey" FOREIGN KEY ("socialFeedItemId") REFERENCES "SocialFeedItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialUserBookmark" ADD CONSTRAINT "SocialUserBookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialUserView" ADD CONSTRAINT "SocialUserView_socialFeedItemId_fkey" FOREIGN KEY ("socialFeedItemId") REFERENCES "SocialFeedItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialUserView" ADD CONSTRAINT "SocialUserView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialFeedItem" ADD CONSTRAINT "SocialFeedItem_postId_fkey" FOREIGN KEY ("postId") REFERENCES "SocialUserPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialFeedItem" ADD CONSTRAINT "SocialFeedItem_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialFeedStats" ADD CONSTRAINT "SocialFeedStats_socialFeedId_fkey" FOREIGN KEY ("socialFeedId") REFERENCES "SocialFeedItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
