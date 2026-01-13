-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "key_name" TEXT,
ADD COLUMN     "roomSubCategoryId" TEXT;

-- CreateTable
CREATE TABLE "RoomCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key_name" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "RoomCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomSubCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key_name" TEXT NOT NULL,
    "note" TEXT,
    "roomCategoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "RoomSubCategory_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "RoomSubCategory" ADD CONSTRAINT "RoomSubCategory_roomCategoryId_fkey" FOREIGN KEY ("roomCategoryId") REFERENCES "RoomCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_roomSubCategoryId_fkey" FOREIGN KEY ("roomSubCategoryId") REFERENCES "RoomSubCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
