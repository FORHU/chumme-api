import { PrismaClient } from "@prisma/client";

/**
 * Helper: Generate circular positions around a center point
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
    // Position it in a circle around the center (50, 50) at radius 20
    const roomId = `main-chat-${category.id}`.slice(0, 70);
    const angle = Math.random() * Math.PI * 2;
    const roomPosition = {
      x: Math.round(Math.max(5, Math.min(95, 50 + Math.cos(angle) * 20))),
      y: Math.round(Math.max(5, Math.min(95, 50 + Math.sin(angle) * 20))),
    };

    await prisma.room.upsert({
      where: { id: roomId },
      update: {
        name: "Main Chat",
        note: `The primary chat room for ${category.name}`,
        position: roomPosition,
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
        position: roomPosition,
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
