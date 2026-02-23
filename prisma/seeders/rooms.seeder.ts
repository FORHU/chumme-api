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
    const subCategories = await prisma.roomSubCategory.findMany({
      where: { roomCategoryId: category.id, deletedAt: null },
    });

    for (const subCategory of subCategories) {
      const isLobby = subCategory.keyName.startsWith("lobby-");
      const roomKey = isLobby
        ? `main-chat-${category.id}`
        : `room-${subCategory.id}`;
      const roomId = randomUUID();

      const existingRoom = await prisma.room.findFirst({
        where: { keyName: roomKey } as any,
      });

      if (existingRoom) {
        await prisma.room.update({
          where: { id: existingRoom.id },
          data: {
            name: isLobby ? "Main Chat" : `${subCategory.name} Chat`,
            roomSubCategoryId: subCategory.id,
            metaData: { isCenterpiece: isLobby },
          },
        });
      } else {
        await prisma.room.create({
          data: {
            id: roomId,
            name: isLobby ? "Main Chat" : `${subCategory.name} Chat`,
            note: isLobby
              ? `The primary chat room for ${category.name}`
              : `Discussion room for ${subCategory.name}`,
            ownerId: ownerId,
            roomSubCategoryId: subCategory.id,
            isPrivate: false,
            isDeleted: false,
            keyName: roomKey,
            metaData: { isCenterpiece: isLobby },
            position: {
              x: 50 + (Math.random() - 0.5) * 20,
              y: 50 + (Math.random() - 0.5) * 20,
            },
          } as any,
        });
      }

      const targetRoomId = existingRoom ? existingRoom.id : roomId;

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
    }
    console.log(`✅ Seeded rooms for category: ${category.name}`);
  }

  console.log(`✅ Room seeding complete.`);
}
