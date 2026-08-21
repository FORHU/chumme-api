import { PrismaClient } from "@prisma/client";

/**
 * Attach a visual design to a category, creating one when the category has none.
 *
 * Categories seeded before the design fields existed have a null
 * chummeVisualDesignId — updating in place would skip them forever and leave the
 * bubble to fall back on canvas defaults, so backfill instead.
 */
async function upsertCategoryDesign(
  prisma: PrismaClient,
  params: {
    categoryId: string;
    categoryName: string;
    existingDesignId: string | null;
    design: Record<string, any>;
  },
) {
  const { categoryId, categoryName, existingDesignId, design } = params;

  if (existingDesignId) {
    await prisma.chummeCategoryDesign.update({
      where: { id: existingDesignId },
      data: design,
    });
    return;
  }

  const created = await prisma.chummeCategoryDesign.create({
    data: { name: `${categoryName} Design`, ...design },
  });

  await prisma.chummeCategory.update({
    where: { id: categoryId },
    data: { chummeVisualDesignId: created.id },
  });

  console.log(`🎨 Backfilled missing visual design for "${categoryName}"`);
}

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
      name: "Manila, Philippines",
      colorSet: { primary: "#9d30ff", secondary: "#c084fc", border: "#9d30ff" },
      position: { x: 120.9842, y: 14.5995 }, // Longitude, Latitude
      sizeSet: { radius: 6, maxRadius: 120 },
      isAd: false,
      border: { width: 3, color: "#000", style: "solid" },
      shadow: { x: 0, y: 4, blur: 12, color: "#888" },
      opacity: 1,
      capacity: 1000000,
      status: "active",
      tags: ["Philippines", "Asia"],
      emojiIcon: "🇵🇭",
      keyPassword: null,
      chummeTraits: "COMMUNITIES",
      targetCountries: ["PH"],
      subcategories: [
        { id: "f2d7e7c3-5c64-4f6c-9c9a-7a8f3f4e0001", name: "Manila Music", note: "Local OPM and pop hits." },
      ],
    },
    {
      id: "96b3c9bf-1077-46aa-b37d-f16f28486936",
      name: "Tokyo, Japan",
      colorSet: { primary: "#ef4444", secondary: "#f87171", border: "#ef4444" },
      position: { x: 139.6503, y: 35.6762 }, // Longitude, Latitude
      sizeSet: { radius: 2, maxRadius: 80 },
      isAd: false,
      border: { width: 2, color: "#000", style: "solid" },
      shadow: { x: 0, y: 2, blur: 6, color: "#aaa" },
      opacity: 0.9,
      capacity: 2000000,
      status: "active",
      tags: ["Japan", "Asia"],
      emojiIcon: "🇯🇵",
      keyPassword: null,
      chummeTraits: "COMMUNITIES",
      targetCountries: ["JP"],
      subcategories: [
        { id: "96b3c9bf-1077-46aa-b37d-f16f28480001", name: "Tokyo City Pop", note: "Classic and modern city pop." },
      ],
    },
    {
      id: "721b6d19-4b35-43ea-bb7c-2b528a47b62a",
      name: "New York, USA",
      colorSet: { primary: "#3b82f6", secondary: "#60a5fa", border: "#3b82f6" },
      position: { x: -74.0060, y: 40.7128 }, // Longitude, Latitude
      sizeSet: { radius: 2, maxRadius: 80 },
      isAd: false,
      border: { width: 2, color: "#000", style: "solid" },
      shadow: { x: 0, y: 2, blur: 6, color: "#aaa" },
      opacity: 0.9,
      capacity: 1500000,
      status: "active",
      tags: ["USA", "North America"],
      emojiIcon: "🇺🇸",
      keyPassword: null,
      chummeTraits: "COMMUNITIES",
      targetCountries: ["US"],
      subcategories: [
        { id: "721b6d19-4b35-43ea-bb7c-2b528a470001", name: "NY Hip Hop", note: "East coast rap and hip hop." },
      ],
    },
    {
      id: "c8413b5e-9e77-4682-a0d4-d50d75c9d2f8",
      name: "London, UK",
      colorSet: { primary: "#10b981", secondary: "#34d399", border: "#10b981" },
      position: { x: -0.1276, y: 51.5072 }, // Longitude, Latitude
      sizeSet: { radius: 2, maxRadius: 80 },
      isAd: false,
      border: { width: 2, color: "#000", style: "solid" },
      shadow: { x: 0, y: 2, blur: 6, color: "#aaa" },
      opacity: 0.9,
      capacity: 800000,
      status: "active",
      tags: ["UK", "Europe"],
      emojiIcon: "🇬🇧",
      keyPassword: null,
      chummeTraits: "COMMUNITIES",
      targetCountries: ["GB"],
      subcategories: [
        { id: "c8413b5e-9e77-4682-a0d4-d50d75c90001", name: "UK Drill", note: "London drill and grime scene." },
      ],
    },
  ];

  const categoriesData = [
    {
      id: "7a1c7d6c-2f45-4a9d-9c9e-5a6e7b3c11f2",
      name: "Music",
      chummeTraits: "ENTERTAINMENT",
      note: "Songs, artists, bands, albums, concerts, and music culture.",
      colorSet: { primary: "#ec4899", secondary: "#f9a8d4", border: "#ec4899" },
      position: { x: 30, y: 40 },
      sizeSet: { radius: 3, maxRadius: 90 },
      border: { width: 2, color: "#000", style: "solid" },
      shadow: { x: 0, y: 2, blur: 6, color: "#aaa" },
      opacity: 0.9,
      capacity: 5000000,
      status: "active",
      tags: ["Music", "Entertainment", "Artists"],
      emojiIcon: "🎵",
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
      subcategories,
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
          targetCountries: categoryData.targetCountries || [],
        },
      });

      await upsertCategoryDesign(prisma, {
        categoryId: categoryData.id,
        categoryName: categoryData.name,
        existingDesignId: existingCategory.chummeVisualDesignId,
        design: {
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
          targetCountries: categoryData.targetCountries || [],
          chummeVisualDesignId: design.id,
        },
      });
    }

    // Seed subcategories for this country category
    if (subcategories && subcategories.length > 0) {
      for (const sub of subcategories) {
        await prisma.chummeSubCategory.upsert({
          where: { id: sub.id },
          update: {
            name: sub.name,
            note: sub.note,
            chummeCategoryId: categoryData.id,
            chummeTraits: (categoryData.chummeTraits as any) || "NONE",
            ownerId: systemUser.id,
          },
          create: {
            id: sub.id,
            name: sub.name,
            note: sub.note,
            chummeCategoryId: categoryData.id,
            chummeTraits: (categoryData.chummeTraits as any) || "NONE",
            ownerId: systemUser.id,
          },
        });
      }
      console.log(`✅ Seeded ${subcategories.length} subcategories for ${categoryData.name}`);
    }
  }

  // Ensure non-country categories do not mistakenly claim targetCountries like ["PH"]
  await prisma.chummeCategory.updateMany({
    where: {
      id: { notIn: communitiesData.map((c) => c.id) },
    },
    data: {
      targetCountries: [],
    },
  });

  console.log(`✅ Seeded ${communitiesData.length} Countries.`);

  // 3. Seed Other Categories
  console.log("🌱 Seeding General Categories...");
  for (const category of categoriesData) {
    const design = {
      position: category.position,
      colorSet: category.colorSet,
      sizeSet: category.sizeSet,
      border: category.border,
      shadow: category.shadow,
      opacity: category.opacity,
      capacity: category.capacity,
      status: category.status,
      tags: category.tags,
      emojiIcon: category.emojiIcon,
    };

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

      await upsertCategoryDesign(prisma, {
        categoryId: category.id,
        categoryName: category.name,
        existingDesignId: existing.chummeVisualDesignId,
        design,
      });
    } else {
      const createdDesign = await prisma.chummeCategoryDesign.create({
        data: { name: `${category.name} Design`, ...design },
      });

      await prisma.chummeCategory.create({
        data: {
          id: category.id,
          name: category.name,
          keyPassword: category.keyPassword,
          chummeTraits: (category.chummeTraits as any) || "NONE",
          note: category.note,
          discoveryKeywords: (category as any).discoveryKeywords || [],
          channelId: (category as any).channelId || [],
          chummeVisualDesignId: createdDesign.id,
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
