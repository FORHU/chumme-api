/*
  Warnings:

  - You are about to drop the `_MusicRecordUsers` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `studioId` on table `MusicRecord` required. This step will fail if there are existing NULL values in that column.
  - Made the column `userId` on table `Playlist` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `metaData` to the `Room` table without a default value. This is not possible if the table is not empty.
  - Added the required column `position` to the `Room` table without a default value. This is not possible if the table is not empty.
  - Added the required column `color` to the `RoomCategory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `isAd` to the `RoomCategory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `members` to the `RoomCategory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `metaData` to the `RoomCategory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `position` to the `RoomCategory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `size` to the `RoomCategory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `metaData` to the `RoomSubCategory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ownerId` to the `RoomSubCategory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `position` to the `RoomSubCategory` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "MusicRecord" DROP CONSTRAINT "MusicRecord_studioId_fkey";

-- DropForeignKey
ALTER TABLE "Playlist" DROP CONSTRAINT "Playlist_userId_fkey";

-- DropForeignKey
ALTER TABLE "_MusicRecordUsers" DROP CONSTRAINT "_MusicRecordUsers_A_fkey";

-- DropForeignKey
ALTER TABLE "_MusicRecordUsers" DROP CONSTRAINT "_MusicRecordUsers_B_fkey";

-- AlterTable
ALTER TABLE "MusicRecord" ADD COLUMN     "metaData" JSONB,
ALTER COLUMN "studioId" SET NOT NULL,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "MusicStudio" ALTER COLUMN "studioType" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Playlist" ALTER COLUMN "userId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "metaData" JSONB NOT NULL,
ADD COLUMN     "position" JSONB NOT NULL;

-- AlterTable
ALTER TABLE "RoomCategory" ADD COLUMN     "color" TEXT NOT NULL,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "isAd" BOOLEAN NOT NULL,
ADD COLUMN     "members" INTEGER NOT NULL,
ADD COLUMN     "metaData" JSONB NOT NULL,
ADD COLUMN     "position" JSONB NOT NULL,
ADD COLUMN     "size" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "RoomSubCategory" ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "metaData" JSONB NOT NULL,
ADD COLUMN     "ownerId" TEXT NOT NULL,
ADD COLUMN     "position" JSONB NOT NULL;

-- DropTable
DROP TABLE "_MusicRecordUsers";

-- AddForeignKey
ALTER TABLE "Playlist" ADD CONSTRAINT "Playlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MusicRecord" ADD CONSTRAINT "MusicRecord_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "MusicStudio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
