import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

function randomHexColor(): string {
  return "#" + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0");
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
 * Create-only RoomSubCategory seeder.
 * - Requires `RoomCategory` rows to exist first (it will not create categories).
 * - Creates one lobby per category (keyName `lobby-<category.id>`) if missing.
 * - Creates 10 topic subcategories per category (keyName `topic-<category.id>-<slug>`) if missing.
 */
export async function seedRoomSubCategories(prisma: PrismaClient) {
  console.log("🌱 Seeding Room SubCategories (create-only)...");

  const categories = await prisma.roomCategory.findMany({ where: { deletedAt: null } });
  if (!categories.length) {
    console.log("⚠️ No RoomCategory rows found — run the RoomCategory seeder first.");
    return;
  }

  const topics = [
    "Music","Movies","TV Shows","Anime","K-Drama","Comics","Streaming","Podcasts","Celebrities","Theater",
    "Gaming","Mobile Games","PC Games","Console Games","Esports","Game Development","Retro Games","VR/AR",
    "Technology","AI","Web Development","Mobile Development","Cybersecurity","Blockchain","Startups","Gadgets","Programming","UI/UX Design",
    "Fashion","Food","Travel","Fitness","Self-Care","Mental Health","Relationships","Parenting","Minimalism","Home Decor",
    "Art","Photography","Videography","Graphic Design","Writing","Poetry","Content Creation","Filmmaking","Crafts","DIY",
    "Sports","Basketball","Football","Volleyball","Boxing","MMA","Running","Cycling","Martial Arts","Outdoor Adventures",
    "Books","Science","History","Business","Finance","Investing","Entrepreneurship","Marketing","Productivity","Remote Work",
    "Cars","Motorcycles","Electric Vehicles","Car Mods","Racing",
    "Politics","World News","Philosophy","Spirituality","Culture","Language Learning",
    "Memes","Trending","Challenges","Debates","Hot Takes","Community","Random Thoughts",
  ];

  for (const category of categories) {
    const lobbyKey = `lobby-${category.id}`;
    const existingLobby = await prisma.roomSubCategory.findUnique({ where: { keyName: lobbyKey } });
    if (!existingLobby) {
      const lobbyData: any = {
        id: randomUUID(),
        name: `${category.name} Lobby`,
        roomCategoryId: category.id,
        color: (category as any).color ?? randomHexColor(),
        position: (category as any).position ?? { x: 50, y: 50 },
        isAd: false,
        membersCount: (category as any).membersCount ?? 0,
        size: (category as any).size ?? "medium",
        keyName: lobbyKey,
        metaData: {},
      };

      await prisma.roomSubCategory.create({ data: lobbyData });
    }

    const shuffled = shuffle(Array.from(new Set(topics))).slice(0, 10);
    const basePos = (category as any).position ?? { x: 50, y: 50 };

    for (const topic of shuffled) {
      const slug = topic.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\-]/g, "");
      const keyName = `topic-${category.id}-${slug}`;
      const existing = await prisma.roomSubCategory.findUnique({ where: { keyName } });
      if (existing) continue; // create-only

      const offsetX = Math.max(0, Math.min(100, (basePos.x || 50) + (Math.random() * 20 - 10)));
      const offsetY = Math.max(0, Math.min(100, (basePos.y || 50) + (Math.random() * 20 - 10)));

      const data = {
        id: randomUUID(),
        name: topic,
        roomCategoryId: category.id,
        color: randomHexColor(),
        position: { x: Math.round(offsetX), y: Math.round(offsetY) },
        isAd: false,
        membersCount: Math.floor(Math.random() * 20000) + 50,
        size: "small",
        keyName,
        metaData: {},
      } as any;

      await prisma.roomSubCategory.create({ data });
    }
  }

  console.log(`✅ Created missing lobbies + topics for ${categories.length} categories.`);
}

export default seedRoomSubCategories;
