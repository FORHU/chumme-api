import { PrismaClient } from "@prisma/client";

/**
 * Seeds SocialUserDiscovery for specific users
 */
export async function seedSocialUserDiscovery(prisma: PrismaClient) {
  console.log("🌱 Seeding SocialUserDiscovery...");

  // Find the sumoDev user
  const sumoDev = await prisma.user.findUnique({
    where: { email: "sumoaccnt@gmail.com" },
  });

  if (!sumoDev) {
    console.log(
      "⚠️ User sumoDev (sumoaccnt@gmail.com) not found. Skipping SocialUserDiscovery seeding.",
    );
    return;
  }

  // 1. All Categories from categoriesData
  const musicCategoryId = "7a1c7d6c-2f45-4a9d-9c9e-5a6e7b3c11f2";
  const basketballCategoryId = "a5c9c3d8-4b33-4c92-9c6b-1a0d9e7b3333";
  const volleyballCategoryId = "c5a3d8e7-6d4c-4f3b-a2e1-9b1f3d7a4444";
  const gamingCategoryId = "d3e4f5a6-7b8c-4d9e-af0b-1c2d3e4f5g6h";

  const allCategoryIds = [
    musicCategoryId,
    basketballCategoryId,
    volleyballCategoryId,
    gamingCategoryId,
  ];

  // 2. All Sub-Categories
  const allSubCategoryIds = [
    "5e3f6d8b-21e1-4c79-91aa-0f1b23c3d4e5", // K-pop
    "0d5f3c77-18c4-4f7c-8f9a-8a7d1b2c3d4e", // Rock
    "3e5b8d1c-3d4e-49c8-bc19-2a1e4f6d7b8c", // NBA
    "7b2e3c4d-9f8e-41c1-bc2a-8e9d2a3f4b5c", // Street Basketball
    "ab7e1c2d-4f3a-49c8-bd6e-3e1c2b4f5a6d", // Indoor Volleyball
    "702b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d", // Beach Volleyball
    "e1f2g3h4-i5j6-k7l8-m9n0-o1p2q3r4s5t6", // League of Legends
  ];

  // 3. All Topic-Categories
  const allTopicCategoryIds = [
    // Music (K-pop)
    "0c2e1f4a-6e57-4a4e-9d1e-32e1d9f7a111", "cfa92b76-31c1-4f0d-82a2-d98a4e72c112", "1aab8a22-4b66-4f5f-9e51-6f2f9f93c113",
    "e7b5a4f2-53b5-4b6f-a6e7-3e8a9f20c114", "0c1a2d33-8c11-4c71-b1f0-6f2d1f221201", "6a3b8c01-5c4d-4c51-8e90-9c10b3f21202",
    "1c92a3f0-7e44-4d55-bc1e-0a1d332a1203", "c3a82c90-4b33-4b0c-9b99-2d8c1caa1204", "9b0d7b12-3e41-4f6b-a1d9-7c3dfe8d1205",
    "c1b3f8e1-44a5-4c01-9e73-7f1a3f0d1206", "8e9c1b77-0d13-49d3-9f10-2b7b9a1f1207", "f8e44b20-2d51-4d89-8b3a-0fbc2c7f1208",
    "3b7c81e5-ff02-4b09-bcaa-d9e2fa8b1209", "b20d9a41-7d62-4c77-a6c4-2d72f3f01210", "a18b7c5d-3d7e-4d21-b3d1-1e5a9f0c1211",
    "dd9e0e01-5a83-4e9e-9b21-3c5c7fdf1212", "0e3c5a2d-bb8c-41aa-8c6a-b1e8d5fd1213", "4f1a3a21-9a5b-4c77-81bb-99c9d2111214",
    "abcc93e1-9b3a-4d91-a4b2-5e8a8e021215", "92b7e7c4-41f7-4fbb-b81c-7b92d4f21216", "7c4d22c8-9d11-4f2b-ae88-0a77d8211217",
    "1e22e5f1-88e7-4b0f-a5b3-39d7bbcd1218", "0f31d8d9-5f6c-4c99-96a2-8e22c3af1219", "e9127d33-2f9d-4c6a-9f7c-61e4e6de1220",
    "1d7e1f0a-1b3e-4f44-80b9-9e4a2a8c1221", "7a33f4c2-0a1d-4a6d-a1d3-4d2c7c771222", "6c3e19f2-8a7c-4d51-9d66-3b2b63d81223",
    "c1a2e6c7-8b9f-4d21-8b2c-9a6b51d71224",
    // Music (Rock)
    "8d94a5f1-6a22-4c8d-9b21-4c1f9d01c121", "a4d6f9c7-0c1a-4e92-b3a1-98f5c5e1c122", "2b0a1a5e-5c1b-4b3d-a7b9-01f1d8f2c123",
    "c93d6b87-73a3-4c0c-82d1-bf1f9a12c124", "c6e4c0c7-7d1a-4c21-9c91-7b2c1a3d2001", "f2c1b9d7-8a3f-4a9e-b211-2a8b7d3c2002",
    "0c1a92d7-5c1e-4a7f-b221-1b1e7d4f2003", "d7a3c1f9-8b1d-4c6e-9a11-5c7b2d9e2004", "e7a2d1c9-1b7a-4f2b-a991-6e8b1c0f2005",
    "a3d7b1c0-7f5e-4a9c-b111-2f1c6e9d2006", "b5a8c7d1-1c2f-4a9e-b911-8d7c2e1a2007", "d1c7a8e2-5f2a-4b1c-a191-9e2d3c7a2008",
    "c2e7b1a9-6f3d-4c7e-a711-4b2e9d3c2009", "f9b7a1c2-4e6a-4c9f-b211-3c8e1d2a2010",
    // Basketball (NBA)
    "4a8e9c77-64d2-4c1f-b4e1-29d5f9c3b301", "d5c7b93f-7f93-4d1b-90e3-7c1d2e4f3302", "0b1e2f9a-bc8f-4d4b-86f7-5a8c7c6b3303",
    "a7c2e1f4-9d1b-4a9e-8f3d-3c5a1b2d3304", "b1d3e9c2-4f7b-4b1c-9a6d-1e2c5a7f3305", "c4e7a9b2-5d1f-4c2e-a7c3-9b2d1e6a3306",
    "d9a1b7c3-8e4f-4a7d-9b2c-1c3a5d6e3307", "e2a7c3d1-4b9f-4d8e-a1b7-2c3e5a6d3308", "f1c2d3a4-6e7f-4b1d-a2c3-5d6e7f8a3309",
    "a9c8b7d6-1e2f-4a3b-9c8d-7e6f5a4b3310", "b3c1d2e4-7f5a-4d8e-b9c1-2a3d5e6f3311", "c9a7b5d3-1f2e-4c8a-a9d1-3b4c5d6e3312",
    "d2e3f4a5-6b7c-4d8a-b1c2-9e7f6a5b3313", "e7d6c5b4-3a2f-4e9d-b8c1-5a6e7d8c3314",
    // Basketball (Street)
    "f9c0b8c4-1f6c-48a2-a09b-73e4d2f8b311", "1f7d3a4c-5e7c-41a9-b7e2-8d7e1a9b3312", "ab9fbc34-23e7-4cbb-8d1b-0e1c7d8a3313",
    "9b1c2d3e-7a8b-4c1d-b9f1-1c2a3d4e3401", "8a2d3c4b-1f7e-4d9a-9b3c-7e1a2f4b3402", "4c5d6e7f-2a3b-4d1c-9e8a-1f2b3c4d3403",
    "3e2f1a4b-6c7d-4a9e-8c1d-9f2b3a4c3404", "7c8d9e1a-3b4c-4d2a-8e1f-6a7b8c9d3405", "2a3b4c5d-6e7f-4d1a-b9c8-1e2f3a4b3406",
    // Volleyball (Indoor)
    "ce4f2a98-5a33-4b3c-9c2a-4d9f1a7e4411", "2c6e8a10-0e8f-4b6e-8e4b-9e2d8f7a4412", "74b8d8a4-5b7d-42b0-9f2c-6a3d2f9e4413",
    "d1e2c3f4-5b6a-4c7d-9e8f-1a2b3c4d4414", "b2c3d4e5-6f7a-4b8c-9d1e-2f3a4b5c4415", "a1b2c3d4-5e6f-4a7b-8c9d-3e4f5a6b4416",
    "c1d2e3f4-5a6b-4c7d-8e9f-4b5a6c7d4417",
    // Volleyball (Beach)
    "c4a9f8c1-7a2e-4e52-b1c4-6c4d7b9a12f1", "9f3e2b77-1f4c-4c9d-8d52-2b6f1f9c0e44", "7b1a0c54-3f9d-45aa-a5a7-58e8d9f2c6b2",
    "a1b2c3d4-5e6f-4a7b-8c9d-1f2a3b4c5d6e", "b2c3d4e5-6f7a-4b8c-9d1e-2f3a4b5c6d7f", "c3d4e5f6-7a8b-4c9d-8e1f-3a2b4c5d6e7f",
    "d4e5f6a7-8b9c-4d1e-9f2a-4b3c5d6e7f8a", "e5f6a7b8-9c0d-4e1f-8a2b-5c6d7e8f9a0b", "f6a7b8c9-0d1e-4f2a-9b3c-6d7e8f9a0b1c",
    // Gaming (LOL)
    "f1a2b3c4-d5e6-4a7b-8c9d-012345678901", "a1b2c3d4-e5f6-4a7b-8c9d-012345678902", "b1c2d3e4-f5g6-4a7b-8c9d-012345678903",
    "c1d2e3f4-g5h6-4a7b-8c9d-012345678904", "d1e2f3g4-h5i6-4a7b-8c9d-012345678905",
  ];

  // Check if categories exist before linking
  const categoriesCount = await prisma.chummeCategory.count({
    where: {
      id: { in: allCategoryIds },
    },
  });

  if (categoriesCount === 0) {
    console.log(
      "⚠️ Required categories not found. Ensure ChummeCategories (categoriesData) are seeded first.",
    );
    return;
  }

  // Upsert SocialUserDiscovery for sumoDev with ALL data
  await prisma.socialUserDiscovery.upsert({
    where: { userId: sumoDev.id },
    update: {
      chummeCategories: {
        set: allCategoryIds.map(id => ({ id })),
      },
      chummeSubCategories: {
        set: allSubCategoryIds.map(id => ({ id })),
      },
      chummeTopicCategories: {
        set: allTopicCategoryIds.map(id => ({ id })),
      },
    },
    create: {
      userId: sumoDev.id,
      chummeCategories: {
        connect: allCategoryIds.map(id => ({ id })),
      },
      chummeSubCategories: {
        connect: allSubCategoryIds.map(id => ({ id })),
      },
      chummeTopicCategories: {
        connect: allTopicCategoryIds.map(id => ({ id })),
      },
    },
  });

  console.log(
    `✅ SocialUserDiscovery seeded for sumoDev (${sumoDev.username}) based on category seed data`,
  );
}
