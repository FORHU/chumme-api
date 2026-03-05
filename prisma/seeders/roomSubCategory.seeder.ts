import { PrismaClient, RoomCategory } from "@prisma/client";
import { randomUUID } from "node:crypto";

/**
 * Helper: Generate circular positions avoiding center
 * @param center Center point {x, y}
 * @param radius Distance from center
 * @param count Number of positions to generate
 * @returns Array of positions
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

function shuffle<T>(arr: T[]) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Seeds Lobbies and Topic subcategories for each RoomCategory
 */
export async function seedRoomSubCategories(
  prisma: PrismaClient,
  categoriesInput?: RoomCategory[],
) {
  console.log("🌱 Seeding Room SubCategories (Lobbies + Topics)...");

  const categories =
    categoriesInput ||
    (await prisma.roomCategory.findMany({
      where: { deletedAt: null },
    }));

  const topics = [
    "Music",
    "Movies",
    "TV Shows",
    "Anime",
    "K-Drama",
    "Comics",
    "Streaming",
    "Podcasts",
    "Celebrities",
    "Theater",
    "Gaming",
    "Mobile Games",
    "PC Games",
    "Console Games",
    "Esports",
    "Game Development",
    "Retro Games",
    "VR/AR",
    "Technology",
    "AI",
    "Web Development",
    "Mobile Development",
    "Cybersecurity",
    "Blockchain",
    "Startups",
    "Gadgets",
    "Programming",
    "UI/UX Design",
    "Fashion",
    "Food",
    "Travel",
    "Fitness",
    "Self-Care",
    "Mental Health",
    "Relationships",
    "Parenting",
    "Minimalism",
    "Home Decor",
    "Art",
    "Photography",
    "Videography",
    "Graphic Design",
    "Writing",
    "Poetry",
    "Content Creation",
    "Filmmaking",
    "Crafts",
    "DIY",
    "Sports",
    "Basketball",
    "Football",
    "Volleyball",
    "Boxing",
    "MMA",
    "Running",
    "Cycling",
    "Martial Arts",
    "Outdoor Adventures",
    "Books",
    "Science",
    "History",
    "Business",
    "Finance",
    "Investing",
    "Entrepreneurship",
    "Marketing",
    "Productivity",
    "Remote Work",
    "Cars",
    "Motorcycles",
    "Electric Vehicles",
    "Car Mods",
    "Racing",
    "Politics",
    "World News",
    "Philosophy",
    "Spirituality",
    "Culture",
    "Language Learning",
    "Memes",
    "Trending",
    "Challenges",
    "Debates",
    "Hot Takes",
    "Community",
    "Random Thoughts",
  ];

  for (const category of categories) {
    const lobbyKey = `lobby-${category.id}`;

    // 1. Upsert Lobby
    // Use a pure UUID for the ID, but match via keyName for stability
    const lobbyId = randomUUID();

    await prisma.roomSubCategory.upsert({
      where: { keyName: lobbyKey },
      update: {},
      create: {
        id: lobbyId,
        name: `${category.name} Lobby`,
        roomCategoryId: category.id,
        position: { x: 50, y: 50 },
        isAd: false,
        colorSet: {
          primary: "#9d30ff",
          secondary: "#c084fc",
          border: "#9d30ff",
        },
        sizeSet: { radius: "large", maxRadius: 100 },
        border: { width: 2, color: "#000", style: "solid" },
        shadow: { x: 0, y: 2, blur: 6, color: "#aaa" },
        opacity: 0.9,
        capacity: 1000,
        status: "active",
        keyName: null,
        metaData: {},
        tags: [],
        emojiIcon: "",
      },
    });

    // 2. Create specific Artist subcategories for testing (Enhypen & Exo)
    const basePos = { x: 50, y: 50 };
    const artistSubCats = [
      { name: "Enhypen", artistId: "97c60f60-0d0f-408c-b5a3-fe684b1b7232" },
      { name: "Exo", artistId: "f8818235-b033-4882-a22d-3c6e677c0fa1" },
    ];

    // Generate circular positions for artist subcategories around base position
    const artistPositions = generateCircularPositions(
      basePos,
      25,
      artistSubCats.length,
    );

    for (let idx = 0; idx < artistSubCats.length; idx++) {
      const artist = artistSubCats[idx];
      const slug = artist.name.toLowerCase().trim().replace(/\s+/g, "-");
      const keyName = `artist-${category.id}-${slug}`;
      const position = artistPositions[idx];

      await prisma.roomSubCategory.upsert({
        where: { keyName },
        update: {},
        create: {
          id: randomUUID(),
          name: artist.name,
          roomCategoryId: category.id,
          position,
          isAd: false,
          colorSet: {
            primary: "#2a45ff",
            secondary: "#60a5fa",
            border: "#2a45ff",
          },
          sizeSet: { radius: "medium", maxRadius: 80 },
          border: { width: 2, color: "#000", style: "solid" },
          shadow: { x: 0, y: 2, blur: 6, color: "#aaa" },
          opacity: 0.9,
          capacity: 5000,
          status: "active",
          keyName: null,
          metaData: {},
          tags: [],
          emojiIcon: "",
        } as any,
      });
    }

    // 3. Create up to 8 random topic subcategories in a circular layout
    const uniqueTopics = Array.from(new Set(topics));
    const shuffledTopics = shuffle(uniqueTopics).slice(0, 8);

    // Generate circular positions for topics around base position (radius 30 to keep distance)
    const topicPositions = generateCircularPositions(
      basePos,
      30,
      shuffledTopics.length,
    );

    for (let idx = 0; idx < shuffledTopics.length; idx++) {
      const topic = shuffledTopics[idx];
      const slug = topic
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9\-]/g, "");
      const keyName = `topic-${category.id}-${slug}`;

      const existing = await prisma.roomSubCategory.findUnique({
        where: { keyName },
      });
      if (existing) continue;

      const position = topicPositions[idx];

      await prisma.roomSubCategory.create({
        data: {
          id: randomUUID(),
          name: topic,
          roomCategoryId: category.id,
          position,
          isAd: false,
          colorSet: {
            primary: "#ff0095",
            secondary: "#f472b6",
            border: "#ff0095",
          },
          sizeSet: { radius: "small", maxRadius: 60 },
          border: { width: 2, color: "#000", style: "solid" },
          shadow: { x: 0, y: 2, blur: 6, color: "#aaa" },
          opacity: 0.9,
          capacity: 1000,
          status: "active",
          keyName: null,
          metaData: {},
          tags: [],
          emojiIcon: "",
        } as any,
      });
    }
  }

  console.log(
    `✅ Seeded lobbies + topics for ${categories.length} categories.`,
  );
}

export default seedRoomSubCategories;
