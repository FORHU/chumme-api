import "dotenv/config";
import { WebSubService } from "../src/services/net-communities/ingestion/websub.service";
import { connectToPrisma } from "../src/utils/prisma";

async function main() {
  const args = process.argv.slice(2);
  const action = args[0];
  const channelId = args[1];

  if (!action || !channelId) {
    console.log("Usage: ts-node websub-manage.ts <subscribe|unsubscribe> <channelId>");
    process.exit(1);
  }

  await connectToPrisma();

  if (action === "subscribe") {
    console.log(`Sending subscription request for ${channelId}...`);
    await WebSubService.subscribe(channelId);
  } else if (action === "unsubscribe") {
    console.log(`Sending unsubscription request for ${channelId}...`);
    await WebSubService.unsubscribe(channelId);
  } else {
    console.log("Invalid action. Use 'subscribe' or 'unsubscribe'.");
  }

  console.log("Done. Check logs for hub verification handshake.");
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
