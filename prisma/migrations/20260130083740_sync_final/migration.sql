-- AlterTable (vector extension - optional for local dev)
DO $$
BEGIN
  ALTER TABLE "Embedding" ADD COLUMN "vector_search" vector;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not add vector_search column, pgvector not available';
END $$;

-- CreateIndex (vector index - optional for local dev)
DO $$
BEGIN
  CREATE INDEX "embedding_vector_search_idx" ON "Embedding"("vector_search");
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not create vector_search index, column may not exist';
END $$;
