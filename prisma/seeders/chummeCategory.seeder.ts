import { PrismaClient } from "@prisma/client";

/**
 * Seeds Chumme Categories (Countries) with fixed UUIDs
 */
export async function seedChummeCategories(prisma: PrismaClient) {
  console.log("🌱 Seeding Countries as Chumme Categories...");

  // 1. Get or create admin user for ownership
  let systemUser = await prisma.user.findFirst({
    where: { email: "aiforhu@gmail.com" },
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
  // 2. Define Countries (Chumme Categories)
  const communitiesData = [
    {
      id: "f2d7e7c3-5c64-4f6c-9c9a-7a8f3f4e91a1",
      name: "Chumme Nation",
      note: "The heart of the Chumme universe — a global digital nation where communities from every country connect, share ideas, create culture, and build friendships beyond borders.",
      colorSet: { primary: "#9d30ff", secondary: "#c084fc", border: "#9d30ff" },
      position: { x: 50, y: 50 },
      sizeSet: { radius: 6, maxRadius: 120 },
      isAd: false,
      border: { width: 3, color: "#000", style: "solid" },
      shadow: { x: 0, y: 4, blur: 12, color: "#888" },
      opacity: 1,
      capacity: 100000000,
      status: "active",
      tags: ["Global", "Chumme", "World Community", "Digital Nation"],
      emojiIcon: "🌍",
      keyPassword: null,
      chummeTraits: "COMMUNITIES",
      targetCountries: [], // Global, matches everything or specific global events
    },
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
      keyPassword: null,
      chummeTraits: "COMMUNITIES",
      targetCountries: ["US"],
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
      keyPassword: null,
      chummeTraits: "COMMUNITIES",
      targetCountries: ["GB"],
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
      keyPassword: null,
      chummeTraits: "COMMUNITIES",
      targetCountries: ["JP"],
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
      capacity: 180000,
      status: "active",
      tags: ["Korea", "Asia"],
      emojiIcon: "🇰🇷",
      keyPassword: null,
      chummeTraits: "COMMUNITIES",
      targetCountries: ["KR"],
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
      keyPassword: null,
      chummeTraits: "COMMUNITIES",
      targetCountries: ["CA"],
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
      keyPassword: null,
      chummeTraits: "COMMUNITIES",
      targetCountries: ["AU"],
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
      keyPassword: null,
      chummeTraits: "COMMUNITIES",
      targetCountries: ["BR"],
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
      keyPassword: null,
      chummeTraits: "COMMUNITIES",
      targetCountries: ["ID"],
    },
    {
      id: "a6c88d69-6d17-4b88-8c6d-3e9d9e7bdb01",
      name: "Philippines",
      colorSet: { primary: "#f97316", secondary: "#fb923c", border: "#f97316" },
      position: { x: 52, y: 70 },
      sizeSet: { radius: 2, maxRadius: 80 },
      isAd: false,
      border: { width: 2, color: "#000", style: "solid" },
      shadow: { x: 0, y: 2, blur: 6, color: "#aaa" },
      opacity: 0.9,
      capacity: 900000,
      status: "active",
      tags: ["Philippines", "Asia"],
      emojiIcon: "🇵🇭",
      keyPassword: null,
      chummeTraits: "COMMUNITIES",
      targetCountries: ["PH"],
    },
    {
      id: "2c6d44e6-33a8-4e47-8e3b-bd1fbd5fa102",
      name: "India",
      colorSet: { primary: "#22c55e", secondary: "#4ade80", border: "#22c55e" },
      position: { x: 72, y: 40 },
      sizeSet: { radius: 2, maxRadius: 80 },
      isAd: false,
      border: { width: 2, color: "#000", style: "solid" },
      shadow: { x: 0, y: 2, blur: 6, color: "#aaa" },
      opacity: 0.9,
      capacity: 2500000,
      status: "active",
      tags: ["India", "Asia"],
      emojiIcon: "🇮🇳",
      keyPassword: null,
      chummeTraits: "COMMUNITIES",
      targetCountries: ["IN"],
    },
    {
      id: "e24d4f59-15b4-4b36-bfe3-5e3ed2c9c103",
      name: "Germany",
      colorSet: { primary: "#ef4444", secondary: "#f87171", border: "#ef4444" },
      position: { x: 55, y: 12 },
      sizeSet: { radius: 2, maxRadius: 80 },
      isAd: false,
      border: { width: 2, color: "#000", style: "solid" },
      shadow: { x: 0, y: 2, blur: 6, color: "#aaa" },
      opacity: 0.9,
      capacity: 700000,
      status: "active",
      tags: ["Germany", "Europe"],
      emojiIcon: "🇩🇪",
      keyPassword: null,
      chummeTraits: "COMMUNITIES",
      targetCountries: ["DE"],
    },
    {
      id: "94a0ad14-b1d7-4d2b-b10d-45f8b2a4d104",
      name: "France",
      colorSet: { primary: "#6366f1", secondary: "#818cf8", border: "#6366f1" },
      position: { x: 47, y: 18 },
      sizeSet: { radius: 2, maxRadius: 80 },
      isAd: false,
      border: { width: 2, color: "#000", style: "solid" },
      shadow: { x: 0, y: 2, blur: 6, color: "#aaa" },
      opacity: 0.9,
      capacity: 620000,
      status: "active",
      tags: ["France", "Europe"],
      emojiIcon: "🇫🇷",
      keyPassword: null,
      chummeTraits: "COMMUNITIES",
      targetCountries: ["FR"],
    },
  ];

  const categoriesData = [
    {
      id: "7a1c7d6c-2f45-4a9d-9c9e-5a6e7b3c11f2",
      name: "Music",
      chummeTraits: "ENTERTAINMENT",
      note: "Songs, artists, bands, albums, concerts, and music culture.",
      subcategories: [
        {
          id: "5e3f6d8b-21e1-4c79-91aa-0f1b23c3d4e5",
          name: "K-pop",
          note: "Popular music from South Korean artists and idol groups.",
          topiccategories: [
            {
              id: "0c2e1f4a-6e57-4a4e-9d1e-32e1d9f7a111",
              name: "BTS",
              note: "Global K-pop boy group.",
              channelId: ["UCLkAepWjdylmXSltofFvsYQ"],
            },
            {
              id: "cfa92b76-31c1-4f0d-82a2-d98a4e72c112",
              name: "BLACKPINK",
              note: "Popular K-pop girl group.",
              channelId: ["UCOmHUn--16B90oW2L6FRR3A"],
            },
            {
              id: "e7b5a4f2-53b5-4b6f-a6e7-3e8a9f20c114",
              name: "TWICE",
              note: "Top-selling K-pop girl group.",
              channelId: ["UCzgxx_DM2Dcb9Y1spb9mUJA"],
            },
            {
              id: "0c1a2d33-8c11-4c71-b1f0-6f2d1f221201",
              name: "SEVENTEEN",
              note: "Self-producing K-pop boy group.",
              channelId: ["UCfkXDY7vwkcJ8ddFGz8KusA"],
            },
            {
              id: "6a3b8c01-5c4d-4c51-8e90-9c10b3f21202",
              name: "Stray Kids",
              note: "4th generation K-pop boy group.",
              channelId: ["UC9rMiEjNaCSsebs31MRDCRA"],
            },
            {
              id: "a18b7c5d-3d7e-4d21-b3d1-1e5a9f0c1211",
              name: "NewJeans",
              note: "Trending 4th generation K-pop girl group.",
              channelId: ["UCMki_UkHb4qSc0qyEcOHHJw"],
            },
            {
              id: "8e9c1b77-0d13-49d3-9f10-2b7b9a1f1207",
              name: "ENHYPEN",
              note: "K-pop boy group formed through I-LAND.",
              channelId: ["UCArLZtok93cO5R9RI4_Y5Jw"],
            },
            {
              id: "1aab8a22-4b66-4f5f-9e51-6f2f9f93c113",
              name: "EXO",
              note: "K-pop boy group known for powerful vocals.",
              channelId: ["UCzCedBCSSltI1TFd3bKyN6g"],
            },
            {
              id: "bf9a1c22-4e6a-4c9f-b211-1c8e1d2a1221",
              name: "aespa",
              note: "K-pop girl group from SM Entertainment.",
              channelId: ["UC9GtSLeksfK4yuJ_g1lgQbg"],
            },
            {
              id: "9b0d7b12-3e41-4f6b-a1d9-7c3dfe8d1205",
              name: "ITZY",
              note: "4th generation K-pop girl group.",
              channelId: ["UCDhM2k2Cua-JdobAh5moMFg"],
            },
            {
              id: "3b7c81e5-ff02-4b09-bcaa-d9e2fa8b1209",
              name: "LE SSERAFIM",
              note: "HYBE girl group.",
              channelId: ["UCs-QBT4qkj_YiQw1ZntDO3g"],
            },
            {
              id: "b20d9a41-7d62-4c77-a6c4-2d72f3f01210",
              name: "IVE",
              note: "Popular 4th generation girl group.",
              channelId: ["UC-Fnix71vRP64WXeo0ikd0Q"],
            },
            {
              id: "dd9e0e01-5a83-4e9e-9b21-3c5c7fdf1212",
              name: "(G)I-DLE",
              note: "Self-producing K-pop girl group.",
              channelId: ["UCritGVo7pLJLUS8wEu32vow"],
            },
            {
              id: "f8e44b20-2d51-4d89-8b3a-0fbc2c7f1208",
              name: "TXT",
              note: "Tomorrow X Together, boy group under HYBE.",
              channelId: ["UCtiObj3CsEAdNU6ZPWDsddQ"],
            },
            {
              id: "c1b3f8e1-44a5-4c01-9e73-7f1a3f0d1206",
              name: "ATEEZ",
              note: "K-pop boy group known for powerful performances.",
              channelId: ["UC2e4Ukj5Pfr7cb3KpJAFBdQ"],
            },
            {
              id: "1c92a3f0-7e44-4d55-bc1e-0a1d332a1203",
              name: "NCT",
              note: "Global K-pop group with multiple units.",
              channelId: ["UCwgtORdDtUKhpjE1VBv6XfA"],
            },
            {
              id: "c3a82c90-4b33-4b0c-9b99-2d8c1caa1204",
              name: "Red Velvet",
              note: "K-pop girl group from SM Entertainment.",
              channelId: ["UCk9GmdlDTBfgGRb7vXeRMoQ"],
            },
            {
              id: "0e3c5a2d-bb8c-41aa-8c6a-b1e8d5fd1213",
              name: "MAMAMOO",
              note: "Girl group known for strong vocals.",
              channelId: ["UCmjM9xIkzYMs8AEDR_OKQBg"],
            },
            {
              id: "92b7e7c4-41f7-4fbb-b81c-7b92d4f21216",
              name: "Girls’ Generation",
              note: "Legendary K-pop girl group (SNSD).",
              channelId: ["UCfIMfXMJlAFBa3kOMEO7JnA"],
            },
            {
              id: "4f1a3a21-9a5b-4c77-81bb-99c9d2111214",
              name: "BIGBANG",
              note: "Legendary K-pop boy group.",
              channelId: ["UCnkPeJFPayqai55lqrMEN5g"],
            },
            {
              id: "abcc93e1-9b3a-4d91-a4b2-5e8a8e021215",
              name: "Super Junior",
              note: "Veteran K-pop boy group.",
              channelId: ["UCaO6TYtlC8U5ttz62hTrZgg"],
            },
            {
              id: "7c4d22c8-9d11-4f2b-ae88-0a77d8211217",
              name: "IU",
              note: "One of the most famous Korean solo artists.",
              channelId: ["UC3SyT4_WLHzN7JcU2VMWJPQ"],
            },
          ],
        },
      ],
    },
  ] as any[];

  for (const country of communitiesData) {
    const {
      position,
      colorSet,
      sizeSet,
      border,
      shadow,
      opacity,
      capacity,
      status,
      tags,
      emojiIcon,
      ...categoryData
    } = country;

    // 1. Check if category exists
    const existingCategory = await prisma.chummeCategory.findUnique({
      where: { id: categoryData.id },
      include: { chummeVisualDesign: true },
    });

    if (existingCategory) {
      // Update existing
      await prisma.chummeCategory.update({
        where: { id: categoryData.id },
        data: {
          name: categoryData.name,
          isAd: categoryData.isAd,
          keyPassword: categoryData.keyPassword || null,
          chummeTraits: (categoryData.chummeTraits as any) || "NONE",
        },
      });

      if (existingCategory.chummeVisualDesignId) {
        await prisma.chummeCategoryDesign.update({
          where: { id: existingCategory.chummeVisualDesignId },
          data: {
            position,
            colorSet,
            sizeSet,
            border,
            shadow,
            opacity,
            capacity,
            status,
            tags,
            emojiIcon,
          },
        });
      }
    } else {
      // Create new
      const design = await prisma.chummeCategoryDesign.create({
        data: {
          name: `${categoryData.name} Design`,
          position,
          colorSet,
          sizeSet,
          border,
          shadow,
          opacity,
          capacity,
          status,
          tags,
          emojiIcon,
        },
      });

      await prisma.chummeCategory.create({
        data: {
          id: categoryData.id,
          name: categoryData.name,
          isAd: categoryData.isAd ?? false,
          keyPassword: categoryData.keyPassword || null,
          chummeTraits: (categoryData.chummeTraits as any) || "NONE",
          chummeVisualDesignId: design.id,
        },
      });
    }
  }

  console.log(`✅ Seeded ${communitiesData.length} Countries.`);

  // 3. Seed Other Categories
  console.log("🌱 Seeding General Categories...");
  for (const category of categoriesData) {
    const existing = await prisma.chummeCategory.findUnique({
      where: { id: category.id },
    });

    if (existing) {
      await prisma.chummeCategory.update({
        where: { id: category.id },
        data: {
          name: category.name,
          keyPassword: category.keyPassword,
          chummeTraits: (category.chummeTraits as any) || "NONE",
          note: category.note,
          discoveryKeywords: (category as any).discoveryKeywords || [],
          channelId: (category as any).channelId || [],
        },
      });
    } else {
      await prisma.chummeCategory.create({
        data: {
          id: category.id,
          name: category.name,
          keyPassword: category.keyPassword,
          chummeTraits: (category.chummeTraits as any) || "NONE",
          note: category.note,
          discoveryKeywords: (category as any).discoveryKeywords || [],
          channelId: (category as any).channelId || [],
        },
      });
    }

    // Seed Subcategories
    if (category.subcategories && category.subcategories.length > 0) {
      for (const sub of category.subcategories) {
        await prisma.chummeSubCategory.upsert({
          where: { id: sub.id },
          update: {
            name: sub.name,
            note: sub.note,
            chummeCategoryId: category.id,
            chummeTraits: (category.chummeTraits as any) || "NONE",
            ownerId: systemUser.id,
            discoveryKeywords: (sub as any).discoveryKeywords || [],
            channelId: (sub as any).channelId || [],
          },
          create: {
            id: sub.id,
            name: sub.name,
            note: sub.note,
            chummeCategoryId: category.id,
            chummeTraits: (category.chummeTraits as any) || "NONE",
            ownerId: systemUser.id,
            discoveryKeywords: (sub as any).discoveryKeywords || [],
            channelId: (sub as any).channelId || [],
          },
        });

        // Seed Topic Categories (Third level)
        if (sub.topiccategories && sub.topiccategories.length > 0) {
          for (const topic of sub.topiccategories) {
            await prisma.chummeTopicCategory.upsert({
              where: { id: topic.id },
              update: {
                name: topic.name,
                note: topic.note,
                chummeSubCategoryId: sub.id,
                chummeTraits: (category.chummeTraits as any) || "NONE",
                discoveryKeywords: (topic as any).discoveryKeywords || [],
                channelId: (topic as any).channelId || [],
              },
              create: {
                id: topic.id,
                name: topic.name,
                note: topic.note,
                chummeSubCategoryId: sub.id,
                chummeTraits: (category.chummeTraits as any) || "NONE",
                discoveryKeywords: (topic as any).discoveryKeywords || [],
                channelId: (topic as any).channelId || [],
              },
            });
          }
          console.log(
            `✅ Seeded ${sub.topiccategories.length} topic categories for subcategory ${sub.name}`,
          );
        }
      }
      console.log(
        `✅ Seeded ${category.subcategories.length} subcategories for ${category.name}`,
      );
    }
  }

  console.log(`✅ Seeded ${categoriesData.length} General Categories.`);
}
