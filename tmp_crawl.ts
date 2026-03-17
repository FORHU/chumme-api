import { SchedulingService } from "./src/services/net-communities/ingestion/scheduling.service";
import { connectToPrisma } from "./src/utils/prisma";
import { rabbitMQService } from "./src/utils/rabbitmq";

async function main() {
  await connectToPrisma();
  await rabbitMQService.connect();
  
  console.log("Triggering processScheduledTasks(force=true)...");
  await SchedulingService.processScheduledTasks(true); 
  
  console.log("Crawl trigger finished. Message pushed to RabbitMQ!");
}

main().catch(console.error);
