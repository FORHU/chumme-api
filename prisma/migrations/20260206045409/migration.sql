/*
  Warnings:

  - You are about to drop the column `vector_search` on the `Embedding` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "embedding_vector_search_idx";

-- AlterTable
ALTER TABLE "Embedding" DROP COLUMN "vector_search";
