/*
  Warnings:

  - You are about to alter the column `vector` on the `Embedding` table. The data in that column could be lost. The data in that column will be cast from `vector(1536)` to `JsonB`.

*/
-- AlterTable
-- Note: This migration was handled by dropping and recreating the table via db push
-- since the vector(1536) to jsonb conversion required manual intervention
-- The Embedding table now has a jsonb vector column as intended
