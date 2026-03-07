import { PrismaClient, ChummeCategory } from "@prisma/client";

/**
 * Helper: Generate circular positions
 */
function generateCircularPositions(
  center: { x: number; y: number },
  radius: number,
  count: number,
) {
  const positions: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const x = Math.round(center.x + Math.cos(angle) * radius);
    const y = Math.round(center.y + Math.sin(angle) * radius);
    positions.push({
      x: Math.max(5, Math.min(95, x)),
      y: Math.max(5, Math.min(95, y)),
    });
  }
  return positions;
}

/**
 * Seeds exactly 10 subcategories (1 Lobby + 9 Topics) for each ChummeCategory
 */
export async function seedChummeSubCategories(
  prisma: PrismaClient,
  categoriesInput?: ChummeCategory[],
) {
  console.log("🌱 Seeding Chumme SubCategories (10 per Category)...");

  const categories =
    categoriesInput ||
    (await prisma.chummeCategory.findMany({
      where: { deletedAt: null },
    }));

  const topicsList = [
    "Music",
    "Movies",
    "Anime",
    "Gaming",
    "Technology",
    "AI",
    "Food",
    "Travel",
    "Fitness",
    "Fashion",
    "Art",
    "Sports",
    "Books",
    "Startups",
    "Memes",
  ];

  for (const category of categories) {
    // 1. Prepare 10 Items: 1 Lobby + 9 Topics
    const items = [
      { name: "Chumme Lobby", type: "lobby", isCenterpiece: false },
      ...topicsList
        .slice(0, 9)
        .map((t) => ({ name: t, type: "topic", isCenterpiece: false })),
    ];

    const positions = generateCircularPositions(
      { x: 50, y: 50 },
      30,
      items.length,
    );

    // Get existing subcategories for this category to avoid duplicates
    const existingSubCats = await prisma.chummeSubCategory.findMany({
      where: {
        chummeCategoryId: category.id,
        deletedAt: null,
      },
      select: { name: true },
    });
    const existingNames = new Set(existingSubCats.map((s) => s.name));

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // Skip if subcategory with same name already exists in this category
      if (existingNames.has(item.name)) {
        continue;
      }

      const position = item.type === "lobby" ? { x: 50, y: 50 } : positions[i];

      // 1. Create Design first (as it's the "parent" in the 1:1 nested write perspective)
      const design = await prisma.chummeVisualDesign.create({
        data: {
          name: `${category.name} - ${item.name} Design`,
          position,
          colorSet: {
            primary: item.type === "lobby" ? "#9d30ff" : "#ff0095",
            secondary: item.type === "lobby" ? "#c084fc" : "#f472b6",
            border: item.type === "lobby" ? "#9d30ff" : "#ff0095",
          },
          sizeSet: { radius: item.type === "lobby" ? "large" : "medium" },
          border: { width: 2, color: "#000", style: "solid" },
          shadow: { x: 0, y: 2, blur: 6, color: "#aaa" },
          opacity: 0.9,
          capacity: item.type === "lobby" ? 1000 : 500,
          status: "active",
          tags: [item.type],
          emojiIcon: "",
          metaData: { isCenterpiece: item.isCenterpiece },
        },
      });

      // 2. Create SubCategory connected to Design
      await prisma.chummeSubCategory.create({
        data: {
          name: item.name,
          chummeCategoryId: category.id,
          keyPassword: null,
          isAd: false,
          chummeVisualDesignId: design.id,
        },
      });
    }
  }

  console.log(
    `✅ Seeded Chumme subcategories for ${categories.length} categories.`,
  );
}

export default seedChummeSubCategories;
