-- AlterTable
ALTER TABLE "FeedItem" ADD COLUMN     "mediaPostId" TEXT;

-- CreateTable
CREATE TABLE "MediaPost" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "platform" "VideoPlatform" NOT NULL,
    "artistId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "fileId" TEXT NOT NULL,
    "meta_data" JSONB,
    "externalUrl" TEXT,

    CONSTRAINT "MediaPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MediaPost_externalUrl_key" ON "MediaPost"("externalUrl");

-- CreateIndex
CREATE INDEX "MediaPost_artistId_idx" ON "MediaPost"("artistId");

-- CreateIndex
CREATE INDEX "MediaPost_platform_idx" ON "MediaPost"("platform");

-- CreateIndex
CREATE INDEX "MediaPost_fileId_idx" ON "MediaPost"("fileId");

-- AddForeignKey
ALTER TABLE "MediaPost" ADD CONSTRAINT "MediaPost_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaPost" ADD CONSTRAINT "MediaPost_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedItem" ADD CONSTRAINT "FeedItem_mediaPostId_fkey" FOREIGN KEY ("mediaPostId") REFERENCES "MediaPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
