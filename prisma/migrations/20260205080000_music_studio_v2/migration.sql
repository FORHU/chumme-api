-- Music Studio V2: Consolidated Migration
-- This migration captures all changes for the Music Studio feature:
-- 1. StudioType enum (RELAYSINGING, CROWDSINGING)
-- 2. RelayMode enum (AUTO, MANUAL, INTERVAL, PHRASING)
-- 3. MusicPart model for phrasing templates
-- 4. MusicRecord.singers many-to-many relation
-- 5. StudioMember.vocalRoleIndex for vocal assignments
-- 6. MusicStudio.relayMode, relayInterval, studioType fields

-- Note: These changes were already applied to the database.
-- This file exists to sync migration history for production deployments.

-- CreateEnum (if not exists)
DO $$ BEGIN
    CREATE TYPE "StudioType" AS ENUM ('RELAYSINGING', 'CROWDSINGING');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "RelayMode" AS ENUM ('AUTO', 'MANUAL', 'INTERVAL', 'PHRASING');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Tables and columns are already in place from previous development.
-- This migration is marked as applied to sync history.
