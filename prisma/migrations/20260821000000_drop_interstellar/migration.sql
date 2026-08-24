-- Drop the interstellar (celestial) columns from ChummeCategory and the enum
-- that backed them. Reverses the `prisma db push` that added them on 2026-08-20;
-- there was never a migration for the add, so this is the first record of them.
--
-- ORDER MATTERS. Run `npm run data:drop-interstellar` against the target
-- database BEFORE this migration is applied. Once "celestialType" is gone there
-- is no way left to tell which categories were off-world, so the row cleanup
-- becomes impossible after the fact.
--
-- IF EXISTS throughout: scripts/start.sh runs `prisma migrate deploy` on every
-- container start, so this executes in environments that never received the
-- db push (production among them) and must be a no-op there rather than an error.

-- AlterTable
ALTER TABLE "ChummeCategory" DROP COLUMN IF EXISTS "celestialType";
ALTER TABLE "ChummeCategory" DROP COLUMN IF EXISTS "celestialId";
ALTER TABLE "ChummeCategory" DROP COLUMN IF EXISTS "celestialCoordinates";

-- DropEnum
DROP TYPE IF EXISTS "CelestialType";
