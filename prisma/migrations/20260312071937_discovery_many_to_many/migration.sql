/*
  Warnings:

  - You are about to drop the column `socialUserDiscoveryId` on the `ChummeCategory` table. All the data in the column will be lost.
  - You are about to drop the column `socialUserDiscoveryId` on the `ChummeSubCategory` table. All the data in the column will be lost.
  - You are about to drop the column `socialUserDiscoveryId` on the `ChummeTopicCategory` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "ChummeCategory" DROP CONSTRAINT "ChummeCategory_socialUserDiscoveryId_fkey";

-- DropForeignKey
ALTER TABLE "ChummeSubCategory" DROP CONSTRAINT "ChummeSubCategory_socialUserDiscoveryId_fkey";

-- DropForeignKey
ALTER TABLE "ChummeTopicCategory" DROP CONSTRAINT "ChummeTopicCategory_socialUserDiscoveryId_fkey";

-- AlterTable
ALTER TABLE "ChummeCategory" DROP COLUMN "socialUserDiscoveryId";

-- AlterTable
ALTER TABLE "ChummeSubCategory" DROP COLUMN "socialUserDiscoveryId";

-- AlterTable
ALTER TABLE "ChummeTopicCategory" DROP COLUMN "socialUserDiscoveryId";

-- CreateTable
CREATE TABLE "_ChummeCategoryToSocialUserDiscovery" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ChummeCategoryToSocialUserDiscovery_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ChummeSubCategoryToSocialUserDiscovery" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ChummeSubCategoryToSocialUserDiscovery_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ChummeTopicCategoryToSocialUserDiscovery" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ChummeTopicCategoryToSocialUserDiscovery_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ChummeCategoryToSocialUserDiscovery_B_index" ON "_ChummeCategoryToSocialUserDiscovery"("B");

-- CreateIndex
CREATE INDEX "_ChummeSubCategoryToSocialUserDiscovery_B_index" ON "_ChummeSubCategoryToSocialUserDiscovery"("B");

-- CreateIndex
CREATE INDEX "_ChummeTopicCategoryToSocialUserDiscovery_B_index" ON "_ChummeTopicCategoryToSocialUserDiscovery"("B");

-- AddForeignKey
ALTER TABLE "_ChummeCategoryToSocialUserDiscovery" ADD CONSTRAINT "_ChummeCategoryToSocialUserDiscovery_A_fkey" FOREIGN KEY ("A") REFERENCES "ChummeCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ChummeCategoryToSocialUserDiscovery" ADD CONSTRAINT "_ChummeCategoryToSocialUserDiscovery_B_fkey" FOREIGN KEY ("B") REFERENCES "SocialUserDiscovery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ChummeSubCategoryToSocialUserDiscovery" ADD CONSTRAINT "_ChummeSubCategoryToSocialUserDiscovery_A_fkey" FOREIGN KEY ("A") REFERENCES "ChummeSubCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ChummeSubCategoryToSocialUserDiscovery" ADD CONSTRAINT "_ChummeSubCategoryToSocialUserDiscovery_B_fkey" FOREIGN KEY ("B") REFERENCES "SocialUserDiscovery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ChummeTopicCategoryToSocialUserDiscovery" ADD CONSTRAINT "_ChummeTopicCategoryToSocialUserDiscovery_A_fkey" FOREIGN KEY ("A") REFERENCES "ChummeTopicCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ChummeTopicCategoryToSocialUserDiscovery" ADD CONSTRAINT "_ChummeTopicCategoryToSocialUserDiscovery_B_fkey" FOREIGN KEY ("B") REFERENCES "SocialUserDiscovery"("id") ON DELETE CASCADE ON UPDATE CASCADE;
