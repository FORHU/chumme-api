/*
  Warnings:

  - You are about to drop the column `feedItemType` on the `SocialFeedItem` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "SocialFeedItem_feedItemType_idx";

-- AlterTable
ALTER TABLE "SocialFeedItem" DROP COLUMN "feedItemType";

-- DropEnum
DROP TYPE "FeedItemType";
