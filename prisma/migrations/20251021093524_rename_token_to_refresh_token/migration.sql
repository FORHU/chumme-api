-- First, add the new column (nullable initially)
ALTER TABLE "Session" ADD COLUMN "refreshToken" TEXT;

-- Copy data from the old column to the new column
UPDATE "Session" SET "refreshToken" = "token";

-- Make the new column not null
ALTER TABLE "Session" ALTER COLUMN "refreshToken" SET NOT NULL;

-- Add the unique constraint to the new column
CREATE UNIQUE INDEX "Session_refreshToken_key" ON "Session"("refreshToken");

-- Drop the old column
ALTER TABLE "Session" DROP COLUMN "token";