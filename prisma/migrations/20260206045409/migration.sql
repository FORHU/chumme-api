/*
  Warnings:

  - You are about to drop the column `vector_search` on the `Embedding` table. All the data in the column will be lost.

*/
-- DropIndex (idempotent for shadow DB compatibility)
DROP INDEX IF EXISTS "embedding_vector_search_idx";

-- AlterTable (idempotent for shadow DB compatibility)
ALTER TABLE "Embedding" DROP COLUMN IF EXISTS "vector_search";
