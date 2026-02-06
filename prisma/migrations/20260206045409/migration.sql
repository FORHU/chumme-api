/*
  Warnings:

  - You are about to drop the column `vector_search` on the `Embedding` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX IF EXISTS "embedding_vector_search_idx";

-- AlterTable
DO $$
BEGIN
  ALTER TABLE "Embedding" DROP COLUMN IF EXISTS "vector_search";
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not drop vector_search column, it might not exist';
END $$;
