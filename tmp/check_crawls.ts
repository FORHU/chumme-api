import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const latestItems = await prisma.socialFeedItem.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true,
      title: true,
      socialPlatform: true,
      createdAt: true,
    }
  });

  console.log("Latest 5 SocialFeedItems:");
  console.log(JSON.stringify(latestItems, null, 2));

  const targets = await prisma.socialIngestionTarget.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 5,
    select: {
      platform: true,
      externalHandle: true,
      nextPageToken: true,
      quotaLimitHitAt: true,
      updatedAt: true,
    }
  });

  console.log("\nRecent Ingestion Targets Activity:");
  console.log(JSON.stringify(targets, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
