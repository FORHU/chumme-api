-- DropForeignKey
ALTER TABLE "Conversation" DROP CONSTRAINT "Conversation_userId_fkey";

-- DropForeignKey
ALTER TABLE "SocialFeedItem" DROP CONSTRAINT "SocialFeedItem_postId_fkey";

-- DropForeignKey
ALTER TABLE "SocialFeedItemComment" DROP CONSTRAINT "SocialFeedItemComment_socialFeedItemId_fkey";

-- DropForeignKey
ALTER TABLE "SocialFeedSignal" DROP CONSTRAINT "SocialFeedSignal_socialFeedId_fkey";

-- DropForeignKey
ALTER TABLE "SocialFeedSnapshot" DROP CONSTRAINT "SocialFeedSnapshot_socialFeedId_fkey";

-- DropForeignKey
ALTER TABLE "SocialIngestionSchedule" DROP CONSTRAINT "SocialIngestionSchedule_socialIngestionTargetId_fkey";

-- AlterTable
ALTER TABLE "ChummeArtist" ADD COLUMN     "ownerId" TEXT;

-- AlterTable
ALTER TABLE "ChummeCategoryDesign" ADD COLUMN     "aiChatEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "discoveryEnabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Music" ADD COLUMN     "ownerId" TEXT;

-- AlterTable
ALTER TABLE "SystemAsset" ADD COLUMN     "description" TEXT,
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "title" TEXT;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "onboardingCompleted" SET DEFAULT false;

-- AddForeignKey
ALTER TABLE "ChummeArtist" ADD CONSTRAINT "ChummeArtist_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialFeedItem" ADD CONSTRAINT "SocialFeedItem_postId_fkey" FOREIGN KEY ("postId") REFERENCES "SocialUserPost"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialFeedSnapshot" ADD CONSTRAINT "SocialFeedSnapshot_socialFeedId_fkey" FOREIGN KEY ("socialFeedId") REFERENCES "SocialFeedItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialFeedSignal" ADD CONSTRAINT "SocialFeedSignal_socialFeedId_fkey" FOREIGN KEY ("socialFeedId") REFERENCES "SocialFeedItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialFeedItemComment" ADD CONSTRAINT "SocialFeedItemComment_socialFeedItemId_fkey" FOREIGN KEY ("socialFeedItemId") REFERENCES "SocialFeedItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialIngestionSchedule" ADD CONSTRAINT "SocialIngestionSchedule_socialIngestionTargetId_fkey" FOREIGN KEY ("socialIngestionTargetId") REFERENCES "SocialIngestionTarget"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Music" ADD CONSTRAINT "Music_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
