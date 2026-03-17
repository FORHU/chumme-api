import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.socialFeedItem.count();
  console.log(`Found ${count} items in SocialFeedItem`);
  
  const items = await prisma.socialFeedItem.findMany({
    take: 3,
    orderBy: { createdAt: 'desc' }
  });

  console.log(JSON.stringify(items, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
