/*
  Warnings:

  - The `role` column on the `ChatMessage` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `relayMode` column on the `MusicStudio` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `studioType` column on the `MusicStudio` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `role` column on the `MusicStudioMember` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `border` on the `RoomCategory` table. All the data in the column will be lost.
  - You are about to drop the column `capacity` on the `RoomCategory` table. All the data in the column will be lost.
  - You are about to drop the column `colorSet` on the `RoomCategory` table. All the data in the column will be lost.
  - You are about to drop the column `emojiIcon` on the `RoomCategory` table. All the data in the column will be lost.
  - You are about to drop the column `keyName` on the `RoomCategory` table. All the data in the column will be lost.
  - You are about to drop the column `metaData` on the `RoomCategory` table. All the data in the column will be lost.
  - You are about to drop the column `opacity` on the `RoomCategory` table. All the data in the column will be lost.
  - You are about to drop the column `position` on the `RoomCategory` table. All the data in the column will be lost.
  - You are about to drop the column `shadow` on the `RoomCategory` table. All the data in the column will be lost.
  - You are about to drop the column `sizeSet` on the `RoomCategory` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `RoomCategory` table. All the data in the column will be lost.
  - You are about to drop the column `tags` on the `RoomCategory` table. All the data in the column will be lost.
  - You are about to drop the column `border` on the `RoomSubCategory` table. All the data in the column will be lost.
  - You are about to drop the column `capacity` on the `RoomSubCategory` table. All the data in the column will be lost.
  - You are about to drop the column `colorSet` on the `RoomSubCategory` table. All the data in the column will be lost.
  - You are about to drop the column `emojiIcon` on the `RoomSubCategory` table. All the data in the column will be lost.
  - You are about to drop the column `isAd` on the `RoomSubCategory` table. All the data in the column will be lost.
  - You are about to drop the column `keyName` on the `RoomSubCategory` table. All the data in the column will be lost.
  - You are about to drop the column `metaData` on the `RoomSubCategory` table. All the data in the column will be lost.
  - You are about to drop the column `opacity` on the `RoomSubCategory` table. All the data in the column will be lost.
  - You are about to drop the column `position` on the `RoomSubCategory` table. All the data in the column will be lost.
  - You are about to drop the column `shadow` on the `RoomSubCategory` table. All the data in the column will be lost.
  - You are about to drop the column `sizeSet` on the `RoomSubCategory` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `RoomSubCategory` table. All the data in the column will be lost.
  - You are about to drop the column `tags` on the `RoomSubCategory` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[roomVisualDesignId]` on the table `RoomCategory` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[roomVisualDesignId]` on the table `RoomSubCategory` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ChatMessageRole" AS ENUM ('USER', 'AI', 'ADMIN');

-- CreateEnum
CREATE TYPE "MusicStudioRole" AS ENUM ('LISTENER', 'SINGER', 'PRODUCER');

-- CreateEnum
CREATE TYPE "MusicStudioType" AS ENUM ('RELAYSINGING', 'CROWDSINGING', 'COMPETITION');

-- CreateEnum
CREATE TYPE "MusicRelayMode" AS ENUM ('AUTO', 'MANUAL', 'INTERVAL', 'PHRASING');

-- CreateEnum
CREATE TYPE "RoomCategoryTraits" AS ENUM ('NONE', 'COLLABORATION', 'FEEDS');

-- DropIndex
DROP INDEX "RoomCategory_keyName_key";

-- DropIndex
DROP INDEX "RoomSubCategory_keyName_key";

-- AlterTable
ALTER TABLE "ChatMessage" DROP COLUMN "role",
ADD COLUMN     "role" "ChatMessageRole" NOT NULL DEFAULT 'USER';

-- AlterTable
ALTER TABLE "MusicStudio" DROP COLUMN "relayMode",
ADD COLUMN     "relayMode" "MusicRelayMode" NOT NULL DEFAULT 'AUTO',
DROP COLUMN "studioType",
ADD COLUMN     "studioType" "MusicStudioType" NOT NULL DEFAULT 'RELAYSINGING';

-- AlterTable
ALTER TABLE "MusicStudioMember" DROP COLUMN "role",
ADD COLUMN     "role" "MusicStudioRole" NOT NULL DEFAULT 'LISTENER';

-- AlterTable
ALTER TABLE "RoomCategory" DROP COLUMN "border",
DROP COLUMN "capacity",
DROP COLUMN "colorSet",
DROP COLUMN "emojiIcon",
DROP COLUMN "keyName",
DROP COLUMN "metaData",
DROP COLUMN "opacity",
DROP COLUMN "position",
DROP COLUMN "shadow",
DROP COLUMN "sizeSet",
DROP COLUMN "status",
DROP COLUMN "tags",
ADD COLUMN     "isPrivate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "roomVisualDesignId" TEXT,
ADD COLUMN     "traits" "RoomCategoryTraits",
ALTER COLUMN "isAd" SET DEFAULT false;

-- AlterTable
ALTER TABLE "RoomSubCategory" DROP COLUMN "border",
DROP COLUMN "capacity",
DROP COLUMN "colorSet",
DROP COLUMN "emojiIcon",
DROP COLUMN "isAd",
DROP COLUMN "keyName",
DROP COLUMN "metaData",
DROP COLUMN "opacity",
DROP COLUMN "position",
DROP COLUMN "shadow",
DROP COLUMN "sizeSet",
DROP COLUMN "status",
DROP COLUMN "tags",
ADD COLUMN     "isPrivate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "roomVisualDesignId" TEXT;

-- DropEnum
DROP TYPE "ChatRole";

-- DropEnum
DROP TYPE "RelayMode";

-- DropEnum
DROP TYPE "StudioRole";

-- DropEnum
DROP TYPE "StudioType";

-- CreateTable
CREATE TABLE "RoomVisualDesign" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "metaData" JSONB NOT NULL DEFAULT '{}',
    "position" JSONB NOT NULL DEFAULT '{}',
    "colorSet" JSONB NOT NULL DEFAULT '{}',
    "sizeSet" JSONB NOT NULL DEFAULT '{}',
    "border" JSONB NOT NULL DEFAULT '{}',
    "shadow" JSONB NOT NULL DEFAULT '{}',
    "opacity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'active',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "emojiIcon" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "RoomVisualDesign_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RoomCategory_roomVisualDesignId_key" ON "RoomCategory"("roomVisualDesignId");

-- CreateIndex
CREATE UNIQUE INDEX "RoomSubCategory_roomVisualDesignId_key" ON "RoomSubCategory"("roomVisualDesignId");

-- AddForeignKey
ALTER TABLE "RoomCategory" ADD CONSTRAINT "RoomCategory_roomVisualDesignId_fkey" FOREIGN KEY ("roomVisualDesignId") REFERENCES "RoomVisualDesign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomSubCategory" ADD CONSTRAINT "RoomSubCategory_roomVisualDesignId_fkey" FOREIGN KEY ("roomVisualDesignId") REFERENCES "RoomVisualDesign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
