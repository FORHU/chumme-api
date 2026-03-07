/*
  Warnings:

  - You are about to drop the column `keyName` on the `MusicStudio` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "MusicStudio" DROP COLUMN "keyName",
ADD COLUMN     "keyPassword" TEXT;
