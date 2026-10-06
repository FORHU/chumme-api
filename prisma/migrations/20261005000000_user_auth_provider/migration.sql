-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('EMAIL', 'GOOGLE', 'FACEBOOK');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "authProvider" "AuthProvider" NOT NULL DEFAULT 'EMAIL';

-- Backfill. Until now the only record that an account came from Google or
-- Facebook was a sentinel string in the password column. Move it into
-- authProvider and clear the sentinel, so a social-only account has no password
-- (NULL) — which is what the login guard now checks. This runs in the same
-- migration as the column, before any build that stops writing the sentinel
-- can serve traffic (scripts/start.sh migrates before `npm start`).
--
-- Accounts whose sentinel was already overwritten by "Forgot password" cannot
-- be told apart from email sign-ups here; they keep EMAIL and the password
-- their owner set, and still sign in with either method.
UPDATE "User"
SET "authProvider" = 'GOOGLE', "password" = NULL
WHERE "password" = 'GOOGLE_SSO_USER';

UPDATE "User"
SET "authProvider" = 'FACEBOOK', "password" = NULL
WHERE "password" = 'FACEBOOK_SSO_USER';
