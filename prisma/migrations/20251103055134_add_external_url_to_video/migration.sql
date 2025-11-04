/*
  Warnings:

  - A unique constraint covering the columns `[externalUrl]` on the table `Video` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "externalUrl" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Video_externalUrl_key" ON "Video"("externalUrl");
