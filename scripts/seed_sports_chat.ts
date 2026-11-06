import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { purgeSportChat, seedSportChat } from "../prisma/seeders/sportChat.seeder";

/**
 * Standalone runner for the match-room fan chat (text + voice notes).
 *
 * Needs matches (`db:seed:sports` or `db:seed:sports:demo`) and the chat
 * personas (`db:seed:chat`). `--purge` removes only the personas' match-room
 * messages, leaving real users' chat alone.
 */
const prisma = new PrismaClient();

async function main() {
  try {
    if (process.argv.slice(2).includes("--purge")) {
      await purgeSportChat(prisma);
      return;
    }
    await seedSportChat(prisma);
  } catch (error) {
    console.error("❌ Match chat seeding failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
