-- AlterTable
ALTER TABLE "ChummeArtist" ADD COLUMN     "countries" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "liveStartedAt" TIMESTAMP(3),
ADD COLUMN     "liveThumbnailUrl" TEXT,
ADD COLUMN     "liveViewCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ChummeCategory" ADD COLUMN     "targetCountries" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "ChummeSubCategory" ADD COLUMN     "targetCountries" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "ChummeTopicCategory" ADD COLUMN     "targetCountries" TEXT[] DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "channelId" DROP DEFAULT;

-- CreateTable
CREATE TABLE "_ChummeArtistToChummeSubCategory" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ChummeArtistToChummeSubCategory_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ChummeArtistToChummeTopicCategory" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ChummeArtistToChummeTopicCategory_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ChummeArtistToChummeSubCategory_B_index" ON "_ChummeArtistToChummeSubCategory"("B");

-- CreateIndex
CREATE INDEX "_ChummeArtistToChummeTopicCategory_B_index" ON "_ChummeArtistToChummeTopicCategory"("B");

-- AddForeignKey
ALTER TABLE "_ChummeArtistToChummeSubCategory" ADD CONSTRAINT "_ChummeArtistToChummeSubCategory_A_fkey" FOREIGN KEY ("A") REFERENCES "ChummeArtist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ChummeArtistToChummeSubCategory" ADD CONSTRAINT "_ChummeArtistToChummeSubCategory_B_fkey" FOREIGN KEY ("B") REFERENCES "ChummeSubCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ChummeArtistToChummeTopicCategory" ADD CONSTRAINT "_ChummeArtistToChummeTopicCategory_A_fkey" FOREIGN KEY ("A") REFERENCES "ChummeArtist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ChummeArtistToChummeTopicCategory" ADD CONSTRAINT "_ChummeArtistToChummeTopicCategory_B_fkey" FOREIGN KEY ("B") REFERENCES "ChummeTopicCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
