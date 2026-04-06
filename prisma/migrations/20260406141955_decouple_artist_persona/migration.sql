/*
  Warnings:

  - You are about to drop the column `chummeArtistId` on the `ChummeArtistPersona` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "ChummeArtistPersona" DROP CONSTRAINT "ChummeArtistPersona_chummeArtistId_fkey";

-- DropIndex
DROP INDEX "ChummeArtistPersona_chummeArtistId_idx";

-- DropIndex
DROP INDEX "ChummeArtistPersona_chummeArtistId_key";

-- AlterTable
ALTER TABLE "ChummeArtistPersona" DROP COLUMN "chummeArtistId";
