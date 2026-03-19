import { PrismaClient } from "@prisma/client";

export async function seedSystemSettings(prisma: PrismaClient) {
  console.log("🌱 Seeding System Settings...");

  const defaultSettings = [
    {
      key: "YOUTUBE_SCHEDULER",
      value: "24",
      name: "YouTube Ingestion Scheduler",
      description: "Controls automated YouTube target crawling schedule",
      isScheduled: false,
      order: 1,
    },
    {
      key: "TIKTOK_SCHEDULER",
      value: "24",
      name: "TikTok Ingestion Scheduler",
      description: "Controls automated TikTok target crawling schedule",
      isScheduled: false,
      order: 2,
    },
    {
      key: "INSTAGRAM_SCHEDULER",
      value: "24",
      name: "Instagram Ingestion Scheduler",
      description: "Controls automated Instagram target crawling schedule",
      isScheduled: false,
      order: 3,
    },
  ];

  for (const setting of defaultSettings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: {}, // keep existing values if present
      create: setting,
    });
  }

  console.log("✅ Seeded System Settings");
}
