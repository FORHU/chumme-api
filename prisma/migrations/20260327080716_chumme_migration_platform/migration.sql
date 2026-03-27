/*
  Warnings:

  - You are about to drop the column `instagramUsername` on the `ChummeArtist` table. All the data in the column will be lost.
  - You are about to drop the column `tiktokUsername` on the `ChummeArtist` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ChummeArtist" DROP COLUMN "instagramUsername",
DROP COLUMN "tiktokUsername",
ADD COLUMN     "platform" TEXT NOT NULL DEFAULT 'YOUTUBE',
ADD COLUMN     "socialPlatformUsername" TEXT;
