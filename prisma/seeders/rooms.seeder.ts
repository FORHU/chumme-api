import { PrismaClient, RoomCategory } from "@prisma/client";
import { randomUUID } from "node:crypto";

/**
 * Seeds Rooms for each country's Lobby subcategory
 */
export async function seedRooms(
  prisma: PrismaClient,
  categoriesInput?: RoomCategory[],
) {
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
    console.log(
      "⚠️ No users found. Creating a default admin user for seeding...",
    );
    systemUser = await prisma.user.create({
      data: {
        id: "2ba16626-db79-4cd7-8460-3bc5ef11ca38", // Seed admin ID
        email: "admin@chumme.com",
        name: "Chumme Admin",
        username: "chumme_admin",
        password: "dummy_hash_for_seeding",
        role: "ADMIN",
      },
    });
  }
  const ownerId = systemUser.id;

  // 2. Fetch all Room Categories (Countries) to reconstruct their Lobby IDs
  const categories =
    categoriesInput ||
    (await prisma.roomCategory.findMany({
      where: { deletedAt: null },
    }));

  for (const category of categories) {
    // Find subcategory by keyName (more reliable than ID reconstruction)
    const lobbyKey = `lobby-${category.id}`;
    const subCategory = await prisma.roomSubCategory.findUnique({
      where: { keyName: lobbyKey },
    });

    if (!subCategory) {
      console.log(
        `⚠️ Lobby subcategory not found for category ${category.name} (key: ${lobbyKey}). Skipping.`,
      );
      continue;
    }

    const lobbySubCategoryId = subCategory.id;

    // 3. Create or Update a "Main Chat" room in this lobby
    // This room will be promoted to the centerpiece by the frontend
    const roomKey = `main-chat-${category.id}`;
    const roomId = randomUUID();

    const existingRoom = await prisma.room.findFirst({
      where: { keyName: roomKey } as any,
    });

    if (existingRoom) {
      await prisma.room.update({
        where: { id: existingRoom.id },
        data: {
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
      });
    } else {
      await prisma.room.create({
        data: {
          id: roomId,
          name: "Main Chat",
          note: `The primary chat room for ${category.name}`,
          ownerId: ownerId,
          roomSubCategoryId: lobbySubCategoryId,
          isPrivate: false,
          isDeleted: false,
          keyName: roomKey, // Unique per country
          metaData: { isCenterpiece: true },
          position: {
            x:
              50 +
              Math.cos(Math.random() * Math.PI * 2) * (10 + Math.random() * 15),
            y:
              50 +
              Math.sin(Math.random() * Math.PI * 2) * (10 + Math.random() * 15),
          },
        } as any,
      });
    }

    const targetRoomId = existingRoom ? existingRoom.id : roomId;

    // 4. Ensure owner is a member of the room
    await prisma.roomMember.upsert({
      where: {
        room_id_user_id: {
          roomId: targetRoomId,
          userId: ownerId,
        },
      },
      update: {},
      create: {
        roomId: targetRoomId,
        userId: ownerId,
        role: "owner",
      },
    });

    console.log(`✅ Seeded Main Chat room for ${category.name}`);
  }

  console.log(`✅ Room seeding complete.`);
}
