/*
  Warnings:

  - The values [SPORTS] on the enum `ChummeTraits` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ChummeTraits_new" AS ENUM ('NONE', 'COMMUNITIES', 'ENTERTAINMENT');
ALTER TABLE "public"."ChummeCategory" ALTER COLUMN "chummeTraits" DROP DEFAULT;
ALTER TABLE "public"."ChummeSubCategory" ALTER COLUMN "chummeTraits" DROP DEFAULT;
ALTER TABLE "public"."ChummeTopicCategory" ALTER COLUMN "chummeTraits" DROP DEFAULT;
ALTER TABLE "ChummeCategory" ALTER COLUMN "chummeTraits" TYPE "ChummeTraits_new" USING ("chummeTraits"::text::"ChummeTraits_new");
ALTER TABLE "ChummeSubCategory" ALTER COLUMN "chummeTraits" TYPE "ChummeTraits_new" USING ("chummeTraits"::text::"ChummeTraits_new");
ALTER TABLE "ChummeTopicCategory" ALTER COLUMN "chummeTraits" TYPE "ChummeTraits_new" USING ("chummeTraits"::text::"ChummeTraits_new");
ALTER TYPE "ChummeTraits" RENAME TO "ChummeTraits_old";
ALTER TYPE "ChummeTraits_new" RENAME TO "ChummeTraits";
DROP TYPE "public"."ChummeTraits_old";
ALTER TABLE "ChummeCategory" ALTER COLUMN "chummeTraits" SET DEFAULT 'NONE';
ALTER TABLE "ChummeSubCategory" ALTER COLUMN "chummeTraits" SET DEFAULT 'NONE';
ALTER TABLE "ChummeTopicCategory" ALTER COLUMN "chummeTraits" SET DEFAULT 'NONE';
COMMIT;
