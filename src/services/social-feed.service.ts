import SocialFeedRepo from "../repositories/social-feed.repository";
import CacheUtil from "../utils/cache.util";
import RedisUtil from "../utils/redis.util";
import logger from "../utils/logger";
import { prisma } from "../utils/prisma";
export default class SocialFeedSvc {
  static async getFeed(
    page: number = 0,
    limit: number = 20,
    countryCode?: string,
    chummeArtistId?: string,
    cursor?: string,
  ) {
    const startTime = Date.now();
    if (limit < 1 || limit > 50) {
      throw new Error("Limit must be between 1 and 50");
    }
    if (!cursor) {
      if (page < 0) throw new Error("Page must be non-negative");
      if (page > 100) throw new Error("Maximum page limit exceeded");
    }

    const cacheKey = cursor
      ? `feed:page:cursor:${cursor}:limit:${limit}:country:${countryCode || "all"}:artist:${chummeArtistId || "all"}`
      : `feed:page:${page}:limit:${limit}:country:${countryCode || "all"}:artist:${chummeArtistId || "all"}`;
    let feedItems = await CacheUtil.get(cacheKey);

    if (feedItems) {
      (feedItems as any)._cacheHit = true;
      logger.info("Feed latency", {
        cacheHit: true,
        responseTimeMs: Date.now() - startTime,
        page,
        limit,
        cursor,
        cacheKey,
      });
      return feedItems;
    }

    const redis = RedisUtil.useConnection();
    if (redis) {
      const lockKey = `lock:${cacheKey}`;
      const locked = await redis.set(lockKey, "1", { NX: true, EX: 5 });
      if (!locked) {
        await new Promise((res) => setTimeout(res, 200));
        feedItems = await CacheUtil.get(cacheKey);
        if (feedItems) {
          (feedItems as any)._cacheHit = true;
          logger.info("Feed latency", {
            cacheHit: true,
            responseTimeMs: Date.now() - startTime,
            page,
            limit,
            cursor,
            cacheKey,
          });
          return feedItems;
        }
      }
    }

    feedItems = await SocialFeedRepo.getFeed(
      page,
      limit,
      countryCode,
      chummeArtistId,
      cursor,
    );

    (feedItems as any)._cacheHit = false;
    await CacheUtil.set(cacheKey, feedItems, 300); // 5 minutes TTL
    logger.info("Feed latency", {
      cacheHit: false,
      responseTimeMs: Date.now() - startTime,
      page,
      limit,
      cursor,
      cacheKey,
    });

    return feedItems;
  }

  /**
   * Get personalized feed based on:
   * - Posts from users they follow (+ own posts)
   * - Videos from their favorite artists
   * Note: Emotion preferences can be used elsewhere (e.g., video recommendations, mood-based playlists)
   */
  static async getPersonalizedFeed(
    userId: string,
    page: number = 0,
    limit: number = 5,
    countryCode?: string,
    chummeArtistId?: string,
    cursor?: string,
  ) {
    const startTime = Date.now();
    if (limit < 1 || limit > 50) {
      throw new Error("Limit must be between 1 and 50");
    }
    if (!cursor) {
      if (page < 0) throw new Error("Page must be non-negative");
      if (page > 100) throw new Error("Maximum page limit exceeded");
    }

    const cacheKey = cursor
      ? `feed:personalized:user:${userId}:cursor:${cursor}:limit:${limit}:artist:${chummeArtistId || "all"}`
      : `feed:personalized:user:${userId}:page:${page}:limit:${limit}:artist:${chummeArtistId || "all"}`;
    // Both key formats are covered by existing `feed:personalized:*` invalidation pattern
    let feedItems = await CacheUtil.get(cacheKey);

    if (feedItems) {
      (feedItems as any)._cacheHit = true;
      logger.info("Personalized feed latency", {
        cacheHit: true,
        responseTimeMs: Date.now() - startTime,
        page,
        limit,
        cursor,
        cacheKey,
      });
      return feedItems;
    }

    const redis = RedisUtil.useConnection();
    if (redis) {
      const lockKey = `lock:${cacheKey}`;
      const locked = await redis.set(lockKey, "1", { NX: true, EX: 5 });
      if (!locked) {
        await new Promise((res) => setTimeout(res, 200));
        feedItems = await CacheUtil.get(cacheKey);
        if (feedItems) {
          (feedItems as any)._cacheHit = true;
          logger.info("Personalized feed latency", {
            cacheHit: true,
            responseTimeMs: Date.now() - startTime,
            page,
            limit,
            cursor,
            cacheKey,
          });
          return feedItems;
        }
      }
    }

    // Cache user discovery preferences to avoid repeated DB hits
    const discoveryCacheKey = `user:${userId}:discovery`;
    let topicCategoryIds: string[] = [];
    let discovery = await CacheUtil.get(discoveryCacheKey);

    if (!discovery) {
      discovery = await prisma.socialUserDiscovery.findUnique({
        where: { userId },
        include: {
          chummeTopicCategories: { select: { id: true } },
        },
      });
      if (discovery) {
        await CacheUtil.set(discoveryCacheKey, discovery, 1800); // 30 minutes
      }
    }

    topicCategoryIds =
      discovery?.chummeTopicCategories?.map((c: any) => c.id) || [];

    feedItems = await SocialFeedRepo.getPersonalizedFeed(
      userId,
      page,
      limit,
      countryCode,
      topicCategoryIds,
      chummeArtistId,
      cursor,
    );

    (feedItems as any)._cacheHit = false;
    await CacheUtil.set(cacheKey, feedItems, 180); // 3 minutes TTL
    logger.info("Personalized feed latency", {
      cacheHit: false,
      responseTimeMs: Date.now() - startTime,
      page,
      limit,
      cursor,
      cacheKey,
    });

    return feedItems;
  }

  /**
   * Upsert external media (YouTube/TikTok/Instagram)
   */
  static async upsertExternalMedia(data: {
    externalUrl: string;
    title: string;
    socialPlatform: any;
    chummeArtistId?: string;
    chummeTopicCategoryId?: string;
    metaData?: any;
    views?: number;
    likes?: number;
    comments?: number;
    isLive?: boolean;
  }) {
    if (!data.externalUrl) {
      throw new Error("externalUrl is required to upsert external media");
    }

    if (!data.title || data.title.trim().length === 0) {
      throw new Error("Title is required");
    }

    const restriction = data.metaData?.contentDetails?.regionRestriction;
    const blockedCountries = restriction?.blocked || [];
    const allowedCountries = restriction?.allowed || [];

    // Extract videoId from metaData or url regex
    let videoId = data.metaData?.youtubeId || data.metaData?.id;
    if (!videoId && data.socialPlatform === "YOUTUBE" && data.externalUrl) {
      const match = data.externalUrl.match(
        /(?:v=|\/embed\/|\/watch\?v=|\/v\/|youtu\.be\/|\/shorts\/)([^#&?]*)/,
      );
      if (match && match[1]) {
        videoId = match[1];
      }
    }

    const { item, isUpdate } = await SocialFeedRepo.upsertExternalMedia(
      { externalUrl: data.externalUrl },
      {
        title: data.title.trim(),
        socialPlatform: data.socialPlatform,
        externalUrl: data.externalUrl,
        videoId,
        chummeArtistId: data.chummeArtistId ?? null,
        chummeTopicCategoryId: data.chummeTopicCategoryId ?? null,
        metaData: data.metaData ?? null,
        blockedCountries,
        allowedCountries,
        views: data.views,
        likes: data.likes,
        comments: data.comments,
        isLive: data.isLive,
      } as any,
    );

    // Clear feed cache only for new items
    if (!isUpdate) {
      await CacheUtil.delByPattern(`feed:page:*`);
      await CacheUtil.delByPattern(`feed:personalized:*`);
    }

    return { item, isUpdate };
  }

  /**
   * Save read-only comments fetched from external platforms
   */
  static async saveExternalComments(feedItemId: string, comments: any[]) {
    await SocialFeedRepo.saveExternalComments(feedItemId, comments);
  }

  /**
   * Create a user comment on a feed item
   */
  static async createFeedItemComment(
    feedItemId: string,
    userId: string,
    content: string,
  ) {
    if (!content || content.trim().length === 0) {
      throw new Error("Comment content is required");
    }
    if (content.length > 1000) {
      throw new Error("Comment is too long (max 1000 characters)");
    }

    // Verify feed item exists
    const feedItem = await prisma.socialFeedItem.findUnique({
      where: { id: feedItemId },
    });
    if (!feedItem) {
      throw new Error("Feed item not found");
    }

    const comment = await prisma.socialUserComment.create({
      data: {
        socialFeedItemId: feedItemId,
        userId,
        content: content.trim(),
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: { select: { fileUrl: true } },
          },
        },
      },
    });

    await CacheUtil.delByPattern(`feed:page:*`);
    await CacheUtil.delByPattern(`feed:personalized:*`);

    return comment;
  }

  /**
   * Get merged comments for a feed item (scraped + local)
   */
  static async getFeedItemComments(feedItemId: string) {
    // 1. Get scraped comments (read-only)
    const scraped = await (prisma as any).socialFeedItemComment.findMany({
      where: { socialFeedItemId: feedItemId },
      orderBy: { createdAt: "desc" },
    });

    // 2. Get local user comments
    const local = await prisma.socialUserComment.findMany({
      where: { socialFeedItemId: feedItemId, isDeleted: false },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: { select: { fileUrl: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // 3. Map to Unified format
    const unifiedScraped = scraped.map((c: any) => ({
      id: c.id,
      content: c.content,
      createdAt: c.createdAt,
      author: {
        name: c.authorName || "Anonymous",
        avatarUrl: c.authorAvatarUrl || undefined,
        handle: c.authorHandle || undefined,
        type: "external",
      },
    }));

    const unifiedLocal = local.map((c: any) => ({
      id: c.id,
      content: c.content,
      createdAt: c.createdAt,
      author: {
        id: c.user.id,
        name: c.user.name || c.user.username,
        avatarUrl: c.user.avatar?.fileUrl || undefined,
        handle: c.user.username,
        type: "chumme",
      },
    }));

    // 4. Merge and Sort by Date desc
    const allComments = [...unifiedScraped, ...unifiedLocal].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );

    return allComments;
  }
}
