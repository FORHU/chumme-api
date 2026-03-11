import { PrismaClient } from "@prisma/client";

export async function seedFeedItems(prisma: PrismaClient) {
  console.log("📑 Seeding Initial FeedItems...");

  // 1. Fetch available posts to link
  const posts = await prisma.socialUserPost.findMany({ where: { isDeleted: false } });
  const artists = await prisma.chummeArtist.findMany({ where: { isDeleted: false } });


  console.log(
    `🔍 Found: ${posts.length} Posts`,
  );


  // 2. Fetch existing feed items to check for duplicates
  const existingFeedItems = await prisma.socialFeedItem.findMany({
    select: { postId: true, externalUrl: true },
  });

  const existingPostIds = new Set(
    existingFeedItems.map((f) => f.postId).filter(Boolean),
  );
  const existingUrls = new Set(
    existingFeedItems.map((f) => f.externalUrl).filter(Boolean),
  );


  // 3. Link Posts (Only if missing)
  const newPosts = posts.filter((p) => !existingPostIds.has(p.id));
  if (newPosts.length > 0) {
    console.log(`📝 Linking ${newPosts.length} new Posts...`);
    for (const p of newPosts) {
      await prisma.socialFeedItem.create({
        data: {
          postId: p.id,
          createdAt: p.createdAt,
          stats: { create: {} }
        }
      });
    }
  }

  // 4. Seed some sample videos
  const sampleVideos = [
    {
      title: "Chumme Official Anthem",
      externalUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      socialPlatform: "YOUTUBE" as any,
      chummeArtistId: artists[0]?.id || null,
    },
    {
      title: "Artist Spotlight: Rising Stars",
      externalUrl: "https://www.youtube.com/watch?v=example2",
      socialPlatform: "YOUTUBE" as any,
      chummeArtistId: artists[1]?.id || null,
    }
  ];

  for (const video of sampleVideos) {
    if (!existingUrls.has(video.externalUrl)) {
      console.log(`🎬 Seeding video: ${video.title}`);
      await prisma.socialFeedItem.create({
        data: {
          ...video,
          stats: { create: {} }
        }
      });
    }
  }


  console.log("✅ FeedItems synchronized safely (Production Ready)!");
}
