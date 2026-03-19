import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const autoScheduler = await prisma.systemSetting.findUnique({
    where: { key: "AUTO_SCHEDULER_ENABLED" },
  });
  
  const chainActive = await prisma.systemSetting.findUnique({
    where: { key: "CHAIN_ACTIVE" },
  });

  console.log("AUTO_SCHEDULER_ENABLED:", autoScheduler?.value || "NOT SET (defaults false)");
  console.log("CHAIN_ACTIVE:", chainActive?.value || "NOT SET (defaults false)");
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
