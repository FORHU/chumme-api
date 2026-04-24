import { prisma } from "../src/utils/prisma";
import { upsertArtist } from "../src/repositories/chumme-artist.repository";
import { rabbitMQService } from "../src/utils/rabbitmq";
import { SocialPlatform } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

/**
 * Revamped Instagram Ingestion Script
 * Usage: npx ts-node scripts/instagram.script.ts [path-to-json]
 */
async function main() {
  const argPath = process.argv[2] || "docs/jsonFiles/twice-instagram.json";
  const filePath = path.isAbsolute(argPath) ? argPath : path.join(process.cwd(), argPath);

  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }

  console.log(`🚀 Starting Ingestion: ${path.basename(filePath)}`);
  
  const rawData = fs.readFileSync(filePath, "utf-8");
  const posts = JSON.parse(rawData);

  if (!Array.isArray(posts)) {
    console.error("❌ Invalid JSON format: Expected an array of posts.");
    process.exit(1);
  }

  // Connect RabbitMQ early
  let isRabbitConnected = false;
  try {
    await rabbitMQService.connect();
    isRabbitConnected = true;
    console.log("✅ RabbitMQ Connected for enrichment queueing.");
  } catch (err) {
    console.warn("⚠️  RabbitMQ skipped (Check your connection). Items will be ingested but not enriched.");
  }

  let processed = 0;
  let created = 0;
  let updated = 0;

  for (const post of posts) {
    try {
      // 1. Resolve Artist & Topic
      const artistName = post.ownerFullName || "Unknown Artist";
      const artistHandle = post.ownerUsername || "";

      const artist = await upsertArtist({
        name: artistName,
        socialPlatformUsername: artistHandle,
        platform: "INSTAGRAM",
      });

      const topic = await prisma.chummeTopicCategory.findFirst({
        where: { name: { contains: artistName, mode: "insensitive" } }
      });

      // 2. Data Extraction
      const urlMatch = post.url.match(/\/p\/([^\/]+)\//);
      const videoId = urlMatch ? urlMatch[1] : null;
      const likes = Number(post.likesCount) || 0;
      // Note: Comments are no longer factored into the ranking score
      const comments = Number(post.commentsCount) || 0;
      const score = likes * 1; 


      // 3. Database Sync
      const existing = await prisma.socialFeedItem.findUnique({
        where: { externalUrl: post.url }
      });

      await prisma.socialFeedItem.upsert({
        where: { externalUrl: post.url },
        update: {
          videoId,
          likes,
          comments,
          score,
          chummeTopicCategoryId: topic?.id,
          metaData: {
            ...((existing?.metaData as object) || {}),
            firstComment: post.firstComment,
            lastIngestedAt: new Date(),
            needsEnrichment: true,
          }
        },
        create: {
          externalUrl: post.url,
          videoId,
          title: post.caption || "Instagram Post",
          socialPlatform: SocialPlatform.INSTAGRAM,
          chummeArtistId: artist.id,
          chummeTopicCategoryId: topic?.id,
          likes,
          comments,
          score,
          createdAt: new Date(post.timestamp),
          metaData: {
            firstComment: post.firstComment,
            needsEnrichment: true,
            ingestedFrom: path.basename(filePath)
          }
        }
      });

      if (existing) updated++; else created++;

      // 4. Enrich
      if (isRabbitConnected) {
        await rabbitMQService.publishMessage("ingestion.metadata", {
          type: "metadata",
          platform: SocialPlatform.INSTAGRAM,
          targetId: videoId || post.url,
          priority: 1,
          meta: { artistId: artist.id, mode: "sync" }
        });
      }

      processed++;
      if (processed % 20 === 0) console.log(`⏳ Progress: ${processed}/${posts.length}...`);
    } catch (err) {
      console.error(`❌ Failed item ${post.url}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`\n✨ Ingestion Complete!`);
  console.log(`📊 Stats: Total ${processed} | Created ${created} | Updated ${updated}`);

  if (isRabbitConnected) await rabbitMQService.disconnect();
  await prisma.$disconnect();
}

main().catch(err => {
  console.error("💀 Fatal Error:", err);
  process.exit(1);
});
