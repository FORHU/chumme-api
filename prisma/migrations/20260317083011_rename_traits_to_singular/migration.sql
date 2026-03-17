/*
  Warnings:

  - You are about to drop the column `chummeTraits` on the `ChummeCategory` table. All the data in the column will be lost.
  - You are about to drop the column `chummeTraits` on the `ChummeSubCategory` table. All the data in the column will be lost.
  - You are about to drop the column `chummeTraits` on the `ChummeTopicCategory` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ChummeCategory" DROP COLUMN "chummeTraits",
ADD COLUMN     "chummeTrait" "ChummeTraits" NOT NULL DEFAULT 'NONE';

-- AlterTable
ALTER TABLE "ChummeSubCategory" DROP COLUMN "chummeTraits",
ADD COLUMN     "chummeTrait" "ChummeTraits" NOT NULL DEFAULT 'NONE';

-- AlterTable
ALTER TABLE "ChummeTopicCategory" DROP COLUMN "chummeTraits",
ADD COLUMN     "chummeTrait" "ChummeTraits" NOT NULL DEFAULT 'NONE';
