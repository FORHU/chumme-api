/*
  Warnings:

  - A unique constraint covering the columns `[key_name]` on the table `RoomCategory` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[key_name]` on the table `RoomSubCategory` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "RoomSubCategory" ADD COLUMN     "artistId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "RoomCategory_key_name_key" ON "RoomCategory"("key_name");

-- CreateIndex
CREATE UNIQUE INDEX "RoomSubCategory_key_name_key" ON "RoomSubCategory"("key_name");

-- AddForeignKey
ALTER TABLE "RoomSubCategory" ADD CONSTRAINT "RoomSubCategory_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE SET NULL ON UPDATE CASCADE;
