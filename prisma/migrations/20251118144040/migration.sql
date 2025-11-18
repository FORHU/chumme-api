/*
  Warnings:

  - You are about to alter the column `vector` on the `Embedding` table. The data in that column could be lost. The data in that column will be cast from `vector(1536)` to `JsonB`.

*/

-- AlterTable
ALTER TABLE "Embedding"
    ALTER COLUMN "vector" DROP NOT NULL,
    ALTER COLUMN "vector"
        SET DATA TYPE JSONB
        USING to_jsonb("vector");

-- CreateTable
CREATE TABLE "MediaPostEmotion" (
    "id" TEXT NOT NULL,
    "mediaPostId" TEXT NOT NULL,
    "emotionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaPostEmotion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MediaPostEmotion_emotionId_idx" ON "MediaPostEmotion"("emotionId");

-- CreateIndex
CREATE INDEX "MediaPostEmotion_mediaPostId_idx" ON "MediaPostEmotion"("mediaPostId");

-- CreateIndex
CREATE UNIQUE INDEX "MediaPostEmotion_mediaPostId_emotionId_key" ON "MediaPostEmotion"("mediaPostId", "emotionId");

-- AddForeignKey
ALTER TABLE "MediaPostEmotion"
    ADD CONSTRAINT "MediaPostEmotion_emotionId_fkey"
    FOREIGN KEY ("emotionId") REFERENCES "Emotion"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaPostEmotion"
    ADD CONSTRAINT "MediaPostEmotion_mediaPostId_fkey"
    FOREIGN KEY ("mediaPostId") REFERENCES "MediaPost"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
