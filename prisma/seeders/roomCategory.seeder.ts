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
      colorSet: { primary: "#9d30ff", secondary: "#c084fc", border: "#9d30ff" },
      position: { x: 20, y: 25 },
      sizeSet: { radius: 2, maxRadius: 80 },
      isAd: false,
      border: { width: 2, color: "#000", style: "solid" },
      shadow: { x: 0, y: 2, blur: 6, color: "#aaa" },
      opacity: 0.9,
      capacity: 2000000,
      status: "active",
      tags: ["USA", "North America"],
      emojiIcon: "🇺🇸",
    },
    {
      id: "77a9a080-bf60-4feb-9bbd-c0727c774ebd",
      name: "United Kingdom",
      colorSet: { primary: "#2a45ff", secondary: "#60a5fa", border: "#2a45ff" },
      position: { x: 60, y: 20 },
      sizeSet: { radius: 2, maxRadius: 80 },
      isAd: false,
      border: { width: 2, color: "#000", style: "solid" },
      shadow: { x: 0, y: 2, blur: 6, color: "#aaa" },
      opacity: 0.9,
      capacity: 850000,
      status: "active",
      tags: ["UK", "Europe"],
      emojiIcon: "🇬🇧",
    },
    {
      id: "4ed0e800-c7a6-41d8-9c1a-7463c67e9126",
      name: "Japan",
      colorSet: { primary: "#ff0095", secondary: "#f472b6", border: "#ff0095" },
      position: { x: 80, y: 45 },
      sizeSet: { radius: 2, maxRadius: 80 },
      isAd: false,
      border: { width: 2, color: "#000", style: "solid" },
      shadow: { x: 0, y: 2, blur: 6, color: "#aaa" },
      opacity: 0.9,
      capacity: 1500000,
      status: "active",
      tags: ["Japan", "Asia"],
      emojiIcon: "🇯🇵",
    },
    {
      id: "f7ac5ac8-5a1d-4b4f-b5c0-45eb3102bc3d",
      name: "South Korea",
      colorSet: { primary: "#fbbf24", secondary: "#fcd34d", border: "#fbbf24" },
      position: { x: 25, y: 65 },
      sizeSet: { radius: 2, maxRadius: 80 },
      isAd: false,
      border: { width: 2, color: "#000", style: "solid" },
      shadow: { x: 0, y: 2, blur: 6, color: "#aaa" },
      opacity: 0.9,
      capacity: 1800000,
      status: "active",
      tags: ["Korea", "Asia"],
      emojiIcon: "🇰🇷",
    },
    {
      id: "1e888904-a298-4091-bdbf-6a3206bc8ee6",
      name: "Canada",
      colorSet: { primary: "#06b6d4", secondary: "#22d3ee", border: "#06b6d4" },
      position: { x: 10, y: 55 },
      sizeSet: { radius: 2, maxRadius: 80 },
      isAd: false,
      border: { width: 2, color: "#000", style: "solid" },
      shadow: { x: 0, y: 2, blur: 6, color: "#aaa" },
      opacity: 0.9,
      capacity: 650000,
      status: "active",
      tags: ["Canada", "North America"],
      emojiIcon: "🇨🇦",
    },
    {
      id: "cbe1ffec-945b-4128-a580-4e58cd7f4b6b",
      name: "Australia",
      colorSet: { primary: "#8b5cf6", secondary: "#a78bfa", border: "#8b5cf6" },
      position: { x: 70, y: 80 },
      sizeSet: { radius: 2, maxRadius: 80 },
      isAd: false,
      border: { width: 2, color: "#000", style: "solid" },
      shadow: { x: 0, y: 2, blur: 6, color: "#aaa" },
      opacity: 0.9,
      capacity: 450000,
      status: "active",
      tags: ["Australia", "Oceania"],
      emojiIcon: "🇦🇺",
    },
    {
      id: "4fa52b4d-287e-4be4-a9fb-af71fefcb6d1",
      name: "Brazil",
      colorSet: { primary: "#9d30ff", secondary: "#c084fc", border: "#9d30ff" },
      position: { x: 35, y: 85 },
      sizeSet: { radius: 2, maxRadius: 80 },
      isAd: false,
      border: { width: 2, color: "#000", style: "solid" },
      shadow: { x: 0, y: 2, blur: 6, color: "#aaa" },
      opacity: 0.9,
      capacity: 250000,
      status: "active",
      tags: ["Brazil", "South America"],
      emojiIcon: "🇧🇷",
    },
    {
      id: "74043e34-6f34-4d01-beee-63a4b5348b70",
      name: "Indonesia",
      colorSet: { primary: "#2a45ff", secondary: "#60a5fa", border: "#2a45ff" },
      position: { x: 85, y: 70 },
      sizeSet: { radius: 2, maxRadius: 80 },
      isAd: false,
      border: { width: 2, color: "#000", style: "solid" },
      shadow: { x: 0, y: 2, blur: 6, color: "#aaa" },
      opacity: 0.9,
      capacity: 180000,
      status: "active",
      tags: ["Indonesia", "Asia"],
      emojiIcon: "🇮🇩",
    },
  ];

  for (const country of countriesData) {
    const category = await prisma.roomCategory.upsert({
      where: { id: country.id },
      update: {
        name: country.name,
        position: country.position,
        keyName: null,
        isAd: country.isAd ?? false,
        colorSet: country.colorSet,
        sizeSet: country.sizeSet,
        border: country.border,
        shadow: country.shadow,
        opacity: country.opacity,
        capacity: country.capacity,
        status: country.status,
        tags: country.tags,
        emojiIcon: country.emojiIcon,
      },
      create: {
        id: country.id,
        name: country.name,
        keyName: null,
        position: country.position,
        isAd: country.isAd ?? false,
        colorSet: country.colorSet,
        sizeSet: country.sizeSet,
        border: country.border,
        shadow: country.shadow,
        opacity: country.opacity,
        capacity: country.capacity,
        status: country.status,
        tags: country.tags,
        emojiIcon: country.emojiIcon,
        metaData: {},
      },
    });

    // 3. Ensure a 'Lobby' subcategory exists for each country for navigation
    // This provides a backend anchor for the frontend-injected 'Chumme Lobby' hub.
    const lobbyId = `lobby-${country.id}`.slice(0, 70); // Match frontend ID logic
    await prisma.roomSubCategory.upsert({
      where: { id: lobbyId },
      update: {
        name: "Chumme Lobby",
        position: { x: 50, y: 50 },
        border: { width: 2, color: "#000", style: "solid" },
        shadow: { x: 0, y: 2, blur: 6, color: "#aaa" },
        opacity: 0.9,
        capacity: 1000,
        status: "active",
        metaData: { isCenterpiece: true },
        tags: [],
        emojiIcon: "",
      },
      create: {
        id: lobbyId,
        name: "Chumme Lobby",
        roomCategoryId: category.id,
        ownerId: ownerId,
        position: { x: 50, y: 50 },
        isAd: false,
        colorSet: {
          primary: "#9d30ff",
          secondary: "#c084fc",
          border: "#9d30ff",
        },
        sizeSet: { radius: "large" },
        border: { width: 2, color: "#000", style: "solid" },
        shadow: { x: 0, y: 2, blur: 6, color: "#aaa" },
        opacity: 0.9,
        capacity: 1000,
        status: "active",
        keyName: null, // Unique per country
        metaData: { isCenterpiece: true },
        tags: [],
        emojiIcon: "",
      },
    });
  }

  console.log(`✅ Seeded ${countriesData.length} Categories.`);
}
