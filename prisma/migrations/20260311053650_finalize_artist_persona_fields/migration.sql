/*
  Warnings:

  - Made the column `name` on table `ChummeArtistPersona` required. This step will fail if there are existing NULL values in that column.
  - Made the column `persona` on table `ChummeArtistPersona` required. This step will fail if there are existing NULL values in that column.
  - Made the column `voiceKey` on table `ChummeArtistPersona` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "ChummeArtistPersona" ALTER COLUMN "name" SET NOT NULL,
ALTER COLUMN "persona" SET NOT NULL,
ALTER COLUMN "voiceKey" SET NOT NULL;
