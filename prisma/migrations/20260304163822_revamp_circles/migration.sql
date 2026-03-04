/*
  Warnings:

  - You are about to drop the column `color` on the `RoomCategory` table. All the data in the column will be lost.
  - You are about to drop the column `imageUrl` on the `RoomCategory` table. All the data in the column will be lost.
  - You are about to drop the column `size` on the `RoomCategory` table. All the data in the column will be lost.
  - You are about to drop the column `color` on the `RoomSubCategory` table. All the data in the column will be lost.
  - You are about to drop the column `imageUrl` on the `RoomSubCategory` table. All the data in the column will be lost.
  - You are about to drop the column `size` on the `RoomSubCategory` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "RoomCategory" DROP COLUMN "color",
DROP COLUMN "imageUrl",
DROP COLUMN "size",
ADD COLUMN     "borderSet" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "capacity" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "colorSet" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "emojiIcon" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "opacity" DOUBLE PRECISION NOT NULL DEFAULT 1,
ADD COLUMN     "shadowSet" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "sizeSet" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "status" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "metaData" SET DEFAULT '{}',
ALTER COLUMN "position" SET DEFAULT '{}';

-- AlterTable
ALTER TABLE "RoomSubCategory" DROP COLUMN "color",
DROP COLUMN "imageUrl",
DROP COLUMN "size",
ADD COLUMN     "borderSet" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "capacity" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "colorSet" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "emojiIcon" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "opacity" DOUBLE PRECISION NOT NULL DEFAULT 1,
ADD COLUMN     "shadowSet" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "sizeSet" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "status" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "metaData" SET DEFAULT '{}',
ALTER COLUMN "position" SET DEFAULT '{}';
