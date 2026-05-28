-- AlterTable
ALTER TABLE "ChummeArtist" ADD COLUMN     "ownerId" TEXT;

-- AlterTable
ALTER TABLE "ChummeCategoryDesign" ADD COLUMN     "aiChatEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "discoveryEnabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Music" ADD COLUMN     "ownerId" TEXT;

-- AddForeignKey
ALTER TABLE "ChummeArtist" ADD CONSTRAINT "ChummeArtist_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Music" ADD CONSTRAINT "Music_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
