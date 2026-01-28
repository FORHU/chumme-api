
CREATE EXTENSION IF NOT EXISTS vector;

/*
  Warnings:

  - You are about to drop the column `provider` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Embedding" ADD COLUMN     "vector_search" vector;

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "provider" TEXT,
ADD COLUMN     "providerAvatarUrl" TEXT,
ADD COLUMN     "providerUserId" TEXT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "provider",
ALTER COLUMN "password" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Playlist" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Playlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MusicAlbum" (
    "id" TEXT NOT NULL,
    "album" TEXT NOT NULL,
    "genre" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "musicArtistId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MusicAlbum_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeaturedArtist" (
    "id" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "musicId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeaturedArtist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Music" (
    "id" TEXT NOT NULL,
    "musicArtistId" TEXT,
    "title" TEXT NOT NULL,
    "duration" DOUBLE PRECISION,
    "bpm" INTEGER,
    "hasWordTiming" BOOLEAN NOT NULL DEFAULT false,
    "meta_data" JSONB NOT NULL,
    "release_date" TIMESTAMP(3) NOT NULL,
    "file_url" TEXT NOT NULL,
    "musicAlbumId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Music_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MusicPlaylist" (
    "id" TEXT NOT NULL,
    "musicId" TEXT NOT NULL,
    "playlistId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MusicPlaylist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FeaturedArtist_artistId_musicId_key" ON "FeaturedArtist"("artistId", "musicId");

-- CreateIndex
CREATE UNIQUE INDEX "MusicPlaylist_musicId_playlistId_key" ON "MusicPlaylist"("musicId", "playlistId");

-- CreateIndex
CREATE INDEX "embedding_vector_search_idx" ON "Embedding"("vector_search");


-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_provider_providerUserId_idx" ON "Session"("provider", "providerUserId");

-- AddForeignKey
ALTER TABLE "MusicAlbum" ADD CONSTRAINT "MusicAlbum_musicArtistId_fkey" FOREIGN KEY ("musicArtistId") REFERENCES "Artist"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeaturedArtist" ADD CONSTRAINT "FeaturedArtist_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeaturedArtist" ADD CONSTRAINT "FeaturedArtist_musicId_fkey" FOREIGN KEY ("musicId") REFERENCES "Music"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Music" ADD CONSTRAINT "Music_musicArtistId_fkey" FOREIGN KEY ("musicArtistId") REFERENCES "Artist"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Music" ADD CONSTRAINT "Music_musicAlbumId_fkey" FOREIGN KEY ("musicAlbumId") REFERENCES "MusicAlbum"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MusicPlaylist" ADD CONSTRAINT "MusicPlaylist_musicId_fkey" FOREIGN KEY ("musicId") REFERENCES "Music"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MusicPlaylist" ADD CONSTRAINT "MusicPlaylist_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "Playlist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
