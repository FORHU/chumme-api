/*
  Warnings:

  - A unique constraint covering the columns `[roomId,userId]` on the table `UserChat` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "UserChat_roomId_userId_key" ON "UserChat"("roomId", "userId");
