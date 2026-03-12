-- AlterTable
ALTER TABLE "ChummeCategory" ADD COLUMN     "populationCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ChummeSubCategory" ADD COLUMN     "populationCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ChummeTopicCategory" ADD COLUMN     "populationCount" INTEGER NOT NULL DEFAULT 0;
