/*
  Warnings:

  - You are about to drop the column `isPrivate` on the `ChummeCategory` table. All the data in the column will be lost.
  - You are about to drop the column `isPrivate` on the `ChummeSubCategory` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ChummeCategory" DROP COLUMN "isPrivate",
ADD COLUMN     "keyPassword" TEXT;

-- AlterTable
ALTER TABLE "ChummeSubCategory" DROP COLUMN "isPrivate",
ADD COLUMN     "keyPassword" TEXT;
