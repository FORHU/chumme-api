import { PrismaClient } from "@prisma/client";
import { seedInterests } from "./seeders/interests.seeder";
import { seedEmotions } from "./seeders/emotions.seeder";
import { seedArtists } from "./seeders/artists.seeder";
import { seedFeedItems } from "./seeders/feed.seeder";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting modular database seeding...");
  ``;
  try {
    // await seedInterests(prisma);
    // await seedEmotions(prisma);
    // await seedArtists(prisma);
    // await seedFeedItems(prisma);

    console.log("🎉 All seeder modules executed successfully!");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    throw error;
  }
}

main()
  .catch((error) => {
    console.error("❌ Error in main seed runner:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
