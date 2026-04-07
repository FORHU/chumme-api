-- CreateTable
CREATE TABLE "_ChummeArtistToChummeTopicCategory" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ChummeArtistToChummeTopicCategory_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ChummeArtistToChummeTopicCategory_B_index" ON "_ChummeArtistToChummeTopicCategory"("B");

-- AddForeignKey
ALTER TABLE "_ChummeArtistToChummeTopicCategory" ADD CONSTRAINT "_ChummeArtistToChummeTopicCategory_A_fkey" FOREIGN KEY ("A") REFERENCES "ChummeArtist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ChummeArtistToChummeTopicCategory" ADD CONSTRAINT "_ChummeArtistToChummeTopicCategory_B_fkey" FOREIGN KEY ("B") REFERENCES "ChummeTopicCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
