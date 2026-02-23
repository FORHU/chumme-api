import { PrismaClient } from "@prisma/client";

/**
 * Seeds Rooms for each country's Lobby subcategory
 */
export async function seedRooms(prisma: PrismaClient) {
  console.log("🌱 Seeding Rooms for Country Lobbies...");

  // 1. Get or create admin user for ownership
  let systemUser = await prisma.user.findFirst({
    where: { email: "admin@chumme.com" },
  });

  if (!systemUser) {
    systemUser = await prisma.user.findFirst({
      orderBy: { createdAt: "asc" },
    });
  }

  if (!systemUser) {
    console.log("⚠️ No users found to assign as owner. Skipping room seeding.");
    return;
  }
  const ownerId = systemUser.id;

  // 2. Fetch all Room Categories (Countries) to reconstruct their Lobby IDs
  const categories = await prisma.roomCategory.findMany({
    where: { deletedAt: null },
  });

  for (const category of categories) {
    // Reconstruct the Lobby SubCategory ID as done in roomCategory.seeder.ts
    const lobbySubCategoryId = `lobby-${category.id}`.slice(0, 70);

    // Verify subcategory exists
    const subCategory = await prisma.roomSubCategory.findUnique({
      where: { id: lobbySubCategoryId },
    });

    if (!subCategory) {
      console.log(
        `⚠️ Lobby subcategory not found for category ${category.name}. Skipping.`,
      );
      continue;
    }

    // 3. Create or Update a "Main Chat" room in this lobby
    // This room will be promoted to the centerpiece by the frontend
    const roomId = `main-chat-${category.id}`.slice(0, 70);

    await prisma.room.upsert({
      where: { id: roomId },
      update: {
        name: "Main Chat",
        note: `The primary chat room for ${category.name}`,
        position: {
          x:
            50 +
            Math.cos(Math.random() * Math.PI * 2) * (10 + Math.random() * 15),
          y:
            50 +
            Math.sin(Math.random() * Math.PI * 2) * (10 + Math.random() * 15),
        },
      },
      create: {
        id: roomId,
        name: "Main Chat",
        note: `The primary chat room for ${category.name}`,
        ownerId: ownerId,
        roomSubCategoryId: lobbySubCategoryId,
        isPrivate: false,
        isDeleted: false,
        keyName: `main-chat-${category.id}`, // Unique per country
        metaData: { isCenterpiece: true },
        position: {
          x:
            50 +
            Math.cos(Math.random() * Math.PI * 2) * (10 + Math.random() * 15),
          y:
            50 +
            Math.sin(Math.random() * Math.PI * 2) * (10 + Math.random() * 15),
        },
      },
    });

    // 4. Ensure owner is a member of the room
    await prisma.roomMember.upsert({
      where: {
        room_id_user_id: {
          roomId: roomId,
          userId: ownerId,
        },
      },
      update: {},
      create: {
        roomId: roomId,
        userId: ownerId,
        role: "owner",
      },
    });

    console.log(`✅ Seeded Main Chat room for ${category.name}`);
  }

  console.log(`✅ Room seeding complete.`);
}
