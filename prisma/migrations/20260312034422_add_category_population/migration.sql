-- AlterTable
ALTER TABLE "ChummeCategory" ADD COLUMN     "population" JSONB NOT NULL DEFAULT '{"Entertainment": 0, "Communities": 0}';

-- AlterTable
ALTER TABLE "ChummeSubCategory" ADD COLUMN     "population" JSONB NOT NULL DEFAULT '{"Entertainment": 0, "Communities": 0}';
