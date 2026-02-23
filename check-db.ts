import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkDb() {
  const usaCategory = await prisma.roomCategory.findFirst({
    where: { name: "United States" },
  });

  if (!usaCategory) {
    console.log("USA Category not found!");
    return;
  }

  console.log("USA Category ID:", usaCategory.id);

  const subCats = await prisma.roomSubCategory.findMany({
    where: { roomCategoryId: usaCategory.id },
  });

  console.log(`Found ${subCats.length} subcategories for USA.`);
  if (subCats.length > 0) {
    console.log("Sample:", subCats[0].name, subCats[0].keyName);
  }
}

checkDb();
