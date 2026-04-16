-- CreateEnum
CREATE TYPE "SportEventStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'HALFTIME', 'FINAL', 'POSTPONED', 'CANCELLED', 'DELAYED');

-- AlterTable
ALTER TABLE "Music" ADD COLUMN     "genre" TEXT,
ADD COLUMN     "playCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "MusicPlaylist" ADD COLUMN     "coverImageUrl" TEXT,
ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "UserLikedSong" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "musicId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserLikedSong_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SportLeague" (
    "id" TEXT NOT NULL,
    "espnSlug" TEXT NOT NULL,
    "espnSport" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT NOT NULL,
    "logoUrl" TEXT,
    "chummeSubCategoryId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "pollIntervalSeconds" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SportLeague_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SportTeam" (
    "id" TEXT NOT NULL,
    "espnId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "logoUrl" TEXT,
    "color" TEXT,
    "alternateColor" TEXT,
    "venue" TEXT,
    "chummeTopicCategoryId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SportTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SportAthlete" (
    "id" TEXT NOT NULL,
    "espnId" TEXT NOT NULL,
    "teamId" TEXT,
    "leagueId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "position" TEXT,
    "jerseyNumber" TEXT,
    "headshotUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metaData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SportAthlete_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SportEvent" (
    "id" TEXT NOT NULL,
    "espnId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "homeTeamId" TEXT NOT NULL,
    "awayTeamId" TEXT NOT NULL,
    "homeScore" INTEGER NOT NULL DEFAULT 0,
    "awayScore" INTEGER NOT NULL DEFAULT 0,
    "status" "SportEventStatus" NOT NULL,
    "statusDetail" TEXT,
    "period" INTEGER,
    "clock" TEXT,
    "possession" TEXT,
    "gameDate" TIMESTAMP(3) NOT NULL,
    "venue" TEXT,
    "broadcast" TEXT,
    "spread" TEXT,
    "overUnder" TEXT,
    "homeLineScores" JSONB,
    "awayLineScores" JSONB,
    "metaData" JSONB,
    "lastPolledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SportEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SportPlayerStat" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "stats" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SportPlayerStat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserLikedSong_userId_idx" ON "UserLikedSong"("userId");

-- CreateIndex
CREATE INDEX "UserLikedSong_musicId_idx" ON "UserLikedSong"("musicId");

-- CreateIndex
CREATE UNIQUE INDEX "UserLikedSong_userId_musicId_key" ON "UserLikedSong"("userId", "musicId");

-- CreateIndex
CREATE UNIQUE INDEX "SportTeam_espnId_key" ON "SportTeam"("espnId");

-- CreateIndex
CREATE UNIQUE INDEX "SportAthlete_espnId_key" ON "SportAthlete"("espnId");

-- CreateIndex
CREATE UNIQUE INDEX "SportEvent_espnId_key" ON "SportEvent"("espnId");

-- CreateIndex
CREATE UNIQUE INDEX "SportPlayerStat_eventId_athleteId_key" ON "SportPlayerStat"("eventId", "athleteId");

-- CreateIndex
CREATE INDEX "Music_playCount_idx" ON "Music"("playCount");

-- CreateIndex
CREATE INDEX "Music_genre_idx" ON "Music"("genre");

-- AddForeignKey
ALTER TABLE "UserLikedSong" ADD CONSTRAINT "UserLikedSong_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLikedSong" ADD CONSTRAINT "UserLikedSong_musicId_fkey" FOREIGN KEY ("musicId") REFERENCES "Music"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SportLeague" ADD CONSTRAINT "SportLeague_chummeSubCategoryId_fkey" FOREIGN KEY ("chummeSubCategoryId") REFERENCES "ChummeSubCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SportTeam" ADD CONSTRAINT "SportTeam_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "SportLeague"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SportTeam" ADD CONSTRAINT "SportTeam_chummeTopicCategoryId_fkey" FOREIGN KEY ("chummeTopicCategoryId") REFERENCES "ChummeTopicCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SportAthlete" ADD CONSTRAINT "SportAthlete_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "SportTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SportAthlete" ADD CONSTRAINT "SportAthlete_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "SportLeague"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SportEvent" ADD CONSTRAINT "SportEvent_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "SportLeague"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SportEvent" ADD CONSTRAINT "SportEvent_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "SportTeam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SportEvent" ADD CONSTRAINT "SportEvent_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "SportTeam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SportPlayerStat" ADD CONSTRAINT "SportPlayerStat_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "SportEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SportPlayerStat" ADD CONSTRAINT "SportPlayerStat_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "SportAthlete"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SportPlayerStat" ADD CONSTRAINT "SportPlayerStat_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "SportTeam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
