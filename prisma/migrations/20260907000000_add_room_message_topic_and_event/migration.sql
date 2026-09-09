-- Team rooms for sports.
--
-- A RoomMessage now belongs to exactly one room: a Circle (chummeSubCategoryId)
-- or a team room (chummeTopicCategoryId). Team messages leave the sub-category
-- NULL, so every existing `WHERE "chummeSubCategoryId" = $1` query keeps working
-- unchanged and excludes team chat automatically.
--
-- Additive apart from the NOT NULL drop; no existing row changes value.
--
-- NOTE: making the column optional changes its FK from RESTRICT to SET NULL.
-- Deleting a ChummeSubCategory used to be blocked while it had messages; it now
-- succeeds and orphans them (room id becomes NULL, message becomes unreachable).
-- If that matters, add an explicit guard in the delete path.

-- DropForeignKey
ALTER TABLE "RoomMessage" DROP CONSTRAINT "RoomMessage_chummeSubCategoryId_fkey";

-- AlterTable
ALTER TABLE "RoomMessage" ADD COLUMN     "chummeTopicCategoryId" TEXT,
ADD COLUMN     "sportEventId" TEXT,
ALTER COLUMN "chummeSubCategoryId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "RoomMessage_chummeTopicCategoryId_createdAt_idx" ON "RoomMessage"("chummeTopicCategoryId", "createdAt");

-- CreateIndex
CREATE INDEX "RoomMessage_sportEventId_createdAt_idx" ON "RoomMessage"("sportEventId", "createdAt");

-- AddForeignKey
ALTER TABLE "RoomMessage" ADD CONSTRAINT "RoomMessage_chummeSubCategoryId_fkey" FOREIGN KEY ("chummeSubCategoryId") REFERENCES "ChummeSubCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomMessage" ADD CONSTRAINT "RoomMessage_chummeTopicCategoryId_fkey" FOREIGN KEY ("chummeTopicCategoryId") REFERENCES "ChummeTopicCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomMessage" ADD CONSTRAINT "RoomMessage_sportEventId_fkey" FOREIGN KEY ("sportEventId") REFERENCES "SportEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Exactly one room. Both columns being nullable makes "belongs to no room at
-- all" representable, and such a message is invisible everywhere while still
-- counting toward totals. XOR closes that off at the database rather than
-- trusting every future write path to remember.
--
-- Prisma does not model CHECK constraints, so this lives only here — it will
-- not appear in schema.prisma and `migrate diff` will not regenerate it.
--
-- Safe on existing rows: every current message has chummeSubCategoryId set and
-- chummeTopicCategoryId NULL, which satisfies the constraint.
ALTER TABLE "RoomMessage" ADD CONSTRAINT "RoomMessage_exactly_one_room"
  CHECK (("chummeSubCategoryId" IS NOT NULL) <> ("chummeTopicCategoryId" IS NOT NULL));
