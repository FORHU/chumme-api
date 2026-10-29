-- Circle visibility: PUBLIC / PRIVATE (code-gated) / PERSONAL (owner-granted).
-- Additive only. Existing categories default to PUBLIC, so older builds and
-- seeded Circles behave exactly as before. IF NOT EXISTS keeps a re-run harmless.

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "CircleVisibility" AS ENUM ('PUBLIC', 'PRIVATE', 'PERSONAL');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "ChummeCategory" ADD COLUMN IF NOT EXISTS "visibility" "CircleVisibility" NOT NULL DEFAULT 'PUBLIC';
ALTER TABLE "ChummeCategory" ADD COLUMN IF NOT EXISTS "ownerId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ChummeCategory_ownerId_idx" ON "ChummeCategory"("ownerId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "ChummeCategory" ADD CONSTRAINT "ChummeCategory_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "ChummeCategoryAccess" (
    "id" TEXT NOT NULL,
    "chummeCategoryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "grantedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChummeCategoryAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ChummeCategoryAccess_chummeCategoryId_userId_key" ON "ChummeCategoryAccess"("chummeCategoryId", "userId");
CREATE INDEX IF NOT EXISTS "ChummeCategoryAccess_userId_idx" ON "ChummeCategoryAccess"("userId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "ChummeCategoryAccess" ADD CONSTRAINT "ChummeCategoryAccess_chummeCategoryId_fkey" FOREIGN KEY ("chummeCategoryId") REFERENCES "ChummeCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "ChummeCategoryAccess" ADD CONSTRAINT "ChummeCategoryAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "ChummeCategoryAccess" ADD CONSTRAINT "ChummeCategoryAccess_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
