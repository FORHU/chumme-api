import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { seedRoomLinks, purgeSeededLinks } from "../prisma/seeders/roomLinks.seeder";

/**
 * Standalone runner for the social-link seeder.
 *
 * Needs the chat seeder to have run (`npm run db:seed:chat`) — links are posted
 * by the personas already in each room, inside that room's existing backlog.
 * Re-run after editing prisma/seed-assets/social-links.json; `--purge` removes
 * only the link messages, leaving the rest of the seeded chat alone.
 */
const prisma = new PrismaClient();

async function main() {
  try {
    if (process.argv.slice(2).includes("--purge")) {
      await purgeSeededLinks(prisma);
      return;
    }
    await seedRoomLinks(prisma);
  } catch (error) {
    console.error("❌ Link seeding failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
