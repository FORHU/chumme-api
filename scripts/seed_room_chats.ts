import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { seedRoomChats, purgeSeededChat } from "../prisma/seeders/roomChat.seeder";

/**
 * Standalone runner for the chat seeder.
 *
 * `npm run db:seed` re-runs every seeder in the chain; when you only want to
 * refill chat history (or re-tune SEED_CHAT_MESSAGES_PER_ROOM) this skips the
 * rest. Useful against the shared staging database, where touching fewer tables
 * is the safer default.
 */
const prisma = new PrismaClient();

async function main() {
  try {
    if (process.argv.slice(2).includes("--purge")) {
      await purgeSeededChat(prisma);
      return;
    }
    await seedRoomChats(prisma);
  } catch (error) {
    console.error("❌ Chat seeding failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
