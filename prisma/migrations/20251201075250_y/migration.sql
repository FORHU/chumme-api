/*
  Warnings:

  - A unique constraint covering the columns `[feedId,userId]` on the table `Bookmark` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Bookmark_feedId_userId_key" ON "Bookmark"("feedId", "userId");
