import { PrismaClient } from "@prisma/client";

export const seedSocialIngestionSchedules = async (prisma: PrismaClient) => {
  console.log("🌱 Seeding Social Ingestion Schedules (Setting all to MANUAL)...");

  // 1. Get ALL ingestion targets
  const targets = await prisma.socialIngestionTarget.findMany();

  let seededCount = 0;

  for (const target of targets) {
    // 2. Create or Update a MANUAL schedule for each target
    // This ensures that even if a record existed, it becomes MANUAL
    await prisma.socialIngestionSchedule.upsert({
      where: {
          // We don't have a unique constraint on targetId alone, 
          // but we can find the first one or create a new one.
          // Since the @@unique is missing, we use findFirst strategy inside upsert is not straightforward.
          // However, based on schema, we have @@index([socialIngestionTargetId]).
          // To be safe, we'll check existence first.
          id: (await prisma.socialIngestionSchedule.findFirst({
            where: { socialIngestionTargetId: target.id }
          }))?.id || "00000000-0000-0000-0000-000000000000"
      },
      update: {
        mode: "MANUAL",
        isActive: true,
      },
      create: {
        socialIngestionTargetId: target.id,
        mode: "MANUAL",
        isActive: true,
      },
    });
    seededCount++;
  }

  console.log(`✅ Set ${seededCount} ingestion targets to MANUAL mode.`);
}
