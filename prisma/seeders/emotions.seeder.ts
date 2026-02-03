import { PrismaClient } from "@prisma/client";

export async function seedEmotions(prisma: PrismaClient) {
  console.log("🌱 Seeding Emotions...");
  const emotions = await prisma.emotion.createMany({
    data: [
      {
        name: "Happy",
        description: "Feeling joyful and upbeat",
        icon: "😊",
      },
      {
        name: "Sad",
        description: "Feeling down or melancholic",
        icon: "😢",
      },
      {
        name: "Excited",
        description: "Feeling energized and enthusiastic",
        icon: "🤩",
      },
      {
        name: "Calm",
        description: "Feeling peaceful and relaxed",
        icon: "😌",
      },
      {
        name: "Tired",
        description: "Feeling exhausted or low energy",
        icon: "😴",
      },
      {
        name: "Anxious",
        description: "Feeling worried or stressed",
        icon: "😰",
      },
      {
        name: "Bored",
        description: "Feeling uninterested or restless",
        icon: "😑",
      },
    ],
    skipDuplicates: true,
  });
  console.log(`✅ Seeded ${emotions.count} emotions`);
}
