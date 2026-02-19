/*
  Warnings:

  - You are about to drop the column `personaImageId` on the `ArtistPersona` table. All the data in the column will be lost.
  - Added the required column `personaFileId` to the `ArtistPersona` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ArtistPersona" DROP CONSTRAINT "ArtistPersona_personaImageId_fkey";

-- AlterTable
ALTER TABLE "ArtistPersona" DROP COLUMN "personaImageId",
ADD COLUMN     "personaFileId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "ArtistPersona" ADD CONSTRAINT "ArtistPersona_personaFileId_fkey" FOREIGN KEY ("personaFileId") REFERENCES "File"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
