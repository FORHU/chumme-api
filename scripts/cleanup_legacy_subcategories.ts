import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Cleaning up legacy non-UUID subcategory records...');
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const allSubs = await prisma.chummeSubCategory.findMany();
  
  let deletedCount = 0;
  for (const sub of allSubs) {
    if (!uuidRegex.test(sub.id)) {
      try {
        await prisma.roomMessage.deleteMany({ where: { chummeSubCategoryId: sub.id } });
        await prisma.roomUserChat.deleteMany({ where: { chummeSubCategoryId: sub.id } });
        await prisma.chummeTopicCategory.deleteMany({ where: { chummeSubCategoryId: sub.id } });
        
        await prisma.chummeSubCategory.delete({ where: { id: sub.id } });
        console.log(`   - Deleted legacy subcategory: "${sub.name}" (${sub.id})`);
        deletedCount++;
      } catch (err) {
        console.warn(`   ⚠️ Could not delete subcategory ${sub.id}:`, err);
      }
    }
  }
  
  console.log(`✅ Cleanup complete. Deleted ${deletedCount} legacy non-UUID subcategories.`);
  await prisma.$disconnect();
}

main().catch(console.error);
