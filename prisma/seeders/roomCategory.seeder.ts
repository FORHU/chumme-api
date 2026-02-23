import { PrismaClient } from "@prisma/client";

/**
 * Seeds Room Categories (Countries) with fixed UUIDs
 */
export async function seedRoomCategories(prisma: PrismaClient) {
  console.log("🌱 Seeding Countries as Room Categories...");

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
      "⚠️ No users found to assign as owner. Skipping category seeding.",
    );
    return;
  }
  const ownerId = systemUser.id;

  // 2. Define Countries (Room Categories)
  const countriesData = [
    {
      id: "96b3c9bf-1077-46aa-b37d-f16f28486936",
      name: "United States",
      membersCount: 2000000,
      color: "color3",
      position: { x: 20, y: 25 },
      size: "medium",
      isAd: false,
    },
    {
      id: "77a9a080-bf60-4feb-9bbd-c0727c774ebd",
      name: "United Kingdom",
      membersCount: 850000,
      color: "color2",
      position: { x: 60, y: 20 },
      size: "medium",
      isAd: false,
    },
    {
      id: "4ed0e800-c7a6-41d8-9c1a-7463c67e9126",
      name: "Japan",
      membersCount: 1500000,
      color: "color1",
      position: { x: 80, y: 45 },
      size: "medium",
      isAd: false,
    },
    {
      id: "f7ac5ac8-5a1d-4b4f-b5c0-45eb3102bc3d",
      name: "South Korea",
      membersCount: 1800000,
      color: "color3",
      position: { x: 25, y: 65 },
      size: "medium",
      isAd: false,
    },
    {
      id: "1e888904-a298-4091-bdbf-6a3206bc8ee6",
      name: "Canada",
      membersCount: 650000,
      color: "color2",
      position: { x: 10, y: 55 },
      size: "medium",
      isAd: false,
    },
    {
      id: "cbe1ffec-945b-4128-a580-4e58cd7f4b6b",
      name: "Australia",
      membersCount: 450000,
      color: "color4",
      position: { x: 70, y: 80 },
      size: "medium",
      isAd: false,
    },
    {
      id: "4fa52b4d-287e-4be4-a9fb-af71fefcb6d1",
      name: "Brazil",
      membersCount: 250000,
      color: "color1",
      position: { x: 35, y: 85 },
      size: "medium",
      isAd: false,
    },
    {
      id: "74043e34-6f34-4d01-beee-63a4b5348b70",
      name: "Indonesia",
      membersCount: 180000,
      color: "color2",
      position: { x: 85, y: 70 },
      size: "medium",
      isAd: false,
    },
    {
      id: "sponsor-coke-001",
      name: "Coca-Cola World",
      membersCount: 100000,
      color: "color1",
      position: { x: 85, y: 15 },
      size: "medium",
      isAd: true,
    },
    {
      id: "sponsor-nike-001",
      name: "Nike World",
      membersCount: 450000,
      color: "color2",
      position: { x: 10, y: 10 },
      size: "medium",
      isAd: true,
    },
    {
      id: "sponsor-spotify-001",
      name: "Spotify Hub",
      membersCount: 900000,
      color: "color4",
      position: { x: 40, y: 10 },
      size: "medium",
      isAd: true,
    },
    {
      id: "sponsor-galaxy-001",
      name: "Galaxy Beats",
      membersCount: 300000,
      color: "color3",
      position: { x: 95, y: 95 },
      size: "medium",
      isAd: true,
    },
  ];

  for (const country of countriesData) {
    const category = await prisma.roomCategory.upsert({
      where: { id: country.id },
      update: {
        name: country.name,
        membersCount: country.membersCount,
        color: country.color,
        position: country.position,
        isAd: country.isAd ?? false,
      },
      create: {
        id: country.id,
        name: country.name,
        membersCount: country.membersCount,
        color: country.color,
        position: country.position,
        size: country.size as any,
        isAd: country.isAd ?? false,
        metaData: {},
      },
    });

    // 3. Ensure a 'Lobby' subcategory exists for each country for navigation
    // This provides a backend anchor for the frontend-injected 'Chumme Lobby' hub.
    const lobbyId = `lobby-${country.id}`.slice(0, 70); // Match frontend ID logic
    await prisma.roomSubCategory.upsert({
      where: { id: lobbyId },
      update: { name: "Chumme Lobby" },
      create: {
        id: lobbyId,
        name: "Chumme Lobby",
        roomCategoryId: category.id,
        ownerId: ownerId,
        membersCount: 5000000,
        color: "color1",
        size: "large",
        position: { x: 50, y: 50 },
        isAd: false,
        keyName: "chumme-lobby",
        metaData: { isCenterpiece: true },
      },
    });
  }

  console.log(`✅ Seeded ${countriesData.length} Categories.`);
}
