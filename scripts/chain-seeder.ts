import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Sequential Chain Configurations...");

  // 1. Set Active Status
  await prisma.systemSetting.upsert({
    where: { key: "CHAIN_ACTIVE" },
    update: { value: "true" },
    create: { key: "CHAIN_ACTIVE", value: "true" },
  });

  // 2. Set Chain List
  await prisma.systemSetting.upsert({
    where: { key: "CRAWL_CHAIN" },
    update: { value: JSON.stringify(["YOUTUBE", "INSTAGRAM", "TIKTOK"]) },
    create: { key: "CRAWL_CHAIN", value: JSON.stringify(["YOUTUBE", "INSTAGRAM", "TIKTOK"]) },
  });

  // 3. Set Current Step
  await prisma.systemSetting.upsert({
    where: { key: "CURRENT_CHAIN_STEP" },
    update: { value: "YOUTUBE" },
    create: { key: "CURRENT_CHAIN_STEP", value: "YOUTUBE" },
  });

  // 4. Ensure Scheduler Enabled
  await prisma.systemSetting.upsert({
    where: { key: "AUTO_SCHEDULER_ENABLED" },
    update: { value: "true" },
    create: { key: "AUTO_SCHEDULER_ENABLED", value: "true" },
  });

  console.log("✅ Sequential Chain Configs seeded correctly!");
  console.log("CRAWL_CHAIN: ['YOUTUBE', 'INSTAGRAM', 'TIKTOK']");
  console.log("CURRENT_CHAIN_STEP: YOUTUBE");
  console.log("CHAIN_ACTIVE: true");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
