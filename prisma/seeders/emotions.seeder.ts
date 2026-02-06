import { PrismaClient } from "@prisma/client";

export async function seedEmotions(prisma: PrismaClient) {
  console.log("🌱 Seeding Emotions...");

  const emotionsData = [
    {
      id: "d9a42342-7430-4c47-a0cf-4b440085c96c",
      name: "Happy",
      description: "Feeling joyful and upbeat",
      icon: "😊",
    },
    {
      id: "09423799-77ca-4128-81da-cd7cd92ea2f9",
      name: "Sad",
      description: "Feeling down or melancholic",
      icon: "😢",
    },
    {
      id: "70e9d26a-5f2b-4938-87a9-8968c19c2518",
      name: "Excited",
      description: "Feeling energized and enthusiastic",
      icon: "🤩",
    },
    {
      id: "3c226127-76a2-4830-bd3e-25309d5d33ba",
      name: "Calm",
      description: "Feeling peaceful and relaxed",
      icon: "😌",
    },
    {
      id: "8a411d4d-33b5-4c29-b45b-0779783dc0a3",
      name: "Tired",
      description: "Feeling exhausted or low energy",
      icon: "😴",
    },
    {
      id: "076a1744-1f71-401e-acae-68e880e79517",
      name: "Anxious",
      description: "Feeling worried or stressed",
      icon: "😰",
    },
    {
      id: "e7688bb4-5bd8-424e-bc47-90286be7de01",
      name: "Bored",
      description: "Feeling uninterested or restless",
      icon: "😑",
    },
    {
      id: "dd78edf8-d059-4340-bf06-1a15ed9ae2e7",
      name: "content",
      description: "Auto-generated from Spotify emotion analysis",
      icon: null,
    },
    {
      id: "a99195cf-4b1a-457b-bc81-7792493fc99d",
      name: "danceable",
      description: "Auto-generated from Spotify emotion analysis",
      icon: null,
    },
    {
      id: "b1725a31-8bf7-40f6-9e16-15b1716ee29c",
      name: "upbeat",
      description: "Auto-generated from Spotify emotion analysis",
      icon: null,
    },
    {
      id: "497ac1e6-3d10-43db-9692-8414e9b578ca",
      name: "neutral",
      description: "Auto-generated from Spotify emotion analysis",
      icon: null,
    },
    {
      id: "1352cbd4-b13d-4a33-bb11-b99bc760d9e7",
      name: "energetic",
      description: "Auto-generated from Spotify emotion analysis",
      icon: null,
    },
    {
      id: "eff4f67a-c111-49fd-8a92-8325e11a57ef",
      name: "acoustic",
      description: "Auto-generated from Spotify emotion analysis",
      icon: null,
    },
    {
      id: "e3a01374-248a-466a-9705-ded02212b933",
      name: "slow",
      description: "Auto-generated from Spotify emotion analysis",
      icon: null,
    },
    {
      id: "3f3fa8a8-22d4-4037-aac6-0dc21349df6a",
      name: "popular",
      description: "Auto-generated from Spotify emotion analysis",
      icon: null,
    },
    {
      id: "09f69cf5-5b6c-4830-b4c5-ff5a077051da",
      name: "angry",
      description: "Auto-generated from Spotify emotion analysis",
      icon: null,
    },
  ];

  for (const emotion of emotionsData) {
    await prisma.emotion.upsert({
      where: { id: emotion.id },
      update: emotion,
      create: emotion,
    });
  }

  console.log(`✅ Seeded/Updated ${emotionsData.length} emotions`);
}
