import { PrismaClient } from "@prisma/client";

/**
 * Seeds Subcategories and Rooms for the Center Bubble (Global)
 */
export async function seedCenterBubble(prisma: PrismaClient) {
  console.log("🌱 Seeding Center Bubble Data...");

  const globalCategoryId = "13eb5f99-cb5a-4cc6-9f72-8d4f46ffebb2";

  // 1. Get or create a system/admin user for ownership
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
      "⚠️ No users found to assign as owner. Skipping center bubble seeding.",
    );
    return;
  }

  const ownerId = systemUser.id;

  // 2. Clear existing subcategories for Global to avoid duplicates
  await prisma.roomSubCategory.deleteMany({
    where: { roomCategoryId: globalCategoryId },
  });

  // 3. Create a static subcategory for the center bubble
  const subCategory = await prisma.roomSubCategory.create({
    data: {
      id: "c0a80101-b0db-4b1a-9c1a-1a2b3c4d5e6f",
      name: "Chumme Global",
      note: "Central hub for all users",
      ownerId: ownerId,
      color: "#9d30ff",
      isAd: false,
      membersCount: 1000000,
      metaData: {
        colors: ["#9d30ff", "#c084fc"],
        colorId: "chumme",
      },
      position: { x: 50, y: 50 },
      size: "xlarge",
      roomCategoryId: globalCategoryId,
    },
  });

  // 4. Create a few static rooms in this subcategory
  const roomsData = [
    {
      id: "c0a80102-b0db-4b1a-9c1a-1a2b3c4d5e6f",
      name: "Chumme Lobby",
      note: "Welcome to the central lobby!",
      isPrivate: false,
      ownerId: ownerId,
      roomSubCategoryId: subCategory.id,
      metaData: {
        welcomeMessage: "Welcome to Chumme!",
        theme: "galaxy",
      },
      position: { x: 50, y: 50 },
    },
    {
      id: "c0a80103-b0db-4b1a-9c1a-1a2b3c4d5e6f",
      name: "Global Connect",
      note: "Chat with everyone across the world",
      isPrivate: false,
      ownerId: ownerId,
      roomSubCategoryId: subCategory.id,
      metaData: {
        topic: "Global Networking",
        theme: "nebula",
      },
      position: { x: 60, y: 40 },
    },
  ];

  for (const room of roomsData) {
    const { id, ...data } = room;
    await prisma.room.upsert({
      where: { id },
      update: data,
      create: room,
    });
  }

  console.log("✅ Seeded Center Bubble Subcategory and Rooms.");
}
