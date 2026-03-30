import { connectToPrisma } from "../utils/prisma";
import WebSubService from "../services/websub.service";
import logger from "../utils/logger";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  await connectToPrisma();

  const channelId = process.argv[2] || "UC_x5XG1OV2P6uZZ5FSM9Ttw"; // Google Developers (example)

  logger.info(`Manual WebSub subscription test for channel: ${channelId}`);

  try {
    await WebSubService.toggleSubscription(channelId, "subscribe");
    logger.info("Subscription request sent successfully.");
  } catch (err) {
    logger.error("Subscription failed:", err);
  } finally {
    process.exit(0);
  }
}

main();
