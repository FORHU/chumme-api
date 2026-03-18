import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("📊 --- VIDEO COUNT BY CATEGORY --- \n");

  // 1. Load all categories and subcategories with their feed totals
  const categories = await prisma.chummeCategory.findMany({
    include: {
      socialFeedItems: {
        where: { isDeleted: false },
        select: { id: true }
      },
      chummeSubCategories: {
        include: {
          socialFeedItems: {
            where: { isDeleted: false },
            select: { id: true }
          }
        }
      }
    }
  });

  if (categories.length === 0) {
     console.log("No categories found in database.");
     return;
  }

  categories.forEach(cat => {
    const totalCatVideos = cat.socialFeedItems.length;
    console.log(`📂 Category: [${cat.name}]`);
    console.log(`   Total Direct Category Videos: ${totalCatVideos}`);

    cat.chummeSubCategories.forEach(sub => {
       console.log(`   └─ 📑 SubCategory: [${sub.name}] -> ${sub.socialFeedItems.length} videos`);
    });
    console.log(""); //spacer
  });

  // 2. Check for items items missing category IDs (Unassigned)
  const unassignedCount = await prisma.socialFeedItem.count({
    where: {
      chummeCategoryId: null,
      chummeSubCategoryId: null,
      isDeleted: false
    }
  });

  if (unassignedCount > 0) {
     console.log(`⚠️ Unassigned Videos (No Category attached): ${unassignedCount}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    throw e;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
