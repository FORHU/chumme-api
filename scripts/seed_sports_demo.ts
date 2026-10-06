import { PrismaClient } from "@prisma/client";
import { seedSportLeagues } from "../prisma/seeders/sportLeagues.seeder";
import {
  clearSportDemo,
  seedSportDemo,
} from "../prisma/seeders/sportDemo.seeder";

/**
 * Demo matches for the Sports tab, for when ESPN has nothing on.
 *
 *   npm run db:seed:sports:demo            seed / re-anchor to now
 *   npm run db:seed:sports:demo -- --clear remove them and their chat
 *
 * No ESPN calls. Kickoffs are relative to when this runs, so run it again
 * shortly before a demo — re-running moves the same matches, it does not add
 * more, and chat already posted in their rooms is kept.
 *
 * The API only shows these while SPORTS_DEMO_MODE=true.
 */

async function main() {
  const prisma = new PrismaClient();

  try {
    if (process.argv.includes("--clear")) {
      const { events, messages } = await clearSportDemo(prisma);
      console.log(
        `Removed ${events} demo fixture(s) and ${messages} message(s).`,
      );
      return;
    }

    console.log("── 1. Leagues ──────────────────────────────────────────────");
    await seedSportLeagues(prisma);

    console.log(
      "\n── 2. Demo fixtures ────────────────────────────────────────",
    );
    const { seeded } = await seedSportDemo(prisma);

    console.log(`\nDone. ${seeded} demo fixture(s).`);
    console.log(
      "Set SPORTS_DEMO_MODE=true on the API for them to appear in /sports/fixtures.",
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("[seed_sports_demo] Failed:", error);
  process.exit(1);
});
