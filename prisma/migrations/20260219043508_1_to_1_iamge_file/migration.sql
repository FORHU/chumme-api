/*
  Warnings:

  - A unique constraint covering the columns `[personaFileId]` on the table `ArtistPersona` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ArtistPersona_personaFileId_key" ON "ArtistPersona"("personaFileId");
