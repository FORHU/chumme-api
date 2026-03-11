import { PrismaClient } from "@prisma/client";
import { seedInterests } from "./seeders/interests.seeder";
import { seedEmotions } from "./seeders/emotions.seeder";
import { seedArtists } from "./seeders/chummeArtists.seeder";
import { seedAlbums } from "./seeders/musicAlbums.seeder";

import { seedChummeCategories } from "./seeders/chummeCategory.seeder";
import { seedUsers } from "./seeders/users.seeder";
import { seedChummeArtistPersonas } from "./seeders/chummeArtistPersona.seeder";



const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting modular database seeding...");

  try {
    await seedUsers(prisma);
    await seedInterests(prisma);

    await seedEmotions(prisma);
    await seedArtists(prisma);
    await seedAlbums(prisma);
    await seedChummeArtistPersonas(prisma);
    await seedChummeCategories(prisma);


    console.log("🎉 All seeder modules executed successfully!");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    // @ts-ignore
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
