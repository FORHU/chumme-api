/*
  Warnings:

  - You are about to drop the `MessageReaction` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserChatRoom` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "MessageReaction" DROP CONSTRAINT "MessageReaction_messageId_fkey";

-- DropForeignKey
ALTER TABLE "MessageReaction" DROP CONSTRAINT "MessageReaction_userId_fkey";

-- DropForeignKey
ALTER TABLE "UserChatRoom" DROP CONSTRAINT "UserChatRoom_roomSubCategoryId_fkey";

-- DropForeignKey
ALTER TABLE "UserChatRoom" DROP CONSTRAINT "UserChatRoom_userId_fkey";

-- DropTable
DROP TABLE "MessageReaction";

-- DropTable
DROP TABLE "UserChatRoom";

-- CreateTable
CREATE TABLE "RoomUserChat" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roomSubCategoryId" TEXT NOT NULL,
    "userChatRole" "UserChatRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "muted" BOOLEAN NOT NULL DEFAULT false,
    "lastSeenAt" TIMESTAMP(3),

    CONSTRAINT "RoomUserChat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomMessageReaction" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomMessageReaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RoomUserChat_roomSubCategoryId_idx" ON "RoomUserChat"("roomSubCategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "RoomUserChat_userId_roomSubCategoryId_key" ON "RoomUserChat"("userId", "roomSubCategoryId");

-- CreateIndex
CREATE INDEX "RoomMessageReaction_messageId_idx" ON "RoomMessageReaction"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "RoomMessageReaction_messageId_userId_emoji_key" ON "RoomMessageReaction"("messageId", "userId", "emoji");

-- AddForeignKey
ALTER TABLE "RoomUserChat" ADD CONSTRAINT "RoomUserChat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomUserChat" ADD CONSTRAINT "RoomUserChat_roomSubCategoryId_fkey" FOREIGN KEY ("roomSubCategoryId") REFERENCES "RoomSubCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomMessageReaction" ADD CONSTRAINT "RoomMessageReaction_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "RoomMessage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomMessageReaction" ADD CONSTRAINT "RoomMessageReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
