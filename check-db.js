
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const categories = await prisma.roomCategory.count();
    const subCategories = await prisma.roomSubCategory.count();
    const rooms = await prisma.room.count();
    
    console.log('--- DB STATS ---');
    console.log(`Categories: ${categories}`);
    console.log(`SubCategories: ${subCategories}`);
    console.log(`Rooms: ${rooms}`);
    
    const sampleCats = await prisma.roomCategory.findMany({ take: 5 });
    console.log('Sample Categories:', JSON.stringify(sampleCats, null, 2));
    
    const sampleSubs = await prisma.roomSubCategory.findMany({ take: 5, include: { roomCategory: true } });
    console.log('Sample SubCategories:', JSON.stringify(sampleSubs, null, 2));

  } catch (e) {
    console.error('ERROR:', e);
  } finally {
    await prisma.$disconnect();
  }
}

check();
