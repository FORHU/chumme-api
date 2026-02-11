-- CreateTable
CREATE TABLE "TempMusicRecord" (
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

    CONSTRAINT "TempMusicRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TempMusicRecord_studioId_idx" ON "TempMusicRecord"("studioId");

-- AddForeignKey
ALTER TABLE "TempMusicRecord" ADD CONSTRAINT "TempMusicRecord_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "MusicStudio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TempMusicRecord" ADD CONSTRAINT "TempMusicRecord_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
