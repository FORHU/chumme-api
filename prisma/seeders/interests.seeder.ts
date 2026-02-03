import { PrismaClient } from "@prisma/client";

export async function seedInterests(prisma: PrismaClient) {
  console.log("🌱 Seeding Interests...");
  const interests = await prisma.interest.createMany({
    data: [
      {
        name: "KPOP",
        description: "Korean Pop music and culture",
        icon: "🎵",
      },
      {
        name: "Dance",
        description: "Choreography and dance performances",
        icon: "💃",
      },
      {
        name: "Music",
        description: "General music appreciation",
        icon: "🎶",
      },
      {
        name: "Fashion",
        description: "Style, outfits, and fashion trends",
        icon: "👗",
      },
      {
        name: "Beauty",
        description: "Makeup, skincare, and beauty tutorials",
        icon: "💄",
      },
    ],
    skipDuplicates: true,
  });
  console.log(`✅ Seeded ${interests.count} interests`);
}
