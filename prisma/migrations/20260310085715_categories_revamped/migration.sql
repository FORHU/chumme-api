/*
  Warnings:

  - You are about to drop the column `traits` on the `ChummeCategory` table. All the data in the column will be lost.
  - You are about to drop the column `artistId` on the `MediaPost` table. All the data in the column will be lost.
  - You are about to drop the column `order` on the `MusicPlaylist` table. All the data in the column will be lost.
  - You are about to drop the column `playlistId` on the `MusicPlaylist` table. All the data in the column will be lost.
  - You are about to drop the column `artistId` on the `SocialFeedItem` table. All the data in the column will be lost.
  - You are about to drop the column `platform` on the `SocialFeedItem` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `SocialFeedItem` table. All the data in the column will be lost.
  - You are about to drop the `Artist` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ArtistPersona` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FeaturedArtist` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Playlist` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserArtist` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_ArtistToChummeCategory` table. If the table is not empty, all the data it contains will be lost.
  - Changed the type of `platform` on the `MediaPost` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `description` to the `MusicPlaylist` table without a default value. This is not possible if the table is not empty.
  - Added the required column `imageUrl` to the `MusicPlaylist` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `MusicPlaylist` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `MusicPlaylist` table without a default value. This is not possible if the table is not empty.
  - Added the required column `feedItemType` to the `SocialFeedItem` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SocialPlatform" AS ENUM ('YOUTUBE', 'FACEBOOK', 'INSTAGRAM', 'TIKTOK');

-- CreateEnum
CREATE TYPE "ChummeTraits" AS ENUM ('NONE', 'COMMUNITIES', 'ENTERTAINMENT');

-- DropForeignKey
ALTER TABLE "ArtistPersona" DROP CONSTRAINT "ArtistPersona_artistId_fkey";

-- DropForeignKey
ALTER TABLE "ArtistPersona" DROP CONSTRAINT "ArtistPersona_personaFileId_fkey";

-- DropForeignKey
ALTER TABLE "FeaturedArtist" DROP CONSTRAINT "FeaturedArtist_artistId_fkey";

-- DropForeignKey
ALTER TABLE "FeaturedArtist" DROP CONSTRAINT "FeaturedArtist_musicId_fkey";

-- DropForeignKey
ALTER TABLE "Music" DROP CONSTRAINT "Music_musicArtistId_fkey";

-- DropForeignKey
ALTER TABLE "MusicAlbum" DROP CONSTRAINT "MusicAlbum_musicArtistId_fkey";

-- DropForeignKey
ALTER TABLE "MusicPlaylist" DROP CONSTRAINT "MusicPlaylist_musicId_fkey";

-- DropForeignKey
ALTER TABLE "MusicPlaylist" DROP CONSTRAINT "MusicPlaylist_playlistId_fkey";

-- DropForeignKey
ALTER TABLE "Playlist" DROP CONSTRAINT "Playlist_userId_fkey";

-- DropForeignKey
ALTER TABLE "SocialFeedItem" DROP CONSTRAINT "SocialFeedItem_artistId_fkey";

-- DropForeignKey
ALTER TABLE "UserArtist" DROP CONSTRAINT "UserArtist_artistId_fkey";

-- DropForeignKey
ALTER TABLE "UserArtist" DROP CONSTRAINT "UserArtist_userId_fkey";

-- DropForeignKey
ALTER TABLE "_ArtistToChummeCategory" DROP CONSTRAINT "_ArtistToChummeCategory_A_fkey";

-- DropForeignKey
ALTER TABLE "_ArtistToChummeCategory" DROP CONSTRAINT "_ArtistToChummeCategory_B_fkey";

-- DropIndex
DROP INDEX "MediaPost_artistId_idx";

-- DropIndex
DROP INDEX "MusicPlaylist_musicId_playlistId_key";

-- DropIndex
DROP INDEX "SocialFeedItem_artistId_idx";

-- DropIndex
DROP INDEX "SocialFeedItem_type_idx";

-- AlterTable
ALTER TABLE "ChummeCategory" DROP COLUMN "traits",
ADD COLUMN     "chummeTraits" "ChummeTraits" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "socialUserDiscoveryId" TEXT;

-- AlterTable
ALTER TABLE "ChummeSubCategory" ADD COLUMN     "chummeTraits" "ChummeTraits" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "socialUserDiscoveryId" TEXT;

-- AlterTable
ALTER TABLE "MediaPost" DROP COLUMN "artistId",
ADD COLUMN     "chummeArtistId" TEXT,
DROP COLUMN "platform",
ADD COLUMN     "platform" "SocialPlatform" NOT NULL DEFAULT 'INSTAGRAM';

-- AlterTable
ALTER TABLE "MusicPlaylist" DROP COLUMN "order",
DROP COLUMN "playlistId",
ADD COLUMN     "description" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "imageUrl" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "name" TEXT NOT NULL DEFAULT 'Untitled Playlist',
ADD COLUMN     "userId" TEXT NOT NULL DEFAULT '',
ALTER COLUMN "musicId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "SocialFeedItem" DROP COLUMN "artistId",
DROP COLUMN "platform",
DROP COLUMN "type",
ADD COLUMN     "chummeArtistId" TEXT,
ADD COLUMN     "feedItemType" "FeedItemType" NOT NULL DEFAULT 'POST',
ADD COLUMN     "socialPlatform" "SocialPlatform" DEFAULT 'INSTAGRAM';

-- DropTable
DROP TABLE "Artist";

-- DropTable
DROP TABLE "ArtistPersona";

-- DropTable
DROP TABLE "FeaturedArtist";

-- DropTable
DROP TABLE "Playlist";

-- DropTable
DROP TABLE "UserArtist";

-- DropTable
DROP TABLE "_ArtistToChummeCategory";

-- DropEnum
DROP TYPE "ChummeCategoryTraits";

-- DropEnum
DROP TYPE "VideoPlatform";

-- CreateTable
CREATE TABLE "ChummeTopicCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "note" TEXT,
    "keyPassword" TEXT,
    "isAd" BOOLEAN NOT NULL DEFAULT false,
    "chummeTraits" "ChummeTraits" NOT NULL DEFAULT 'NONE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "chummeSubCategoryId" TEXT NOT NULL,
    "chummeVisualDesignId" TEXT,
    "socialUserDiscoveryId" TEXT,

    CONSTRAINT "ChummeTopicCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChummeArtist" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bio" TEXT,
    "imageUrl" TEXT,
    "nationality" TEXT,
    "genre" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "instagramUsername" TEXT,
    "tiktokUsername" TEXT,

    CONSTRAINT "ChummeArtist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChummeArtistPersona" (
    "id" TEXT NOT NULL,
    "chummeArtistId" TEXT,
    "personaVoiceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "personaFileId" TEXT NOT NULL,

    CONSTRAINT "ChummeArtistPersona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialUserDiscovery" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialUserDiscovery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MusicFeaturedArtist" (
    "id" TEXT NOT NULL,
    "chummeArtistId" TEXT NOT NULL,
    "musicId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MusicFeaturedArtist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MusicSubPlaylist" (
    "id" TEXT NOT NULL,
    "musicId" TEXT NOT NULL,
    "playlistId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MusicSubPlaylist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ChummeArtistToChummeCategory" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ChummeArtistToChummeCategory_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ChummeArtistToSocialUserDiscovery" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ChummeArtistToSocialUserDiscovery_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChummeTopicCategory_chummeVisualDesignId_key" ON "ChummeTopicCategory"("chummeVisualDesignId");

-- CreateIndex
CREATE UNIQUE INDEX "ChummeArtist_name_key" ON "ChummeArtist"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ChummeArtistPersona_chummeArtistId_key" ON "ChummeArtistPersona"("chummeArtistId");

-- CreateIndex
CREATE UNIQUE INDEX "ChummeArtistPersona_personaFileId_key" ON "ChummeArtistPersona"("personaFileId");

-- CreateIndex
CREATE INDEX "ChummeArtistPersona_chummeArtistId_idx" ON "ChummeArtistPersona"("chummeArtistId");

-- CreateIndex
CREATE INDEX "SocialUserDiscovery_userId_idx" ON "SocialUserDiscovery"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SocialUserDiscovery_userId_key" ON "SocialUserDiscovery"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MusicFeaturedArtist_chummeArtistId_musicId_key" ON "MusicFeaturedArtist"("chummeArtistId", "musicId");

-- CreateIndex
CREATE UNIQUE INDEX "MusicSubPlaylist_musicId_playlistId_key" ON "MusicSubPlaylist"("musicId", "playlistId");

-- CreateIndex
CREATE INDEX "_ChummeArtistToChummeCategory_B_index" ON "_ChummeArtistToChummeCategory"("B");

-- CreateIndex
CREATE INDEX "_ChummeArtistToSocialUserDiscovery_B_index" ON "_ChummeArtistToSocialUserDiscovery"("B");

-- CreateIndex
CREATE INDEX "MediaPost_chummeArtistId_idx" ON "MediaPost"("chummeArtistId");

-- CreateIndex
CREATE INDEX "MediaPost_platform_idx" ON "MediaPost"("platform");

-- CreateIndex
CREATE INDEX "SocialFeedItem_feedItemType_idx" ON "SocialFeedItem"("feedItemType");

-- CreateIndex
CREATE INDEX "SocialFeedItem_chummeArtistId_idx" ON "SocialFeedItem"("chummeArtistId");

-- AddForeignKey
ALTER TABLE "ChummeCategory" ADD CONSTRAINT "ChummeCategory_socialUserDiscoveryId_fkey" FOREIGN KEY ("socialUserDiscoveryId") REFERENCES "SocialUserDiscovery"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChummeSubCategory" ADD CONSTRAINT "ChummeSubCategory_socialUserDiscoveryId_fkey" FOREIGN KEY ("socialUserDiscoveryId") REFERENCES "SocialUserDiscovery"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChummeTopicCategory" ADD CONSTRAINT "ChummeTopicCategory_chummeSubCategoryId_fkey" FOREIGN KEY ("chummeSubCategoryId") REFERENCES "ChummeSubCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChummeTopicCategory" ADD CONSTRAINT "ChummeTopicCategory_chummeVisualDesignId_fkey" FOREIGN KEY ("chummeVisualDesignId") REFERENCES "ChummeVisualDesign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChummeTopicCategory" ADD CONSTRAINT "ChummeTopicCategory_socialUserDiscoveryId_fkey" FOREIGN KEY ("socialUserDiscoveryId") REFERENCES "SocialUserDiscovery"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChummeArtistPersona" ADD CONSTRAINT "ChummeArtistPersona_chummeArtistId_fkey" FOREIGN KEY ("chummeArtistId") REFERENCES "ChummeArtist"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChummeArtistPersona" ADD CONSTRAINT "ChummeArtistPersona_personaFileId_fkey" FOREIGN KEY ("personaFileId") REFERENCES "File"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialUserDiscovery" ADD CONSTRAINT "SocialUserDiscovery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialFeedItem" ADD CONSTRAINT "SocialFeedItem_chummeArtistId_fkey" FOREIGN KEY ("chummeArtistId") REFERENCES "ChummeArtist"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MusicFeaturedArtist" ADD CONSTRAINT "MusicFeaturedArtist_chummeArtistId_fkey" FOREIGN KEY ("chummeArtistId") REFERENCES "ChummeArtist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MusicFeaturedArtist" ADD CONSTRAINT "MusicFeaturedArtist_musicId_fkey" FOREIGN KEY ("musicId") REFERENCES "Music"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MusicPlaylist" ADD CONSTRAINT "MusicPlaylist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MusicPlaylist" ADD CONSTRAINT "MusicPlaylist_musicId_fkey" FOREIGN KEY ("musicId") REFERENCES "Music"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MusicSubPlaylist" ADD CONSTRAINT "MusicSubPlaylist_musicId_fkey" FOREIGN KEY ("musicId") REFERENCES "Music"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MusicSubPlaylist" ADD CONSTRAINT "MusicSubPlaylist_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "MusicPlaylist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MusicAlbum" ADD CONSTRAINT "MusicAlbum_musicArtistId_fkey" FOREIGN KEY ("musicArtistId") REFERENCES "ChummeArtist"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Music" ADD CONSTRAINT "Music_musicArtistId_fkey" FOREIGN KEY ("musicArtistId") REFERENCES "ChummeArtist"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ChummeArtistToChummeCategory" ADD CONSTRAINT "_ChummeArtistToChummeCategory_A_fkey" FOREIGN KEY ("A") REFERENCES "ChummeArtist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ChummeArtistToChummeCategory" ADD CONSTRAINT "_ChummeArtistToChummeCategory_B_fkey" FOREIGN KEY ("B") REFERENCES "ChummeCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ChummeArtistToSocialUserDiscovery" ADD CONSTRAINT "_ChummeArtistToSocialUserDiscovery_A_fkey" FOREIGN KEY ("A") REFERENCES "ChummeArtist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ChummeArtistToSocialUserDiscovery" ADD CONSTRAINT "_ChummeArtistToSocialUserDiscovery_B_fkey" FOREIGN KEY ("B") REFERENCES "SocialUserDiscovery"("id") ON DELETE CASCADE ON UPDATE CASCADE;
