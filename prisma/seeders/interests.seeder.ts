import { PrismaClient } from "@prisma/client";

export async function seedInterests(prisma: PrismaClient) {
  console.log("🌱 Seeding Interests...");

  const interestsData = [
    {
      id: "00ae8666-710e-4e7e-915f-ef1ec9d32120",
      name: "KPOP",
      description: "Korean Pop music and culture",
      icon: "🎵",
    },
    {
      id: "bef38de9-880b-48a0-8aac-e3c8f868499c",
      name: "Dance",
      description: "Choreography and dance performances",
      icon: "💃",
    },
    {
      id: "a8de2eb5-5ffe-4e1f-91a5-9bc0064e48f7",
      name: "Music",
      description: "General music appreciation",
      icon: "🎶",
    },
    {
      id: "6b17e8be-9250-411c-9579-b3e8cd81f28e",
      name: "Fashion",
      description: "Style, outfits, and fashion trends",
      icon: "👗",
    },
    {
      id: "b5db92a1-cfb3-4f94-af98-389af77ef4a2",
      name: "Beauty",
      description: "Makeup, skincare, and beauty tutorials",
      icon: "💄",
    },
  ];

  for (const interest of interestsData) {
    await prisma.interest.upsert({
      where: { id: interest.id },
      update: interest,
      create: interest,
    });
  }

  console.log(`✅ Seeded/Updated ${interestsData.length} interests`);
}
