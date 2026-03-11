/*
  Warnings:

  - You are about to drop the column `personaFileId` on the `ChummeArtistPersona` table. All the data in the column will be lost.
  - You are about to drop the `_ChummeArtistToSocialUserDiscovery` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[audioPathId]` on the table `ChummeArtistPersona` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[videoPathId]` on the table `ChummeArtistPersona` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[imagePathId]` on the table `ChummeArtistPersona` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "ChummeArtistPersona" DROP CONSTRAINT "ChummeArtistPersona_personaFileId_fkey";

-- DropForeignKey
ALTER TABLE "_ChummeArtistToSocialUserDiscovery" DROP CONSTRAINT "_ChummeArtistToSocialUserDiscovery_A_fkey";

-- DropForeignKey
ALTER TABLE "_ChummeArtistToSocialUserDiscovery" DROP CONSTRAINT "_ChummeArtistToSocialUserDiscovery_B_fkey";

-- DropIndex
DROP INDEX "ChummeArtistPersona_personaFileId_key";

-- AlterTable
ALTER TABLE "ChummeArtistPersona" DROP COLUMN "personaFileId",
ADD COLUMN     "audioPathId" TEXT,
ADD COLUMN     "imagePathId" TEXT,
ADD COLUMN     "videoPathId" TEXT;

-- DropTable
DROP TABLE "_ChummeArtistToSocialUserDiscovery";

-- CreateIndex
CREATE UNIQUE INDEX "ChummeArtistPersona_audioPathId_key" ON "ChummeArtistPersona"("audioPathId");

-- CreateIndex
CREATE UNIQUE INDEX "ChummeArtistPersona_videoPathId_key" ON "ChummeArtistPersona"("videoPathId");

-- CreateIndex
CREATE UNIQUE INDEX "ChummeArtistPersona_imagePathId_key" ON "ChummeArtistPersona"("imagePathId");

-- AddForeignKey
ALTER TABLE "ChummeArtistPersona" ADD CONSTRAINT "ChummeArtistPersona_audioPathId_fkey" FOREIGN KEY ("audioPathId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChummeArtistPersona" ADD CONSTRAINT "ChummeArtistPersona_videoPathId_fkey" FOREIGN KEY ("videoPathId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChummeArtistPersona" ADD CONSTRAINT "ChummeArtistPersona_imagePathId_fkey" FOREIGN KEY ("imagePathId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;
