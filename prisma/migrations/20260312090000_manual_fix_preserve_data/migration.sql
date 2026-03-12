-- Drop problematic FKs
ALTER TABLE "ChummeCategory" DROP CONSTRAINT IF EXISTS "ChummeCategory_chummeVisualDesignId_fkey";
ALTER TABLE "ChummeSubCategory" DROP CONSTRAINT IF EXISTS "ChummeSubCategory_chummeVisualDesignId_fkey";
ALTER TABLE "ChummeTopicCategory" DROP CONSTRAINT IF EXISTS "ChummeTopicCategory_chummeVisualDesignId_fkey";

-- Drop columns
ALTER TABLE "ChummeCategory" DROP COLUMN IF EXISTS "population";
ALTER TABLE "ChummeSubCategory" DROP COLUMN IF EXISTS "population";

-- Rename table
-- We use a check to avoid errors if RENAME already happened manually
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ChummeVisualDesign') THEN
    ALTER TABLE "ChummeVisualDesign" RENAME TO "ChummeCategoryDesign";
    ALTER TABLE "ChummeCategoryDesign" RENAME CONSTRAINT "ChummeVisualDesign_pkey" TO "ChummeCategoryDesign_pkey";
  END IF;
END $$;

-- Re-add FKs with new table name
ALTER TABLE "ChummeCategory" ADD CONSTRAINT "ChummeCategory_chummeVisualDesignId_fkey" FOREIGN KEY ("chummeVisualDesignId") REFERENCES "ChummeCategoryDesign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ChummeSubCategory" ADD CONSTRAINT "ChummeSubCategory_chummeVisualDesignId_fkey" FOREIGN KEY ("chummeVisualDesignId") REFERENCES "ChummeCategoryDesign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ChummeTopicCategory" ADD CONSTRAINT "ChummeTopicCategory_chummeVisualDesignId_fkey" FOREIGN KEY ("chummeVisualDesignId") REFERENCES "ChummeCategoryDesign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
