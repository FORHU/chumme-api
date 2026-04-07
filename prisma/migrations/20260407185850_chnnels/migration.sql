-- AlterTable
ALTER TABLE "ChummeCategory" ALTER COLUMN "channelId" SET DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "ChummeSubCategory" ALTER COLUMN "channelId" SET DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "ChummeTopicCategory" ALTER COLUMN "channelId" SET DEFAULT ARRAY[]::TEXT[];
