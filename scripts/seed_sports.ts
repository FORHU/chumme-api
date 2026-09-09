import { PrismaClient } from "@prisma/client";
import { seedSportLeagues } from "../prisma/seeders/sportLeagues.seeder";
import SportIngestionSvc from "../src/services/sport-ingestion.service";
import SportRoomSvc from "../src/services/sport-room.service";

/**
 * Turns the sports feature on, end to end.
 *
 *   npm run db:seed:sports
 *
 * Kept out of the main `db:seed` on purpose: this makes live ESPN requests, and
 * a seed command that hits a third-party API every time someone resets their
 * database is a bad default.
 *
 * Steps, in the only order that works:
 *   1. Leagues + their Circles      — nothing else runs without these
 *   2. Backfill fixtures from ESPN  — creates the SportTeam rows
 *   3. Provision team rooms         — needs the teams from step 2
 */

const DAYS = Number(process.env.SPORTS_BACKFILL_DAYS || 14);

async function main() {
  const prisma = new PrismaClient();

  try {
    console.log("── 1. Leagues ──────────────────────────────────────────────");
    const leagues = await seedSportLeagues(prisma);

    if (leagues.created === 0 && leagues.updated === 0) {
      console.log("No leagues seeded — stopping before the ESPN calls.");
      return;
    }

    console.log("\n── 2. Fixtures from ESPN ───────────────────────────────────");
    const results = await SportIngestionSvc.backfillUpcoming(DAYS);

    let fixtures = 0;
    let skipped = 0;
    for (const r of results) {
      fixtures += r.events;
      skipped += r.skipped;
      console.log(`  ${r.league.padEnd(28)} ${r.events} fixture(s)${r.skipped ? `, ${r.skipped} skipped` : ""}`);
    }

    if (fixtures === 0) {
      // Every league returning nothing is far more likely to be a blocked host
      // or a wrong slug than a genuinely empty schedule across all of them.
      console.log(
        "\n  No fixtures came back. Check that site.web.api.espn.com is reachable\n" +
          "  from this machine, and that the slugs match ESPN's own paths.",
      );
    }

    console.log("\n── 3. Team rooms ───────────────────────────────────────────");
    const rooms = await SportRoomSvc.provisionMissingRooms();
    console.log(`  ${rooms.created} room(s) created, ${rooms.skipped} skipped`);

    console.log(
      `\nDone. ${fixtures} fixture(s), ${skipped} skipped, ${rooms.created} team room(s).`,
    );
    console.log("The Sports tab should now have data. Start the poller with `npm run dev:worker`.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("[seed_sports] Failed:", error);
  process.exit(1);
});
