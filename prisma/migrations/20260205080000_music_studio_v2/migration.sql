-- Music Studio V2: Consolidated Migration
-- This migration captures all changes for the Music Studio feature:
-- 1. StudioType enum (RELAYSINGING, CROWDSINGING, COMPETITION)
-- 2. RelayMode enum (AUTO, MANUAL, INTERVAL, PHRASING)
-- 3. MusicPart model for phrasing templates
-- 4. MusicRecord.singers many-to-many relation
-- 5. StudioMember.vocalRoleIndex for vocal assignments
-- 6. MusicStudio.relayMode, relayInterval, studioType fields
-- 7. MusicRecord.studioId and updatedAt fields
-- 8. Playlist.userId field

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "StudioType" AS ENUM ('RELAYSINGING', 'CROWDSINGING', 'COMPETITION');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "RelayMode" AS ENUM ('AUTO', 'MANUAL', 'INTERVAL', 'PHRASING');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- DropForeignKey
ALTER TABLE "MusicStudio" DROP CONSTRAINT IF EXISTS "MusicStudio_musicRecordId_fkey";

-- AlterTable
ALTER TABLE "MusicRecord" ADD COLUMN IF NOT EXISTS "studioId" TEXT,
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "MusicStudio" DROP COLUMN IF EXISTS "musicRecordId",
ADD COLUMN IF NOT EXISTS "relayInterval" INTEGER,
ADD COLUMN IF NOT EXISTS "relayMode" "RelayMode" NOT NULL DEFAULT 'AUTO',
ADD COLUMN IF NOT EXISTS "studioType" "StudioType" NOT NULL DEFAULT 'RELAYSINGING';

-- AlterTable
ALTER TABLE "Playlist" ADD COLUMN IF NOT EXISTS "userId" TEXT;

-- AlterTable
ALTER TABLE "StudioMember" ADD COLUMN IF NOT EXISTS "vocalRoleIndex" INTEGER;

-- CreateTable
CREATE TABLE IF NOT EXISTS "MusicPart" (
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

    CONSTRAINT "MusicPart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "_MusicRecordSingers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_MusicRecordSingers_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MusicPart_recordId_idx" ON "MusicPart"("recordId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MusicPart_musicId_idx" ON "MusicPart"("musicId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "_MusicRecordSingers_B_index" ON "_MusicRecordSingers"("B");

-- AddForeignKey
ALTER TABLE "Playlist" ADD CONSTRAINT "Playlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MusicPart" ADD CONSTRAINT "MusicPart_musicId_fkey" FOREIGN KEY ("musicId") REFERENCES "Music"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MusicPart" ADD CONSTRAINT "MusicPart_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "MusicRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MusicRecord" ADD CONSTRAINT "MusicRecord_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "MusicStudio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MusicRecordSingers" ADD CONSTRAINT "_MusicRecordSingers_A_fkey" FOREIGN KEY ("A") REFERENCES "MusicRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MusicRecordSingers" ADD CONSTRAINT "_MusicRecordSingers_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
