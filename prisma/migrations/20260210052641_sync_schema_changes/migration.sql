/*
  Warnings:

  - You are about to drop the column `members` on the `RoomCategory` table. All the data in the column will be lost.
  - Added the required column `membersCount` to the `RoomCategory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `color` to the `RoomSubCategory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `isAd` to the `RoomSubCategory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `membersCount` to the `RoomSubCategory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `size` to the `RoomSubCategory` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "RoomCategory" DROP COLUMN "members",
ADD COLUMN     "membersCount" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "RoomSubCategory" ADD COLUMN     "color" TEXT NOT NULL,
ADD COLUMN     "isAd" BOOLEAN NOT NULL,
ADD COLUMN     "membersCount" INTEGER NOT NULL,
ADD COLUMN     "size" TEXT NOT NULL;
