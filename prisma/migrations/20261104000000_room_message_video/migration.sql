-- Video messages in Circle chat (Community Admins only, max 30s — enforced in
-- RoomMediaPolicySvc, not here). Additive only: one nullable column, so older
-- builds and existing rows are untouched. IF NOT EXISTS keeps a re-run harmless.

-- AlterTable
ALTER TABLE "RoomMessage" ADD COLUMN IF NOT EXISTS "videoMessageId" TEXT;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "RoomMessage" ADD CONSTRAINT "RoomMessage_videoMessageId_fkey" FOREIGN KEY ("videoMessageId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
