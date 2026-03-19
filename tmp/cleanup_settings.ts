import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Cleaning up old deprecated system settings...");
  
  // Delete legacy keys
  const legacyKeys = [
    "AUTO_SCHEDULER_ENABLED", 
    "CHAIN_ACTIVE", 
    "CRAWL_CHAIN", 
    "CURRENT_CHAIN_STEP"
  ];
  
  for (const key of legacyKeys) {
    try {
      await prisma.systemSetting.delete({ where: { key } });
      console.log(`Deleted deprecated key: ${key}`);
    } catch (e) {
      // Ignore if doesn't exist
    }
  }

  console.log("🌱 Ensuring new platform-specific settings exist...");
  
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
      update: {}, // Keep if they exist, else create
      create: setting,
    });
    console.log(`Ensured key exists: ${setting.key}`);
  }
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
