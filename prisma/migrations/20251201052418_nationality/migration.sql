/*
  Warnings:

  - You are about to drop the column `postId` on the `Bookmark` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Bookmark" DROP CONSTRAINT "Bookmark_postId_fkey";

-- AlterTable
ALTER TABLE "Bookmark" DROP COLUMN "postId",
ADD COLUMN     "feedId" TEXT;

-- AlterTable
ALTER TABLE "FeedItem" ADD COLUMN     "artistId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "nationality" TEXT;

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_feedId_fkey" FOREIGN KEY ("feedId") REFERENCES "FeedItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
