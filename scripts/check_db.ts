import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const cats = await prisma.chummeCategory.findMany({
    include: { chummeSubCategories: true }
  });
  console.log(`\n=== TOTAL DB CATEGORIES: ${cats.length} ===`);
  cats.forEach(c => {
    console.log(`\nCategory: "${c.name}" (ID: ${c.id})`);
    console.log(`  targetCountries: ${JSON.stringify(c.targetCountries)}`);
    console.log(`  Subcategories (${c.chummeSubCategories.length}):`, c.chummeSubCategories.map(s => `"${s.name}" (ID: ${s.id})`).join(', ') || 'NONE');
  });
  await prisma.$disconnect();
}

main().catch(console.error);
