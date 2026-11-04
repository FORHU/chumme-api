/**
 * Takes already-seeded Instagram content out of the app.
 *
 *   - SocialFeedItem rows from Instagram → isDeleted = true (soft: views,
 *     bookmarks and comments still point at them, so the rows stay)
 *   - Instagram SocialIngestionTarget rows and their schedules → isActive = false
 *
 * Room chat link messages are NOT handled here — the link seeder owns those:
 *   npm run db:seed:links -- --purge && npm run db:seed:links
 * (the seeder now skips Instagram, so the reseed fills rooms with TikTok and
 * Facebook only). This script reports any Instagram links still left in room
 * chat afterwards, e.g. ones real users posted, without touching them.
 *
 * Dry run by default — prints what it would change and changes nothing:
 *   npx ts-node scripts/remove_instagram_content.ts
 * Apply for real:
 *   npx ts-node scripts/remove_instagram_content.ts --apply
 *
 * ⚠️ `chumme-main` is shared with four other projects — check DATABASE_URL
 * points where you think it does before using --apply.
 */
import "dotenv/config";
import { PrismaClient, SocialPlatform } from "@prisma/client";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

async function main() {
  const target = (process.env.DATABASE_URL ?? "").replace(/:[^:@/]+@/, ":****@");
  console.log(`\nDatabase: ${target || "(DATABASE_URL unset)"}`);
  console.log(APPLY ? "Mode: APPLY — rows will be changed\n" : "Mode: DRY RUN — nothing will change\n");

  const feedWhere = {
    isDeleted: false,
    OR: [
      { socialPlatform: SocialPlatform.INSTAGRAM },
      { externalUrl: { contains: "instagram.com", mode: "insensitive" as const } },
    ],
  };
  const targetWhere = { platform: SocialPlatform.INSTAGRAM, isActive: true };

  const feedCount = await prisma.socialFeedItem.count({ where: feedWhere });
  const targets = await prisma.socialIngestionTarget.findMany({
    where: targetWhere,
    select: { id: true, externalHandle: true },
  });
  const targetIds = targets.map((t) => t.id);
  const scheduleCount = await prisma.socialIngestionSchedule.count({
    where: { socialIngestionTargetId: { in: targetIds }, isActive: true },
  });

  console.log(`Instagram feed items to hide:         ${feedCount}`);
  console.log(
    `Instagram ingestion targets to stop:  ${targets.length}` +
      (targets.length ? ` (${targets.map((t) => t.externalHandle).join(", ")})` : ""),
  );
  console.log(`Their active schedules to stop:       ${scheduleCount}`);

  // content is Json holding a plain string, so match on its text form
  const leftInChat = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT COUNT(*)::bigint AS count FROM "RoomMessage" WHERE content::text ILIKE '%instagram.com%'`,
  );
  console.log(
    `Room messages still containing an Instagram link: ${Number(leftInChat[0]?.count ?? 0)}` +
      " (not changed by this script — see header)",
  );

  if (!APPLY) {
    console.log("\nDry run complete. Re-run with --apply to make these changes.");
    return;
  }

  const [feed, stoppedTargets, stoppedSchedules] = await prisma.$transaction([
    prisma.socialFeedItem.updateMany({ where: feedWhere, data: { isDeleted: true } }),
    prisma.socialIngestionTarget.updateMany({
      where: { id: { in: targetIds } },
      data: { isActive: false },
    }),
    prisma.socialIngestionSchedule.updateMany({
      where: { socialIngestionTargetId: { in: targetIds } },
      data: { isActive: false },
    }),
  ]);

  console.log(
    `\n✅ Hidden ${feed.count} feed items, stopped ${stoppedTargets.count} targets and ${stoppedSchedules.count} schedules.`,
  );
}

main()
  .catch((err) => {
    console.error("❌ Failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
