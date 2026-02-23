import { PrismaClient } from "@prisma/client";
import { seedInterests } from "./seeders/interests.seeder";
import { seedEmotions } from "./seeders/emotions.seeder";
import { seedArtists } from "./seeders/artists.seeder";
import { seedAlbums } from "./seeders/albums.seeder";
import { seedRoomCategories } from "./seeders/roomCategory.seeder";
import { seedRoomSubCategories } from "./seeders/roomSubCategory.seeder";
import { seedRooms } from "./seeders/rooms.seeder";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting modular database seeding...");

  try {
    await seedInterests(prisma);
    await seedEmotions(prisma);
    await seedArtists(prisma);
    await seedAlbums(prisma);
    await seedRoomCategories(prisma);
    await seedRoomSubCategories(prisma);
    await seedRooms(prisma);

    console.log("🎉 All seeder modules executed successfully!");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
