/*
  Warnings:

  - A unique constraint covering the columns `[keyName]` on the table `Room` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[keyName]` on the table `RoomCategory` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[keyName]` on the table `RoomSubCategory` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "keyName" TEXT;

-- AlterTable
ALTER TABLE "RoomCategory" ADD COLUMN     "keyName" TEXT;

-- AlterTable
ALTER TABLE "RoomSubCategory" ADD COLUMN     "keyName" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Room_keyName_key" ON "Room"("keyName");

-- CreateIndex
CREATE UNIQUE INDEX "RoomCategory_keyName_key" ON "RoomCategory"("keyName");

-- CreateIndex
CREATE UNIQUE INDEX "RoomSubCategory_keyName_key" ON "RoomSubCategory"("keyName");
