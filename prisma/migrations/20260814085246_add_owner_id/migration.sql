-- DropForeignKey
ALTER TABLE "Conversation" DROP CONSTRAINT IF EXISTS "Conversation_userId_fkey";

-- DropForeignKey
ALTER TABLE "SocialFeedItem" DROP CONSTRAINT IF EXISTS "SocialFeedItem_postId_fkey";

-- DropForeignKey
ALTER TABLE "SocialFeedItemComment" DROP CONSTRAINT IF EXISTS "SocialFeedItemComment_socialFeedItemId_fkey";

-- DropForeignKey
ALTER TABLE "SocialFeedSignal" DROP CONSTRAINT IF EXISTS "SocialFeedSignal_socialFeedId_fkey";

-- DropForeignKey
ALTER TABLE "SocialFeedSnapshot" DROP CONSTRAINT IF EXISTS "SocialFeedSnapshot_socialFeedId_fkey";

-- DropForeignKey
ALTER TABLE "SocialIngestionSchedule" DROP CONSTRAINT IF EXISTS "SocialIngestionSchedule_socialIngestionTargetId_fkey";

-- AlterTable
ALTER TABLE "ChummeArtist" ADD COLUMN IF NOT EXISTS "ownerId" TEXT;

-- AlterTable
ALTER TABLE "ChummeCategoryDesign" ADD COLUMN IF NOT EXISTS "aiChatEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ChummeCategoryDesign" ADD COLUMN IF NOT EXISTS "discoveryEnabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Music" ADD COLUMN IF NOT EXISTS "ownerId" TEXT;

-- AlterTable
ALTER TABLE "SystemAsset" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "SystemAsset" ADD COLUMN IF NOT EXISTS "isDeleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SystemAsset" ADD COLUMN IF NOT EXISTS "title" TEXT;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "onboardingCompleted" SET DEFAULT false;

-- AddForeignKey (all guarded: every one of these already exists on a replayed database)
DO $$ BEGIN
  ALTER TABLE "ChummeArtist" ADD CONSTRAINT "ChummeArtist_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "SocialFeedItem" ADD CONSTRAINT "SocialFeedItem_postId_fkey" FOREIGN KEY ("postId") REFERENCES "SocialUserPost"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "SocialFeedSnapshot" ADD CONSTRAINT "SocialFeedSnapshot_socialFeedId_fkey" FOREIGN KEY ("socialFeedId") REFERENCES "SocialFeedItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "SocialFeedSignal" ADD CONSTRAINT "SocialFeedSignal_socialFeedId_fkey" FOREIGN KEY ("socialFeedId") REFERENCES "SocialFeedItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "SocialFeedItemComment" ADD CONSTRAINT "SocialFeedItemComment_socialFeedItemId_fkey" FOREIGN KEY ("socialFeedItemId") REFERENCES "SocialFeedItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "SocialIngestionSchedule" ADD CONSTRAINT "SocialIngestionSchedule_socialIngestionTargetId_fkey" FOREIGN KEY ("socialIngestionTargetId") REFERENCES "SocialIngestionTarget"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Music" ADD CONSTRAINT "Music_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
