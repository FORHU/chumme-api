/*
  Warnings:

  - A unique constraint covering the columns `[conversationId]` on the table `ChatMessage` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ChatMessage_conversationId_key" ON "ChatMessage"("conversationId");
