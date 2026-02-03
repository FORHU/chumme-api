import { PrismaClient, FeedItemType } from "@prisma/client";

export async function seedFeedItems(prisma: PrismaClient) {
  console.log("📑 Connecting Existing Records to FeedItems...");

  // 1. Fetch all existing content that could be in a feed
  const [posts, videos, mediaPosts] = await Promise.all([
    prisma.post.findMany({ where: { isDeleted: false } }),
    prisma.video.findMany({ where: { isDeleted: false } }),
    prisma.mediaPost.findMany({ where: { isDeleted: false } }),
  ]);

  console.log(
    `🔍 Found: ${posts.length} Posts, ${videos.length} Videos, ${mediaPosts.length} MediaPosts`,
  );

  // 2. Fetch existing feed items to check for duplicates
  const existingFeedItems = await prisma.feedItem.findMany({
    select: { postId: true, videoId: true, mediaPostId: true },
  });

  const existingPostIds = new Set(
    existingFeedItems.map((f) => f.postId).filter(Boolean),
  );
  const existingVideoIds = new Set(
    existingFeedItems.map((f) => f.videoId).filter(Boolean),
  );
  const existingMediaPostIds = new Set(
    existingFeedItems.map((f) => f.mediaPostId).filter(Boolean),
  );

  // 3. Link Posts (Only if missing)
  const newPosts = posts.filter((p) => !existingPostIds.has(p.id));
  if (newPosts.length > 0) {
    console.log(`📝 Linking ${newPosts.length} new Posts...`);
    await prisma.feedItem.createMany({
      data: newPosts.map((p) => ({
        type: FeedItemType.POST,
        postId: p.id,
        createdAt: p.createdAt,
      })),
    });
  } else {
    console.log("📝 All Posts already present in Feed.");
  }

  // 4. Link Videos (Only if missing)
  const newVideos = videos.filter((v) => !existingVideoIds.has(v.id));
  if (newVideos.length > 0) {
    console.log(`🎬 Linking ${newVideos.length} new Videos...`);
    await prisma.feedItem.createMany({
      data: newVideos.map((v) => ({
        type: FeedItemType.VIDEO,
        videoId: v.id,
        artistId: v.artistId,
        createdAt: v.createdAt,
      })),
    });
  } else {
    console.log("🎬 All Videos already present in Feed.");
  }

  // 5. Link MediaPosts (Only if missing)
  const newMediaPosts = mediaPosts.filter(
    (mp) => !existingMediaPostIds.has(mp.id),
  );
  if (newMediaPosts.length > 0) {
    console.log(`🖼️ Linking ${newMediaPosts.length} new MediaPosts...`);
    await prisma.feedItem.createMany({
      data: newMediaPosts.map((mp) => ({
        type: FeedItemType.MEDIA_POST,
        mediaPostId: mp.id,
        artistId: mp.artistId,
        createdAt: mp.createdAt,
      })),
    });
  } else {
    console.log("🖼️ All MediaPosts already present in Feed.");
  }

  console.log("✅ FeedItems synchronized safely (Production Ready)!");
}
