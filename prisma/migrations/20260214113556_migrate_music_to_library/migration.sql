-- DropForeignKey
ALTER TABLE "Music" DROP CONSTRAINT "Music_musicFileId_fkey";

-- DropForeignKey
ALTER TABLE "MusicRecord" DROP CONSTRAINT "MusicRecord_fileId_fkey";

-- DropForeignKey
ALTER TABLE "TempMusicRecord" DROP CONSTRAINT "TempMusicRecord_fileId_fkey";

-- CreateTable
CREATE TABLE "MusicLibrary" (
    "id" TEXT NOT NULL,
    "filename" TEXT,
    "fileUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "metaData" JSONB,

    CONSTRAINT "MusicLibrary_pkey" PRIMARY KEY ("id")
);

-- DataMigration: Move music-related files from File to MusicLibrary
INSERT INTO "MusicLibrary" ("id", "filename", "fileUrl", "createdAt", "updatedAt", "deletedAt", "metaData")
SELECT "id", "filename", "fileUrl", "createdAt", "updatedAt", "deletedAt", "metaData"
FROM "File"
WHERE "id" IN (SELECT "musicFileId" FROM "Music" WHERE "musicFileId" IS NOT NULL)
   OR "id" IN (SELECT "fileId" FROM "MusicRecord" WHERE "fileId" IS NOT NULL)
   OR "id" IN (SELECT "fileId" FROM "TempMusicRecord" WHERE "fileId" IS NOT NULL);


-- AddForeignKey
ALTER TABLE "Music" ADD CONSTRAINT "Music_musicFileId_fkey" FOREIGN KEY ("musicFileId") REFERENCES "MusicLibrary"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MusicRecord" ADD CONSTRAINT "MusicRecord_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "MusicLibrary"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TempMusicRecord" ADD CONSTRAINT "TempMusicRecord_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "MusicLibrary"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
