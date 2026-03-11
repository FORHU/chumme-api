/*
  Warnings:

  - You are about to drop the column `personaVoiceId` on the `ChummeArtistPersona` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ChummeArtistPersona" DROP COLUMN "personaVoiceId",
ADD COLUMN     "name" TEXT,
ADD COLUMN     "persona" TEXT,
ADD COLUMN     "voiceKey" TEXT;
