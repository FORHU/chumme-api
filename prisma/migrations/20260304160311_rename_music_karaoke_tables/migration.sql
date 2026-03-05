/*
  Warnings:

  - You are about to drop the `MusicPart` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StudioMember` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TempMusicRecord` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "MusicPart" DROP CONSTRAINT "MusicPart_musicId_fkey";

-- DropForeignKey
ALTER TABLE "MusicPart" DROP CONSTRAINT "MusicPart_recordId_fkey";

-- DropForeignKey
ALTER TABLE "MusicPart" DROP CONSTRAINT "MusicPart_singerId_fkey";

-- DropForeignKey
ALTER TABLE "StudioMember" DROP CONSTRAINT "StudioMember_studioId_fkey";

-- DropForeignKey
ALTER TABLE "StudioMember" DROP CONSTRAINT "StudioMember_userId_fkey";

-- DropForeignKey
ALTER TABLE "TempMusicRecord" DROP CONSTRAINT "TempMusicRecord_fileId_fkey";

-- DropForeignKey
ALTER TABLE "TempMusicRecord" DROP CONSTRAINT "TempMusicRecord_studioId_fkey";

-- DropTable
DROP TABLE "MusicPart";

-- DropTable
DROP TABLE "StudioMember";

-- DropTable
DROP TABLE "TempMusicRecord";

-- CreateTable
CREATE TABLE "MusicSingerPart" (
    "id" TEXT NOT NULL,
    "musicId" TEXT,
    "recordId" TEXT,
    "name" TEXT,
    "startLine" INTEGER NOT NULL,
    "endLine" INTEGER NOT NULL,
    "vocalRoleIndex" INTEGER NOT NULL DEFAULT 1,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "singerId" TEXT,

    CONSTRAINT "MusicSingerPart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MusicStudioMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "role" "StudioRole" NOT NULL DEFAULT 'LISTENER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "vocalRoleIndex" INTEGER,

    CONSTRAINT "MusicStudioMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MusicTempRecord" (
    "id" TEXT NOT NULL,
    "musicId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "order" INTEGER,
    "startTimeOffset" DOUBLE PRECISION,
    "metaData" JSONB,
    "recordDuration" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MusicTempRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MusicSingerPart_recordId_idx" ON "MusicSingerPart"("recordId");

-- CreateIndex
CREATE INDEX "MusicSingerPart_musicId_idx" ON "MusicSingerPart"("musicId");

-- CreateIndex
CREATE INDEX "MusicStudioMember_studioId_idx" ON "MusicStudioMember"("studioId");

-- CreateIndex
CREATE INDEX "MusicStudioMember_userId_idx" ON "MusicStudioMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MusicStudioMember_userId_studioId_key" ON "MusicStudioMember"("userId", "studioId");

-- CreateIndex
CREATE INDEX "MusicTempRecord_studioId_idx" ON "MusicTempRecord"("studioId");

-- AddForeignKey
ALTER TABLE "MusicSingerPart" ADD CONSTRAINT "MusicSingerPart_musicId_fkey" FOREIGN KEY ("musicId") REFERENCES "Music"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MusicSingerPart" ADD CONSTRAINT "MusicSingerPart_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "MusicRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MusicSingerPart" ADD CONSTRAINT "MusicSingerPart_singerId_fkey" FOREIGN KEY ("singerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MusicStudioMember" ADD CONSTRAINT "MusicStudioMember_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "MusicStudio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MusicStudioMember" ADD CONSTRAINT "MusicStudioMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MusicTempRecord" ADD CONSTRAINT "MusicTempRecord_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "MusicLibrary"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MusicTempRecord" ADD CONSTRAINT "MusicTempRecord_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "MusicStudio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
