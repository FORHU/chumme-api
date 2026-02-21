/*
  Warnings:

  - You are about to drop the column `key_name` on the `Room` table. All the data in the column will be lost.
  - You are about to drop the column `key_name` on the `RoomCategory` table. All the data in the column will be lost.
  - You are about to drop the column `key_name` on the `RoomSubCategory` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "RoomCategory_key_name_key";

-- DropIndex
DROP INDEX "RoomSubCategory_key_name_key";

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "voiceMessageId" TEXT;

-- AlterTable
ALTER TABLE "Room" DROP COLUMN "key_name";

-- AlterTable
ALTER TABLE "RoomCategory" DROP COLUMN "key_name";

-- AlterTable
ALTER TABLE "RoomSubCategory" DROP COLUMN "key_name";

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_voiceMessageId_fkey" FOREIGN KEY ("voiceMessageId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;
