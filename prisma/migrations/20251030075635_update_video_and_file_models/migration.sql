/*
  Warnings:

  - You are about to drop the column `duration` on the `Video` table. All the data in the column will be lost.
  - You are about to drop the column `thumbnailUrl` on the `Video` table. All the data in the column will be lost.
  - You are about to drop the column `transcript` on the `Video` table. All the data in the column will be lost.
  - You are about to drop the column `url` on the `Video` table. All the data in the column will be lost.
  - You are about to drop the column `viewCount` on the `Video` table. All the data in the column will be lost.
  - Added the required column `fileId` to the `Video` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."Video_url_key";

-- AlterTable
ALTER TABLE "Video" DROP COLUMN "duration",
DROP COLUMN "thumbnailUrl",
DROP COLUMN "transcript",
DROP COLUMN "url",
DROP COLUMN "viewCount",
ADD COLUMN     "fileId" TEXT NOT NULL,
ADD COLUMN     "meta_data" JSONB;

-- CreateIndex
CREATE INDEX "Video_fileId_idx" ON "Video"("fileId");

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
