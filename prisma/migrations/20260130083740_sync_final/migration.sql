-- AlterTable (vector extension - optional for local dev)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
    EXECUTE 'ALTER TABLE "Embedding" ADD COLUMN "vector_search" vector';
  ELSE
    RAISE NOTICE 'pgvector extension not available, skipping vector_search column';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not add vector_search column: %', SQLERRM;
END $$;

-- CreateIndex (vector index - optional for local dev)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Embedding' AND column_name = 'vector_search') THEN
    EXECUTE 'CREATE INDEX "embedding_vector_search_idx" ON "Embedding"("vector_search")';
  ELSE
    RAISE NOTICE 'vector_search column does not exist, skipping index creation';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not create vector_search index: %', SQLERRM;
END $$;
