import { PrismaClient, RoomCategory } from "@prisma/client";
import { createHash } from "crypto";

/**
 * Helper: Generate deterministic UUID from a string
 */
function generateId(base: string): string {
  const hash = createHash("md5").update(base).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}

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
 * Seeds exactly 10 subcategories (1 Lobby + 9 Topics) for each RoomCategory
 */
export async function seedRoomSubCategories(
  prisma: PrismaClient,
  categoriesInput?: RoomCategory[],
) {
  console.log("🌱 Seeding Room SubCategories (10 per Category)...");

  const categories =
    categoriesInput ||
    (await prisma.roomCategory.findMany({
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
      { name: "Chumme Lobby", type: "lobby", isCenterpiece: true },
      ...topicsList
        .slice(0, 9)
        .map((t) => ({ name: t, type: "topic", isCenterpiece: false })),
    ];

    const positions = generateCircularPositions(
      { x: 50, y: 50 },
      30,
      items.length,
    );

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const position = item.type === "lobby" ? { x: 50, y: 50 } : positions[i];

      // Deterministic ID based on category and original name
      // This ensures we always target the same record for the same name in this category
      const deterministicId = generateId(
        `${category.id}-${item.name}-${item.type}`,
      );

      await prisma.roomSubCategory.upsert({
        where: { id: deterministicId },
        update: {},
        create: {
          id: deterministicId,
          name: item.name,
          roomCategoryId: category.id,
          position,
          isAd: false,
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
          keyName: null, // Password - seeded empty
          metaData: { isCenterpiece: item.isCenterpiece },
          tags: [item.type],
          emojiIcon: "",
        },
      });
    }
  }

  console.log(`✅ Seeded subcategories for ${categories.length} categories.`);
}

export default seedRoomSubCategories;
