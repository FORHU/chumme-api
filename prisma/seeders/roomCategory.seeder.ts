import { PrismaClient } from "@prisma/client";

/**
 * Seeds Room Categories (Regions/Countries) with fixed UUIDs
 */
export async function seedRoomCategories(prisma: PrismaClient) {
  function randomHexColor(): string {
    return (
      "#" +
      Math.floor(Math.random() * 0xffffff)
        .toString(16)
        .padStart(6, "0")
    );
  }

  const countriesData = [
    {
      id: "13eb5f99-cb5a-4cc6-9f72-8d4f46ffebb2",
      name: "Global",
      membersCount: 5000000,
      color: randomHexColor(),
      position: { x: 20, y: 25 },
      size: "xlarge",
      isAd: false,
    },
    {
      id: "96b3c9bf-1077-46aa-b37d-f16f28486936",
      keyName: "usa",
      name: "United States",
      membersCount: 2000000,
      color: randomHexColor(),
      position: { x: 20, y: 25 },
      size: "xlarge",
      isAd: false,
    },
    {
      id: "f7ac5ac8-5a1d-4b4f-b5c0-45eb3102bc3d",
      keyName: "south_korea",
      name: "South Korea",
      membersCount: 1800000,
      color: randomHexColor(),
      position: { x: 25, y: 65 },
      size: "xlarge",
      isAd: false,
    },
    {
      id: "4ed0e800-c7a6-41d8-9c1a-7463c67e9126",
      name: "Japan",
      membersCount: 1500000,
      color: randomHexColor(),
      position: { x: 80, y: 45 },
      size: "xlarge",
      isAd: false,
    },
    {
      id: "77a9a080-bf60-4feb-9bbd-c0727c774ebd",
      name: "United Kingdom",
      membersCount: 850000,
      color: randomHexColor(),
      position: { x: 60, y: 20 },
      size: "large",
      isAd: false,
    },
    {
      id: "1e888904-a298-4091-bdbf-6a3206bc8ee6",
      keyName: "canada",
      name: "Canada",
      membersCount: 650000,
      color: randomHexColor(),
      position: { x: 10, y: 55 },
      size: "large",
      isAd: false,
    },
    {
      id: "cbe1ffec-945b-4128-a580-4e58cd7f4b6b",
      keyName: "australia",
      name: "Australia",
      membersCount: 450000,
      color: randomHexColor(),
      position: { x: 70, y: 80 },
      size: "medium",
      isAd: false,
    },
    {
      id: "4fa52b4d-287e-4be4-a9fb-af71fefcb6d1",
      keyName: "brazil",
      name: "Brazil",
      membersCount: 250000,
      color: randomHexColor(),
      position: { x: 35, y: 85 },
      size: "large",
      isAd: false,
    },
    {
      id: "74043e34-6f34-4d01-beee-63a4b5348b70",
      keyName: "indonesia",
      name: "Indonesia",
      membersCount: 180000,
      color: randomHexColor(),
      position: { x: 85, y: 70 },
      size: "large",
      isAd: false,
    },
    {
      id: "fc7dd489-d73e-4b38-a18a-3cca3d918ffc",
      name: "Thailand",
      membersCount: 85000,
      color: randomHexColor(),
      position: { x: 70, y: 40 },
      size: "medium",
      isAd: false,
    },
    {
      id: "d8817033-eee3-4f0e-bf60-95ec45741040",
      name: "Philippines",
      membersCount: 65000,
      color: randomHexColor(),
      position: { x: 85, y: 45 },
      size: "medium",
      isAd: false,
    },
    {
      id: "4c42b207-3202-48e6-831b-459adffa558d",
      name: "Malaysia",
      membersCount: 45000,
      color: randomHexColor(),
      position: { x: 75, y: 55 },
      size: "medium",
      isAd: false,
    },
    {
      id: "deee652f-ab71-472d-8ac7-75079cd1d405",
      name: "Vietnam",
      membersCount: 32000,
      color: randomHexColor(),
      position: { x: 65, y: 35 },
      size: "medium",
      isAd: false,
    },
    {
      id: "853c24b5-cd4d-48a8-bd7c-2312ac306d30",
      name: "Mexico",
      membersCount: 28000,
      color: randomHexColor(),
      position: { x: 25, y: 45 },
      size: "medium",
      isAd: false,
    },
    {
      id: "3469fcd9-dbf5-4923-8682-0c3ea9b20b66",
      name: "Taiwan",
      membersCount: 8500,
      color: randomHexColor(),
      position: { x: 80, y: 30 },
      size: "medium",
      isAd: false,
    },
    {
      id: "54e9948b-c548-4f49-866c-f50696b4f0df",
      name: "Singapore",
      membersCount: 5200,
      color: randomHexColor(),
      position: { x: 72, y: 65 },
      size: "medium",
      isAd: false,
    },
    {
      id: "edcc76fe-8d5f-4ce7-81ba-0d9f8a3b911a",
      name: "Sponsored",
      membersCount: 0,
      color: randomHexColor(),
      position: { x: 50, y: 50 },
      size: "medium",
      isAd: true,
      imageUrl:
        "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=400&h=400&fit=crop",
      metaData: {},
    },
    {
      id: "04307c34-3f29-4de7-b7b5-957af6ab49a1",
      keyName: "tickets",
      name: "Tickets",
      membersCount: 0,
      color: "#F6C886",
      position: { x: 45, y: 55 },
      isAd: false,
      size: "medium",
      metaData: { colors: ["#F6C886", "#FFD69A"], colorId: "color4" },
    },
  ];

  const results = [];
  for (const country of countriesData) {
    const keyName =
      (country as any).keyName ||
      country.name.toLowerCase().replace(/\s+/g, "_");
    const upserted = await prisma.roomCategory.upsert({
      where: { id: country.id },
      update: {
        name: country.name,
        keyName: keyName,
        membersCount: country.membersCount,
        color: country.color ?? randomHexColor(),
        position: country.position,
        isAd: country.isAd ?? false,
        size: country.size as any,
      },
      create: {
        id: country.id,
        name: country.name,
        keyName: keyName,
        membersCount: country.membersCount,
        color: country.color ?? randomHexColor(),
        position: country.position,
        size: country.size as any,
        isAd: country.isAd ?? false,
        metaData: {},
      },
    });
    results.push(upserted);
  }
  return results;
}
