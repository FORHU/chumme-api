import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

function randomHexColor(): string {
  return "#" + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0");
}

<<<<<<< Updated upstream
<<<<<<< Updated upstream
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
=======
=======
>>>>>>> Stashed changes
/**
 * Seeds one Lobby `RoomSubCategory` per existing `RoomCategory`
 */
export async function seedRoomSubCategories(prisma: PrismaClient) {
  console.log("🌱 Seeding Room SubCategories (Lobbies)...");

  // ownerId is optional; do not require or set ownerId on subcategories

  const categories = await prisma.roomCategory.findMany({ where: { deletedAt: null } });

  for (const category of categories) {
    const lobbyId = `lobby-${category.id}`.slice(0, 70);

    await prisma.roomSubCategory.upsert({
      where: { id: lobbyId },
      update: {
<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
        name: `${category.name} Lobby`,
        roomCategoryId: category.id,
        color: (category as any).color ?? randomHexColor(),
        position: (category as any).position ?? { x: 50, y: 50 },
        isAd: false,
        membersCount: (category as any).membersCount ?? 0,
<<<<<<< Updated upstream
<<<<<<< Updated upstream
        size: (category as any).size ?? "medium",
        keyName: lobbyKey,
        metaData: {},
      };

      await prisma.roomSubCategory.create({ data: lobbyData });
    }

    const shuffled = shuffle(Array.from(new Set(topics))).slice(0, 10);
=======
=======
>>>>>>> Stashed changes
        size: (category as any).size as any ?? "medium",
        metaData: {},
      },
      create: {
        id: lobbyId,
        name: `${category.name} Lobby`,
        roomCategoryId: category.id,
        color: (category as any).color ?? randomHexColor(),
        position: (category as any).position ?? { x: 50, y: 50 },
        isAd: false,
        membersCount: (category as any).membersCount ?? 0,
        size: (category as any).size as any ?? "medium",
        keyName: `lobby-${category.id}`,
        metaData: {},
      },
    });

    // Now create 10 random topic subcategories for this category
    const topics = [
      // Entertainment
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

      // Gaming
      "Gaming",
      "Mobile Games",
      "PC Games",
      "Console Games",
      "Esports",
      "Game Development",
      "Retro Games",
      "VR/AR",

      // Tech
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

      // Lifestyle
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

      // Creative
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

      // Sports
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

      // Education & Career
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

      // Automotive
      "Cars",
      "Motorcycles",
      "Electric Vehicles",
      "Car Mods",
      "Racing",

      // Culture
      "Politics",
      "World News",
      "Philosophy",
      "Spirituality",
      "Culture",
      "Language Learning",

      // Fun / Social
      "Memes",
      "Trending",
      "Challenges",
      "Debates",
      "Hot Takes",
      "Community",
      "Random Thoughts",
    ];

    const uniqueTopics = Array.from(new Set(topics));

    function shuffle<T>(arr: T[]) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }

    const shuffled = shuffle(uniqueTopics).slice(0, 10);

<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
    const basePos = (category as any).position ?? { x: 50, y: 50 };

    for (const topic of shuffled) {
      const slug = topic.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\-]/g, "");
      const keyName = `topic-${category.id}-${slug}`;
<<<<<<< Updated upstream
<<<<<<< Updated upstream
      const existing = await prisma.roomSubCategory.findUnique({ where: { keyName } });
      if (existing) continue; // create-only

      const offsetX = Math.max(0, Math.min(100, (basePos.x || 50) + (Math.random() * 20 - 10)));
      const offsetY = Math.max(0, Math.min(100, (basePos.y || 50) + (Math.random() * 20 - 10)));

      const data = {
        id: randomUUID(),
=======
=======
>>>>>>> Stashed changes

      // position: small random offset around category position
      const offsetX = Math.max(0, Math.min(100, (basePos.x || 50) + (Math.random() * 20 - 10)));
      const offsetY = Math.max(0, Math.min(100, (basePos.y || 50) + (Math.random() * 20 - 10)));

      // If an entry exists with the keyName and has an old 'sub-' prefixed id, replace it with a pure UUID.
      const existing = await prisma.roomSubCategory.findUnique({ where: { keyName } });

      const data = {
<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
        name: topic,
        roomCategoryId: category.id,
        color: randomHexColor(),
        position: { x: Math.round(offsetX), y: Math.round(offsetY) },
        isAd: false,
        membersCount: Math.floor(Math.random() * 20000) + 50,
        size: "small",
<<<<<<< Updated upstream
<<<<<<< Updated upstream
        keyName,
        metaData: {},
      } as any;

      await prisma.roomSubCategory.create({ data });
    }
  }

  console.log(`✅ Created missing lobbies + topics for ${categories.length} categories.`);
}

export default seedRoomSubCategories;
=======
=======
>>>>>>> Stashed changes
        metaData: {},
        keyName,
      } as any;

      if (existing) {
        if (existing.id.startsWith("sub-")) {
          // delete old prefixed-id record and create a new one with UUID
          await prisma.roomSubCategory.delete({ where: { id: existing.id } });
          await prisma.roomSubCategory.create({
            data: { id: randomUUID(), ...data },
          });
        } else {
          // existing already has UUID id, just update
          await prisma.roomSubCategory.update({ where: { id: existing.id }, data });
        }
      } else {
        await prisma.roomSubCategory.create({ data: { id: randomUUID(), ...data } });
      }
    }
  }

  console.log(`✅ Seeded ${categories.length} Lobby subcategories.`);
}
<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
