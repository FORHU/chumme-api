/*
  Warnings:

  - Made the column `feedId` on table `Bookmark` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Bookmark" DROP CONSTRAINT "Bookmark_feedId_fkey";

-- AlterTable
ALTER TABLE "Bookmark" ALTER COLUMN "feedId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_feedId_fkey" FOREIGN KEY ("feedId") REFERENCES "FeedItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
