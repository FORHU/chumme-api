-- Rename Enum
ALTER TYPE "RoomCategoryTraits" RENAME TO "ChummeCategoryTraits";

-- Rename Tables
ALTER TABLE "RoomCategory" RENAME TO "ChummeCategory";
ALTER TABLE "RoomSubCategory" RENAME TO "ChummeSubCategory";
ALTER TABLE "RoomVisualDesign" RENAME TO "ChummeVisualDesign";
ALTER TABLE "_ArtistToRoomCategory" RENAME TO "_ArtistToChummeCategory";

-- Rename Columns
ALTER TABLE "ChummeCategory" RENAME COLUMN "roomVisualDesignId" TO "chummeVisualDesignId";
ALTER TABLE "ChummeSubCategory" RENAME COLUMN "roomCategoryId" TO "chummeCategoryId";
ALTER TABLE "ChummeSubCategory" RENAME COLUMN "roomVisualDesignId" TO "chummeVisualDesignId";

ALTER TABLE "RoomMessage" RENAME COLUMN "roomSubCategoryId" TO "chummeSubCategoryId";
ALTER TABLE "RoomUserChat" RENAME COLUMN "roomSubCategoryId" TO "chummeSubCategoryId";

-- Rename Indexes
ALTER INDEX "RoomCategory_roomVisualDesignId_key" RENAME TO "ChummeCategory_chummeVisualDesignId_key";
ALTER INDEX "RoomSubCategory_roomVisualDesignId_key" RENAME TO "ChummeSubCategory_chummeVisualDesignId_key";
ALTER INDEX "RoomMessage_roomSubCategoryId_createdAt_idx" RENAME TO "RoomMessage_chummeSubCategoryId_createdAt_idx";
ALTER INDEX "RoomUserChat_roomSubCategoryId_idx" RENAME TO "RoomUserChat_chummeSubCategoryId_idx";
ALTER INDEX "RoomUserChat_userId_roomSubCategoryId_key" RENAME TO "RoomUserChat_userId_chummeSubCategoryId_key";
ALTER INDEX "_ArtistToRoomCategory_B_index" RENAME TO "_ArtistToChummeCategory_B_index";

-- Rename Foreign Keys
ALTER TABLE "ChummeCategory" RENAME CONSTRAINT "RoomCategory_roomVisualDesignId_fkey" TO "ChummeCategory_chummeVisualDesignId_fkey";
ALTER TABLE "ChummeSubCategory" RENAME CONSTRAINT "RoomSubCategory_ownerId_fkey" TO "ChummeSubCategory_ownerId_fkey";
ALTER TABLE "ChummeSubCategory" RENAME CONSTRAINT "RoomSubCategory_roomCategoryId_fkey" TO "ChummeSubCategory_chummeCategoryId_fkey";
ALTER TABLE "ChummeSubCategory" RENAME CONSTRAINT "RoomSubCategory_roomVisualDesignId_fkey" TO "ChummeSubCategory_chummeVisualDesignId_fkey";
ALTER TABLE "RoomMessage" RENAME CONSTRAINT "RoomMessage_roomSubCategoryId_fkey" TO "RoomMessage_chummeSubCategoryId_fkey";
ALTER TABLE "RoomUserChat" RENAME CONSTRAINT "RoomUserChat_roomSubCategoryId_fkey" TO "RoomUserChat_chummeSubCategoryId_fkey";
ALTER TABLE "_ArtistToChummeCategory" RENAME CONSTRAINT "_ArtistToRoomCategory_A_fkey" TO "_ArtistToChummeCategory_A_fkey";
ALTER TABLE "_ArtistToChummeCategory" RENAME CONSTRAINT "_ArtistToRoomCategory_B_fkey" TO "_ArtistToChummeCategory_B_fkey";

-- Primary Keys
ALTER TABLE "ChummeCategory" RENAME CONSTRAINT "RoomCategory_pkey" TO "ChummeCategory_pkey";
ALTER TABLE "ChummeSubCategory" RENAME CONSTRAINT "RoomSubCategory_pkey" TO "ChummeSubCategory_pkey";
ALTER TABLE "ChummeVisualDesign" RENAME CONSTRAINT "RoomVisualDesign_pkey" TO "ChummeVisualDesign_pkey";
ALTER TABLE "_ArtistToChummeCategory" RENAME CONSTRAINT "_ArtistToRoomCategory_AB_pkey" TO "_ArtistToChummeCategory_AB_pkey";
