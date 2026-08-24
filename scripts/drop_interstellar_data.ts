/**
 * Deletes the interstellar (off-Earth) communities and everything hanging off
 * them, ahead of migration 20260821000000_drop_interstellar.
 *
 * MUST RUN BEFORE THAT MIGRATION. It identifies rows by "celestialType", so
 * once the migration drops that column there is no way left to tell which
 * categories were off-world.
 *
 * Raw SQL throughout: the Prisma client was regenerated without the celestial
 * fields, so `prisma.chummeCategory` no longer knows they exist.
 *
 * Dry run by default — prints what it would delete and changes nothing:
 *   npx ts-node scripts/drop_interstellar_data.ts
 * Apply for real:
 *   npx ts-node scripts/drop_interstellar_data.ts --apply
 *
 * ⚠️ This destroys user-created communities along with their subcategories,
 * chat rooms and messages. `chumme-main` is shared with four other projects —
 * check DATABASE_URL points where you think it does before using --apply.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

async function main() {
  const target = (process.env.DATABASE_URL ?? '').replace(/:[^:@/]+@/, ':****@');
  console.log(`\nDatabase: ${target || '(DATABASE_URL unset)'}`);
  console.log(APPLY ? 'Mode: APPLY — rows will be deleted\n' : 'Mode: DRY RUN — nothing will change\n');

  const columnExists = await prisma.$queryRawUnsafe<{ count: bigint }[]>(`
    SELECT COUNT(*)::bigint AS count
    FROM information_schema.columns
    WHERE table_name = 'ChummeCategory' AND column_name = 'celestialType'
  `);
  if (Number(columnExists[0]?.count ?? 0) === 0) {
    console.log('"celestialType" does not exist on this database — nothing to do.');
    console.log('(Either the migration already ran, or this DB never received the db push.)');
    return;
  }

  const categories = await prisma.$queryRawUnsafe<{ id: string; name: string; celestialType: string }[]>(`
    SELECT id, name, "celestialType"::text AS "celestialType"
    FROM "ChummeCategory"
    WHERE "celestialType" IS NOT NULL AND "celestialType" <> 'EARTH'
  `);

  if (categories.length === 0) {
    console.log('No interstellar categories found — nothing to delete.');
    return;
  }

  const categoryIds = categories.map((c) => c.id);
  const subs = await prisma.$queryRawUnsafe<{ id: string; name: string }[]>(
    `SELECT id, name FROM "ChummeSubCategory" WHERE "chummeCategoryId" = ANY($1::text[])`,
    categoryIds,
  );
  const subIds = subs.map((s) => s.id);

  const count = async (table: string, column: string, ids: string[]) => {
    if (ids.length === 0) return 0;
    const r = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
      `SELECT COUNT(*)::bigint AS count FROM "${table}" WHERE "${column}" = ANY($1::text[])`,
      ids,
    );
    return Number(r[0]?.count ?? 0);
  };

  console.log(`Interstellar categories (${categories.length}):`);
  categories.forEach((c) => console.log(`  - ${c.name}  [${c.celestialType}]  ${c.id}`));
  console.log(`\nCascade:`);
  console.log(`  ChummeSubCategory     ${subs.length}`);
  console.log(`  RoomMessage           ${await count('RoomMessage', 'chummeSubCategoryId', subIds)}`);
  console.log(`  RoomUserChat          ${await count('RoomUserChat', 'chummeSubCategoryId', subIds)}`);
  console.log(`  ChummeTopicCategory   ${await count('ChummeTopicCategory', 'chummeSubCategoryId', subIds)}`);
  console.log(`\nNulled (not deleted): SocialFeedItem, SocialIngestionTarget, SportLeague references`);

  if (!APPLY) {
    console.log('\nDry run complete. Re-run with --apply to delete.');
    return;
  }

  await prisma.$transaction(async (tx) => {
    const exec = (sql: string, ids: string[]) =>
      ids.length ? tx.$executeRawUnsafe(sql, ids) : Promise.resolve(0);

    // Optional references first — null them so no FK can block the deletes.
    await exec(`UPDATE "SocialFeedItem" SET "chummeSubCategoryId" = NULL WHERE "chummeSubCategoryId" = ANY($1::text[])`, subIds);
    await exec(`UPDATE "SocialIngestionTarget" SET "chummeSubCategoryId" = NULL WHERE "chummeSubCategoryId" = ANY($1::text[])`, subIds);
    await exec(`UPDATE "SportLeague" SET "chummeSubCategoryId" = NULL WHERE "chummeSubCategoryId" = ANY($1::text[])`, subIds);
    await exec(`UPDATE "SocialFeedItem" SET "chummeCategoryId" = NULL WHERE "chummeCategoryId" = ANY($1::text[])`, categoryIds);
    await exec(`UPDATE "SocialIngestionTarget" SET "chummeCategoryId" = NULL WHERE "chummeCategoryId" = ANY($1::text[])`, categoryIds);

    // Required references, deepest first.
    await exec(`DELETE FROM "RoomMessage" WHERE "chummeSubCategoryId" = ANY($1::text[])`, subIds);
    await exec(`DELETE FROM "RoomUserChat" WHERE "chummeSubCategoryId" = ANY($1::text[])`, subIds);
    await exec(`DELETE FROM "ChummeTopicCategory" WHERE "chummeSubCategoryId" = ANY($1::text[])`, subIds);
    await exec(`DELETE FROM "ChummeSubCategory" WHERE id = ANY($1::text[])`, subIds);
    await exec(`DELETE FROM "ChummeCategory" WHERE id = ANY($1::text[])`, categoryIds);
  });

  console.log(`\nDeleted ${categories.length} categories and ${subs.length} subcategories.`);
  console.log('Now apply migration 20260821000000_drop_interstellar.');
}

main()
  .catch((e) => {
    console.error('\nFAILED — transaction rolled back, nothing was deleted.');
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
