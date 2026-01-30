/*
  Warnings:

  - You are about to drop the column `file_url` on the `Music` table. All the data in the column will be lost.
  - You are about to drop the column `meta_data` on the `Music` table. All the data in the column will be lost.
  - Added the required column `musicFileId` to the `Music` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable (vector extension - optional for local dev)
DO $$
BEGIN
  ALTER TABLE "Embedding" ADD COLUMN "vector_search" vector;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not add vector_search column, pgvector not available';
END $$;

-- AlterTable
ALTER TABLE "Music" DROP COLUMN "file_url",
DROP COLUMN "meta_data",
ADD COLUMN     "isKaraoke" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "musicFileId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "MusicRecord" (
    "id" TEXT NOT NULL,
    "musicId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "MusicRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_MusicRecordUsers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_MusicRecordUsers_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_MusicRecordUsers_B_index" ON "_MusicRecordUsers"("B");

-- CreateIndex (vector index - optional for local dev)
DO $$
BEGIN
  CREATE INDEX "embedding_vector_search_idx" ON "Embedding"("vector_search");
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not create vector_search index, column may not exist';
END $$;

-- AddForeignKey
ALTER TABLE "Music" ADD CONSTRAINT "Music_musicFileId_fkey" FOREIGN KEY ("musicFileId") REFERENCES "File"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MusicRecord" ADD CONSTRAINT "MusicRecord_musicId_fkey" FOREIGN KEY ("musicId") REFERENCES "Music"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MusicRecord" ADD CONSTRAINT "MusicRecord_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MusicRecordUsers" ADD CONSTRAINT "_MusicRecordUsers_A_fkey" FOREIGN KEY ("A") REFERENCES "MusicRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MusicRecordUsers" ADD CONSTRAINT "_MusicRecordUsers_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
