import { PrismaClient, SocialPlatform } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // 1. Find SubCategory under Entertainment
  const subCategory = await prisma.chummeSubCategory.findFirst({
    where: {
      chummeCategory: {
        chummeTraits: "ENTERTAINMENT"
      }
    }
  });

  if (!subCategory) {
    console.log("No SubCategory with ENTERTAINMENT trait found!");
    return;
  }

  console.log(`Using SubCategory: ${subCategory.name} (${subCategory.id})`);

  // 2. Insert test target
  const existing = await prisma.socialIngestionTarget.findFirst({
    where: {
      platform: SocialPlatform.YOUTUBE,
      externalHandle: "@BLACKPINK"
    }
  });

  if (!existing) {
    const target = await prisma.socialIngestionTarget.create({
      data: {
        platform: SocialPlatform.YOUTUBE,
        externalHandle: "@BLACKPINK",
        crawlIntervalHours: 1,
        isActive: true,
        chummeSubCategoryId: subCategory.id
      }
    });
    console.log("Created test target:", target);
  } else {
    console.log("Target already exists:", existing);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
