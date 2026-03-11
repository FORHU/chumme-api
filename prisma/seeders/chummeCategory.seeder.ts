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
  const countriesData = [
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
          name: "Pop",
          note: "Popular music from global artists.",
          topiccategories: [
            {
              id: "0c2e1f4a-6e57-4a4e-9d1e-32e1d9f7a111",
              name: "Pop Artists",
              note: "Famous pop singers and bands.",
            },
            {
              id: "cfa92b76-31c1-4f0d-82a2-d98a4e72c112",
              name: "Pop Songs",
              note: "Trending and classic pop songs.",
            },
            {
              id: "1aab8a22-4b66-4f5f-9e51-6f2f9f93c113",
              name: "Pop Albums",
              note: "Album releases and rankings.",
            },
            {
              id: "e7b5a4f2-53b5-4b6f-a6e7-3e8a9f20c114",
              name: "Pop Charts",
              note: "Top pop music charts.",
            },
          ],
        },
        {
          id: "0d5f3c77-18c4-4f7c-8f9a-8a7d1b2c3d4e",
          name: "Rock",
          note: "Rock bands, guitar music, and live performances.",
          topiccategories: [
            {
              id: "8d94a5f1-6a22-4c8d-9b21-4c1f9d01c121",
              name: "Rock Bands",
              note: "Famous rock groups.",
            },
            {
              id: "a4d6f9c7-0c1a-4e92-b3a1-98f5c5e1c122",
              name: "Classic Rock",
              note: "Legendary rock songs and artists.",
            },
            {
              id: "2b0a1a5e-5c1b-4b3d-a7b9-01f1d8f2c123",
              name: "Rock Concerts",
              note: "Live rock performances.",
            },
            {
              id: "c93d6b87-73a3-4c0c-82d1-bf1f9a12c124",
              name: "Guitar Solos",
              note: "Iconic rock guitar moments.",
            },
          ],
        },
      ],
    },
    {
      id: "b7a90c8f-1a9e-4e87-b7d5-97c3e2b3a222",
      name: "Movies",
      chummeTraits: "ENTERTAINMENT",
      note: "Films, cinema releases, movie reviews, actors, and directors.",
      subcategories: [
        {
          id: "6c4b9d4e-83c4-4d92-9b19-7a2e1d3f4a5b",
          name: "Action",
          note: "High-energy films with fights and adventure.",
          topiccategories: [
            {
              id: "2b17e90c-9bfa-4b32-a2c2-21d0a8c2a201",
              name: "Superhero Movies",
              note: "Marvel and DC action films.",
            },
            {
              id: "c2fbc92a-0e91-4e49-8b98-1f72f4e4a202",
              name: "Car Chase Movies",
              note: "Fast-paced action scenes.",
            },
            {
              id: "98c1a2a0-d8f1-4cbb-b5c7-3d90e8b2a203",
              name: "Martial Arts Films",
              note: "Combat and fighting movies.",
            },
          ],
        },
        {
          id: "9c6a7e5d-1f4a-4c90-b9e3-8e2b1d3f4c5d",
          name: "Horror",
          note: "Scary movies and supernatural thrillers.",
          topiccategories: [
            {
              id: "e92c10f4-3d21-44f8-b17d-1f01a9d8b211",
              name: "Ghost Movies",
              note: "Supernatural haunting films.",
            },
            {
              id: "74f9b7e1-21f7-4c31-8c8e-9a9d8b2a2212",
              name: "Zombie Movies",
              note: "Apocalypse and zombie stories.",
            },
            {
              id: "1b82a0c7-99c7-4c48-87e2-0e1e91a0b213",
              name: "Psychological Horror",
              note: "Mind-bending horror films.",
            },
          ],
        },
      ],
    },
    {
      id: "a5c9c3d8-4b33-4c92-9c6b-1a0d9e7b3333",
      name: "Basketball",
      chummeTraits: "ENTERTAINMENT",
      note: "Basketball games, leagues, players, highlights, and training.",
      subcategories: [
        {
          id: "3e5b8d1c-3d4e-49c8-bc19-2a1e4f6d7b8c",
          name: "NBA",
          note: "National Basketball Association league updates.",
          topiccategories: [
            {
              id: "4a8e9c77-64d2-4c1f-b4e1-29d5f9c3b301",
              name: "NBA Players",
              note: "Famous basketball athletes.",
            },
            {
              id: "d5c7b93f-7f93-4d1b-90e3-7c1d2e4f3302",
              name: "NBA Highlights",
              note: "Best dunks and plays.",
            },
            {
              id: "0b1e2f9a-bc8f-4d4b-86f7-5a8c7c6b3303",
              name: "NBA Trades",
              note: "Player transfers and rumors.",
            },
          ],
        },
        {
          id: "7b2e3c4d-9f8e-41c1-bc2a-8e9d2a3f4b5c",
          name: "Street Basketball",
          note: "Pickup games and streetball culture.",
          topiccategories: [
            {
              id: "f9c0b8c4-1f6c-48a2-a09b-73e4d2f8b311",
              name: "Streetball Tricks",
              note: "Creative basketball moves.",
            },
            {
              id: "1f7d3a4c-5e7c-41a9-b7e2-8d7e1a9b3312",
              name: "Local Courts",
              note: "Community basketball courts.",
            },
            {
              id: "ab9fbc34-23e7-4cbb-8d1b-0e1c7d8a3313",
              name: "Street Tournaments",
              note: "Neighborhood competitions.",
            },
          ],
        },
      ],
    },
    {
      id: "c5a3d8e7-6d4c-4f3b-a2e1-9b1f3d7a4444",
      name: "Volleyball",
      chummeTraits: "ENTERTAINMENT",
      note: "Volleyball matches, teams, tournaments, and player skills.",
      subcategories: [
        {
          id: "ab7e1c2d-4f3a-49c8-bd6e-3e1c2b4f5a6d",
          name: "Indoor Volleyball",
          note: "Traditional indoor volleyball competitions.",
          topiccategories: [
            {
              id: "ce4f2a98-5a33-4b3c-9c2a-4d9f1a7e4411",
              name: "Pro Leagues",
              note: "Professional volleyball competitions.",
            },
            {
              id: "2c6e8a10-0e8f-4b6e-8e4b-9e2d8f7a4412",
              name: "Team Strategies",
              note: "Team formations and tactics.",
            },
            {
              id: "74b8d8a4-5b7d-42b0-9f2c-6a3d2f9e4413",
              name: "Player Positions",
              note: "Setter, libero, spiker roles.",
            },
          ],
        },
        {
          id: "702b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d",
          name: "Beach Volleyball",
          note: "Volleyball played on sand courts.",
          topiccategories: [
            {
              id: "c4a9f8c1-7a2e-4e52-b1c4-6c4d7b9a12f1",
              name: "Beach Tournaments",
              note: "International beach volleyball competitions.",
            },
            {
              id: "9f3e2b77-1f4c-4c9d-8d52-2b6f1f9c0e44",
              name: "Beach Players",
              note: "Top beach volleyball athletes.",
            },
            {
              id: "7b1a0c54-3f9d-45aa-a5a7-58e8d9f2c6b2",
              name: "Beach Techniques",
              note: "Skills used in sand volleyball.",
            },
          ],
        },
      ],
    },
  ] as any[];

  for (const country of countriesData) {
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
        await prisma.chummeVisualDesign.update({
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
      const design = await prisma.chummeVisualDesign.create({
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

  console.log(`✅ Seeded ${countriesData.length} Countries.`);

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
          },
          create: {
            id: sub.id,
            name: sub.name,
            note: sub.note,
            chummeCategoryId: category.id,
            chummeTraits: (category.chummeTraits as any) || "NONE",
            ownerId: systemUser.id,
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
              },
              create: {
                id: topic.id,
                name: topic.name,
                note: topic.note,
                chummeSubCategoryId: sub.id,
                chummeTraits: (category.chummeTraits as any) || "NONE",
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
