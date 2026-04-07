/*
  Warnings:

  - You are about to drop the `_ChummeArtistToChummeTopicCategory` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_ChummeArtistToChummeTopicCategory" DROP CONSTRAINT "_ChummeArtistToChummeTopicCategory_A_fkey";

-- DropForeignKey
ALTER TABLE "_ChummeArtistToChummeTopicCategory" DROP CONSTRAINT "_ChummeArtistToChummeTopicCategory_B_fkey";

-- DropTable
DROP TABLE "_ChummeArtistToChummeTopicCategory";
