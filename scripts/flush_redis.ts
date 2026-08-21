import dotenv from 'dotenv';
dotenv.config();
import { createClient } from 'redis';

async function flushRedis() {
  console.log('🧹 Connecting to Redis to flush cache...');
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const redis = createClient({ url: redisUrl });

  redis.on('error', (err) => console.error('❌ Redis Error:', err));

  try {
    await redis.connect();
    await redis.flushAll();
    console.log(`✅ Redis cache (${redisUrl}) flushed successfully!`);
  } catch (error) {
    console.error('❌ Failed to flush Redis cache:', error);
  } finally {
    try {
      await redis.disconnect();
    } catch (_) {}
  }
}

flushRedis();
