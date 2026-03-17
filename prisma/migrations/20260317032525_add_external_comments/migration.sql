-- DropForeignKey
ALTER TABLE "SocialUserComment" DROP CONSTRAINT "SocialUserComment_socialUserPostId_fkey";

-- AlterTable
ALTER TABLE "SocialUserComment" ADD COLUMN     "socialFeedItemId" TEXT,
ALTER COLUMN "socialUserPostId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "SocialFeedItemComment" (
    "id" TEXT NOT NULL,
    "socialFeedItemId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "authorName" TEXT,
    "authorAvatarUrl" TEXT,
    "authorHandle" TEXT,
    "externalId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialFeedItemComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SocialFeedItemComment_socialFeedItemId_idx" ON "SocialFeedItemComment"("socialFeedItemId");

-- CreateIndex
CREATE INDEX "SocialUserComment_socialFeedItemId_idx" ON "SocialUserComment"("socialFeedItemId");

-- AddForeignKey
ALTER TABLE "SocialUserComment" ADD CONSTRAINT "SocialUserComment_socialUserPostId_fkey" FOREIGN KEY ("socialUserPostId") REFERENCES "SocialUserPost"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialUserComment" ADD CONSTRAINT "SocialUserComment_socialFeedItemId_fkey" FOREIGN KEY ("socialFeedItemId") REFERENCES "SocialFeedItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialFeedItemComment" ADD CONSTRAINT "SocialFeedItemComment_socialFeedItemId_fkey" FOREIGN KEY ("socialFeedItemId") REFERENCES "SocialFeedItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
