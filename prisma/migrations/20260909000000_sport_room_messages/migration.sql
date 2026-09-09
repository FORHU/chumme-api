-- Sports chat gets its own table.
--
-- Sports has no sub-category, no threads and no rich content — it is voice and
-- text between rival fans in a room keyed by fixture. Modelling that as extra
-- columns on RoomMessage (as 20260907000000 started to) cost three nullable
-- room keys, CHECK constraints to keep them exclusive, and dropping NOT NULL on
-- a column every existing Circle query depends on. A separate table lets every
-- column be required and leaves Circle chat completely untouched.
--
-- The second half of this file therefore REVERTS 20260907000000. Every
-- statement there is guarded, so this migration is correct whether or not that
-- one was ever applied to a given database.

-- ── The new table ──────────────────────────────────────────────────────────

CREATE TABLE "SportRoomMessage" (
    "id" TEXT NOT NULL,
    "sportEventId" TEXT NOT NULL,
    "sportTeamId" TEXT,
    "authorId" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "content" TEXT,
    "voiceMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SportRoomMessage_pkey" PRIMARY KEY ("id")
);

-- The only read this table serves: one fixture, oldest first. The two columns
-- are split in memory afterwards, so no per-team index is needed.
CREATE INDEX "SportRoomMessage_sportEventId_createdAt_idx" ON "SportRoomMessage"("sportEventId", "createdAt");

ALTER TABLE "SportRoomMessage" ADD CONSTRAINT "SportRoomMessage_sportEventId_fkey" FOREIGN KEY ("sportEventId") REFERENCES "SportEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SportRoomMessage" ADD CONSTRAINT "SportRoomMessage_sportTeamId_fkey" FOREIGN KEY ("sportTeamId") REFERENCES "SportTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SportRoomMessage" ADD CONSTRAINT "SportRoomMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SportRoomMessage" ADD CONSTRAINT "SportRoomMessage_voiceMessageId_fkey" FOREIGN KEY ("voiceMessageId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- A side only means something for a real message; a system announcement
-- ("Kick off", "GOAL — 1-0") belongs to neither column and renders centred.
ALTER TABLE "SportRoomMessage" ADD CONSTRAINT "SportRoomMessage_side_required"
  CHECK ("sportTeamId" IS NOT NULL OR "isSystem" = true);

-- ── Revert 20260907000000 ──────────────────────────────────────────────────
-- Nothing ever wrote to these columns: no service could address a non-Circle
-- room, so every RoomMessage row still has chummeSubCategoryId set. Dropping
-- them loses no data.

ALTER TABLE "RoomMessage" DROP CONSTRAINT IF EXISTS "RoomMessage_exactly_one_room";

ALTER TABLE "RoomMessage" DROP CONSTRAINT IF EXISTS "RoomMessage_chummeTopicCategoryId_fkey";
ALTER TABLE "RoomMessage" DROP CONSTRAINT IF EXISTS "RoomMessage_sportEventId_fkey";

DROP INDEX IF EXISTS "RoomMessage_chummeTopicCategoryId_createdAt_idx";
DROP INDEX IF EXISTS "RoomMessage_sportEventId_createdAt_idx";

ALTER TABLE "RoomMessage" DROP COLUMN IF EXISTS "chummeTopicCategoryId";
ALTER TABLE "RoomMessage" DROP COLUMN IF EXISTS "sportEventId";

-- Restore the column to NOT NULL. Fails loudly if any row somehow holds a NULL,
-- which is the correct outcome — silently deleting orphaned messages would be
-- worse than stopping and being told.
ALTER TABLE "RoomMessage" ALTER COLUMN "chummeSubCategoryId" SET NOT NULL;

-- Restore ON DELETE RESTRICT. 20260907000000 relaxed this to SET NULL as a side
-- effect of making the column optional, which quietly turned "you cannot delete
-- a Circle that still has messages" into "deleting a Circle orphans them".
ALTER TABLE "RoomMessage" DROP CONSTRAINT IF EXISTS "RoomMessage_chummeSubCategoryId_fkey";
ALTER TABLE "RoomMessage" ADD CONSTRAINT "RoomMessage_chummeSubCategoryId_fkey" FOREIGN KEY ("chummeSubCategoryId") REFERENCES "ChummeSubCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
