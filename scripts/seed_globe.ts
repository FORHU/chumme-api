import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import {
  seedGlobeCommunities,
  purgeGlobeCommunities,
} from "../prisma/seeders/globeCommunities.seeder";
import { seedRoomChats, purgeSeededChat } from "../prisma/seeders/roomChat.seeder";

/**
 * Seeds the worldwide community spread, then fills the resulting rooms with
 * chat. Runs the two together because a globe full of circles that open into
 * empty rooms is only half the job.
 *
 *   npm run db:seed:globe            seed communities + chat
 *   npm run db:seed:globe -- --purge remove everything this seeder created
 *   npm run db:seed:globe -- --no-chat   communities only
 */
const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);

  try {
    if (args.includes("--purge")) {
      // Chat first: it clears the S3 audio and the persona accounts that the
      // messages inside those communities are attributed to.
      await purgeSeededChat(prisma);
      await purgeGlobeCommunities(prisma);
      return;
    }

    await seedGlobeCommunities(prisma);

    if (!args.includes("--no-chat")) {
      await seedRoomChats(prisma);
    }
  } catch (error) {
    console.error("❌ Globe seeding failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
