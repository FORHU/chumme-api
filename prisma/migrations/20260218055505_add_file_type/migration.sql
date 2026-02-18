-- CreateEnum
CREATE TYPE "MusicFileType" AS ENUM ('MUSIC', 'KARAOKE', 'PREVIEW', 'RECORDING', 'VOCAL', 'INSTRUMENTAL', 'OTHER');

-- AlterTable
ALTER TABLE "MusicLibrary" ADD COLUMN     "fileType" "MusicFileType" NOT NULL DEFAULT 'MUSIC';
