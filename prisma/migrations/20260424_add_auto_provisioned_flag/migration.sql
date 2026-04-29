-- Add auto-provisioning flags to ChummeSubCategory
-- These fields track subcategories automatically created by the LiveProvisioningService
-- when a ChummeArtist goes live on YouTube.

ALTER TABLE "ChummeSubCategory" ADD COLUMN IF NOT EXISTS "isAutoProvisioned" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ChummeSubCategory" ADD COLUMN IF NOT EXISTS "autoProvisionedAt" TIMESTAMP(3);
