import * as dotenv from "dotenv";
dotenv.config();
import { connectToPrisma, disconnectPrisma } from "../utils/prisma";
import { rabbitMQService } from "../utils/rabbitmq";
import RedisUtil from "../utils/redis.util";
import { SchedulingService } from "../services/net-communities/ingestion/scheduling.service";
import logger from "../utils/logger";

async function triggerFullCrawl() {
  logger.info("🚀 Starting Forced Video Crawl & Scouting Trigger...");
  
  try {
    // 1. Initialize Connections
    await connectToPrisma();
    await RedisUtil.initialize();
    await rabbitMQService.connect();
    
    // 2. Trigger Tasks
    logger.info("📦 Queuing forced discovery jobs for all ingestion targets...");
    await SchedulingService.processScheduledTasks(true);
    
    logger.info("🔍 Queuing forced search jobs for all category keywords...");
    await SchedulingService.processScoutTasks(true);
    
    logger.info("✅ All jobs successfully queued in RabbitMQ!");
    
  } catch (err) {
    logger.error("❌ Failed to trigger crawl:", err);
  } finally {
    // 3. Cleanup
    await rabbitMQService.disconnect();
    await disconnectPrisma();
    process.exit(0);
  }
}

triggerFullCrawl();
