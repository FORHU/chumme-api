import { PrismaClient, SocialPlatform } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

export async function seedInstagramFeedItems(prisma: PrismaClient) {
  console.log("🌱 Seeding Instagram Feed Items from JSON...");

  const filePath = path.join(
    __dirname,
    "../../docs/jsonFiles/twice-instagram.json",
  );

  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  Instagram seed file not found at ${filePath}. Skipping.`);
    return;
  }

  const rawData = fs.readFileSync(filePath, "utf-8");
  const posts = JSON.parse(rawData);

  // Find the TWICE Topic Category and Artist first
  const twiceTopic = await prisma.chummeTopicCategory.findFirst({
    where: { name: { contains: "TWICE", mode: "insensitive" } }
  });

  const twiceArtist = await prisma.chummeArtist.findFirst({
    where: { name: "TWICE" }
  });

  if (!twiceArtist) {
    console.error("❌ TWICE Artist not found. Please run seedArtists first.");
    return;
  }

  let newCount = 0;

  for (const post of posts) {
    try {
      // Extract Video ID (Shortcode) from URL
      const urlMatch = post.url.match(/\/p\/([^\/]+)\//);
      const videoId = urlMatch ? urlMatch[1] : null;

      const likes = post.likesCount || 0;
      const comments = post.commentsCount || 0;
      const initialScore = likes + (comments * 2);

      const existingItem = await prisma.socialFeedItem.findUnique({
        where: { externalUrl: post.url }
      });

      await prisma.socialFeedItem.upsert({
        where: { externalUrl: post.url },
        update: {
          videoId: videoId,
          likes: likes,
          comments: comments,
          score: initialScore,
          chummeTopicCategoryId: twiceTopic?.id,
          metaData: {
            ...((existingItem?.metaData as object) || {}),
            firstComment: post.firstComment,
            needsEnrichment: true,
          }
        },
        create: {
          externalUrl: post.url,
          videoId: videoId,
          title: post.caption || "Instagram Post",
          socialPlatform: SocialPlatform.INSTAGRAM,
          chummeArtistId: twiceArtist.id,
          chummeTopicCategoryId: twiceTopic?.id,
          likes: likes,
          comments: comments,
          score: initialScore,
          createdAt: new Date(post.timestamp),
          metaData: {
            firstComment: post.firstComment,
            needsEnrichment: true,
            ingestedFrom: "twice-instagram.json"
          }
        }
      });

      if (!existingItem) newCount++;
    } catch (err) {
      console.error(`❌ Error seeding post ${post.url}:`, err);
    }
  }

  console.log(`✅ Successfully seeded ${posts.length} Instagram items (${newCount} new).`);
}
