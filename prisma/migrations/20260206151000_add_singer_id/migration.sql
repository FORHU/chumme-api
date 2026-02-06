-- AlterTable
ALTER TABLE "MusicPart" ADD COLUMN     "singerId" TEXT;

-- AddForeignKey
ALTER TABLE "MusicPart" ADD CONSTRAINT "MusicPart_singerId_fkey" FOREIGN KEY ("singerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
