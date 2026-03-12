
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const sumoDev = await prisma.user.findUnique({
    where: { email: "sumoaccnt@gmail.com" },
    include: {
      socialUserDiscoveries: {
        include: {
          chummeCategories: true,
          chummeSubCategories: true,
          chummeTopicCategories: true,
        },
      },
    },
  });

  if (!sumoDev || !sumoDev.socialUserDiscoveries) {
    console.log("❌ sumoDev or discovery record not found.");
    return;
  }

  const discovery = sumoDev.socialUserDiscoveries;
  console.log(`\n🔍 Verification results for ${sumoDev.username} (${sumoDev.id}):`);
  console.log(`- Discovery ID: ${discovery.id}`);
  console.log(`- Connected Categories: ${discovery.chummeCategories.length}`);
  console.log(`- Connected Sub-Categories: ${discovery.chummeSubCategories.length}`);
  console.log(`- Connected Topic-Categories: ${discovery.chummeTopicCategories.length}`);

  discovery.chummeCategories.forEach(c => console.log(`  • Category: ${c.name}`));
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
