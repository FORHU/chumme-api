import { PrismaClient } from '@prisma/client';
import { createClient } from 'redis';

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const songTitle = args[0];

  if (!songTitle) {
    console.error('❌ Please provide a song title to delete.');
    console.log('Usage: npx ts-node scripts/delete_song.ts "Song Title"');
    process.exit(1);
  }

  console.log(`\n🔍 Looking for songs with title: "${songTitle}"...`);
  
  const songs = await prisma.music.findMany({
    where: { title: { contains: songTitle } }
  });

  if (songs.length === 0) {
    console.log('✅ No songs found matching that title. Nothing to delete.');
  } else {
    console.log(`🗑️ Found ${songs.length} matching songs. Deleting...`);
    
    for (const song of songs) {
      await prisma.music.delete({ where: { id: song.id } });
      console.log(`   - Deleted: ${song.title} (${song.id})`);
    }
    
    console.log('✅ Deleted all matches from database.');
  }

  // Also flush redis cache so the deleted songs disappear immediately from the app
  console.log('🧹 Flushing Redis cache...');
  try {
    const redis = createClient();
    await redis.connect();
    await redis.flushAll();
    console.log('✅ Redis cache flushed!');
    await redis.disconnect();
  } catch (error) {
    console.warn('⚠️ Could not flush Redis cache automatically. Is Redis running locally?', error);
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('❌ Error deleting song:', e);
  await prisma.$disconnect();
  process.exit(1);
});
