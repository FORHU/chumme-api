-- GIFs and stickers in Circle chat (picked from KLIPY in the app; validated in
-- room-message-attachment.util.ts). Additive only: one nullable column, so
-- older builds and existing rows are untouched — they keep showing the
-- message's text ("GIF" / "Sticker"). IF NOT EXISTS keeps a re-run harmless.

-- AlterTable
ALTER TABLE "RoomMessage" ADD COLUMN IF NOT EXISTS "attachment" JSONB;
