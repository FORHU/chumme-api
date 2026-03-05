/*
  Warnings:

  - You are about to drop the column `borderSet` on the `RoomCategory` table. All the data in the column will be lost.
  - You are about to drop the column `shadowSet` on the `RoomCategory` table. All the data in the column will be lost.
  - You are about to drop the column `borderSet` on the `RoomSubCategory` table. All the data in the column will be lost.
  - You are about to drop the column `shadowSet` on the `RoomSubCategory` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "RoomCategory" DROP COLUMN "borderSet",
DROP COLUMN "shadowSet",
ADD COLUMN     "border" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "pinnedMessageId" TEXT,
ADD COLUMN     "shadow" JSONB NOT NULL DEFAULT '{}',
ALTER COLUMN "status" SET DEFAULT 'active',
ALTER COLUMN "status" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "RoomSubCategory" DROP COLUMN "borderSet",
DROP COLUMN "shadowSet",
ADD COLUMN     "border" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "pinnedMessageId" TEXT,
ADD COLUMN     "shadow" JSONB NOT NULL DEFAULT '{}',
ALTER COLUMN "status" SET DEFAULT 'active',
ALTER COLUMN "status" SET DATA TYPE TEXT;
