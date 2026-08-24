import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting to clear all Chumme categories...");

  // Since categories are linked to designs and subcategories, 
  // Prisma will handle cascading deletes if set up correctly, 
  // otherwise we should delete from bottom up.

  // Let's delete SubCategories and TopicCategories first to avoid FK constraints
  console.log("Clearing Room-related dependencies...");
  await prisma.roomMessageReaction.deleteMany();
  await prisma.roomMessage.deleteMany();
  await prisma.roomUserChat.deleteMany();

  console.log("Clearing ChummeTopicCategory...");
  await prisma.chummeTopicCategory.deleteMany();

  console.log("Clearing ChummeSubCategory...");
  await prisma.chummeSubCategory.deleteMany();

  console.log("Clearing ChummeCategory...");
  await prisma.chummeCategory.deleteMany();

  console.log("Clearing ChummeCategoryDesign...");
  await prisma.chummeCategoryDesign.deleteMany();

  console.log("Successfully cleared all categories and designs.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
