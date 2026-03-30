import { prisma } from "../src/utils/prisma";
import { rabbitMQService } from "../src/utils/rabbitmq";
import {
  IngestionJobType,
  IngestionJob,
} from "../src/listeners/ingestion.listener";
import { SocialPlatform } from "@prisma/client";

async function triggerScout() {
  console.log("Connecting to RabbitMQ...");
  await rabbitMQService.connect();

  console.log("Fetching categories with discovery keywords...");
  const categories = await prisma.chummeCategory.findMany({
    where: { discoveryKeywords: { isEmpty: false } },
  });
  const subCategories = await prisma.chummeSubCategory.findMany({
    where: { discoveryKeywords: { isEmpty: false } },
  });
  const topicCategories = await prisma.chummeTopicCategory.findMany({
    where: { discoveryKeywords: { isEmpty: false } },
  });

  const allItems = [
    ...categories.map((c) => ({
      id: c.id,
      keywords: c.discoveryKeywords,
      type: "category",
    })),
    ...subCategories.map((s) => ({
      id: s.id,
      keywords: s.discoveryKeywords,
      type: "subCategory",
    })),
    ...topicCategories.map((t) => ({
      id: t.id,
      keywords: t.discoveryKeywords,
      type: "topicCategory",
    })),
  ];

  if (allItems.length === 0) {
    console.log(
      "No categories found with discovery keywords. Make sure your database has categories with keywords!",
    );
    process.exit(0);
  }

  console.log(
    `Found ${allItems.length} categories/topics with keywords. Queuing jobs...`,
  );

  let jobsQueued = 0;
  for (const item of allItems) {
    for (const keyword of item.keywords) {
      console.log(
        `[Queue] Scouting ${item.type} [${item.id}] with keyword: "${keyword}"`,
      );

      const job: IngestionJob = {
        type: IngestionJobType.SEARCH,
        platform: SocialPlatform.YOUTUBE,
        targetId: keyword,
        priority: 1,
        meta: {
          categoryId: item.type === "category" ? item.id : undefined,
          subCategoryId: item.type === "subCategory" ? item.id : undefined,
          topicCategoryId: item.type === "topicCategory" ? item.id : undefined,
        },
      };

      await rabbitMQService.publishMessage(
        `ingestion.${IngestionJobType.SEARCH}`,
        job,
      );
      jobsQueued++;
    }
  }

  console.log(
    `Finished queueing ${jobsQueued} scout jobs! The worker will execute them now.`,
  );

  // Close connection cleanly after publishing
  setTimeout(() => {
    process.exit(0);
  }, 1000); // Give RabbitMQ a second to flush buffers
}

triggerScout().catch((e) => {
  console.error(e);
  process.exit(1);
});
