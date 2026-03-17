import SocialFeedRepo from "../repositories/social-feed.repository";
import CacheUtil from "../utils/cache.util";
import { prisma } from "../utils/prisma";
import {
  seededShuffle,
  shuffleArray,
  stringBacktickToArray,
} from "../utils/helpers";
export default class SocialFeedSvc {
  /**
   * Helper method to format feed items
   */
  private static formatFeedItems(feedItems: any[]) {
    return feedItems
      .map((item: any) => {
        // If it has a post object, it's a social post
        if (item.post) {
          return {
            id: item.id,
            type: "post",
            content: {
              id: item.post.id,
              text: item.post.content,
              createdAt: item.post.createdAt,
              user: {
                id: item.post.user?.id,
                username: item.post.user?.username,
                name: item.post.user?.name,
                avatar: item.post.user?.avatar?.fileUrl,
              },
              likesCount: item.post._count?.likes || 0,
              commentsCount: item.post._count?.comments || 0,
            },
          };
        }
        
        // If it has an externalUrl, it's a video or media post
        if (item.externalUrl) {
          return {
            id: item.id,
            type: "video", // Or use a field to distinguish if relevant
            content: {
              title: item.title,
              url: item.externalUrl,
              platform: item.socialPlatform,
              metaData: item.metaData,
              artist: item.chummeArtist,
              stats: {
                views: item.views,
                likes: item.likes,
                comments: item.comments,
                bookmarks: item.bookmarks,
              },
              createdAt: item.createdAt,
            }
          };
        }

        return null;
      })
      .filter(Boolean);
  }


  /**
   * Get unified feed with pagination
   */
  static async getFeed(
    page: number = 0,
    limit: number = 20,
    refresh: boolean = false,
    seed: string = "",
    countryCode?: string,
  ) {
    if (page < 0) {
      throw new Error("Page must be non-negative");
    }
    if (limit < 1 || limit > 50) {
      throw new Error("Limit must be between 1 and 50");
    }

    // Fetch directly from Repo (Sorted by latest createdAt)
    const feedItems = await SocialFeedRepo.getFeed(page, limit, countryCode);

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
    artistInUrlString: string,
    refresh: boolean = false,
    seed: string = "",
    countryCode?: string,
  ) {
    let artistStringToArray: Array<string> = [];

    if (artistInUrlString) {
      artistStringToArray = stringBacktickToArray(artistInUrlString);
    }

    if (page < 0) {
      throw new Error("Page must be non-negative");
    }
    if (limit < 1 || limit > 50) {
      throw new Error("Limit must be between 1 and 50");
    }

    const { prisma } = require("../utils/prisma");

    // Fetch user's discovery preferences
    const discovery = await prisma.socialUserDiscovery.findUnique({
      where: { userId },
      include: {
        chummeCategories: true,
        chummeSubCategories: true,
        chummeTopicCategories: true,
      }
    });

    const categoryIds = discovery?.chummeCategories.map((c: any) => c.id) || [];
    const subCategoryIds = discovery?.chummeSubCategories.map((c: any) => c.id) || [];
    const topicCategoryIds = discovery?.chummeTopicCategories.map((c: any) => c.id) || [];

    // Fetch directly from Repo (Personalized for following + feed filters)
    const feedItems = await SocialFeedRepo.getPersonalizedFeed(
      userId,
      page,
      limit,
      artistStringToArray,
      countryCode,
      categoryIds,
      subCategoryIds,
      topicCategoryIds
    );

    // Mix in random items for Discovery (e.g., up to 3 items)
    const excludeIds = feedItems.map((item: any) => item.id);
    const randomIds = await SocialFeedRepo.getRandomExternalMedia(3, excludeIds);

    if (randomIds.length > 0) {
      const randomItems = await prisma.socialFeedItem.findMany({
        where: { id: { in: randomIds } },
        include: {
          chummeArtist: true,
          post: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  name: true,
                  avatar: { select: { fileUrl: true } },
                },
              },
              _count: {
                select: {
                  socialUserLikes: { where: { isDeleted: false } },
                  socialUserComments: { where: { isDeleted: false } },
                },
              },
            },
          },
        },
      });

      // Map counts like Repo does for consistency
      const mappedRandomItems = randomItems.map((item: any) => {
        if (item.post) {
          (item.post as any)._count = {
            likes: (item.post as any)._count.socialUserLikes,
            comments: (item.post as any)._count.socialUserComments,
          };
        }
        return item;
      });

      feedItems.push(...mappedRandomItems);
      
      // Sort by date desc so random items blend organically into the stream
      feedItems.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

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
    chummeCategoryId?: string;
    chummeSubCategoryId?: string;
    chummeTopicCategoryId?: string;
    metaData?: any;
    views?: number;
    likes?: number;
    comments?: number;
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
      const match = data.externalUrl.match(/(?:v=|\/embed\/|\/watch\?v=|\/v\/|youtu\.be\/|\/shorts\/)([^#&?]*)/);
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
        chummeCategoryId: data.chummeCategoryId ?? null,
        chummeSubCategoryId: data.chummeSubCategoryId ?? null,
        chummeTopicCategoryId: data.chummeTopicCategoryId ?? null,
        metaData: data.metaData ?? null,
        blockedCountries,
        allowedCountries,
        views: data.views,
        likes: data.likes,
        comments: data.comments,
      } as any,
    );
    
    // 📸 Take a historical snapshot on every crawl ingest (Backups for Charts!)
    await prisma.socialFeedSnapshot.create({
      data: {
        socialFeedId: item.id,
        views: data.views || 0,
        likes: data.likes || 0,
        comments: data.comments || 0,
      }
    });

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
   * Get merged comments for a feed item (scraped + local)
   */
  static async getFeedItemComments(feedItemId: string) {
    const { prisma } = require("../utils/prisma");
    
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
          }
        }
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
      }
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
      }
    }));

    // 4. Merge and Sort by Date desc
    const allComments = [...unifiedScraped, ...unifiedLocal].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );

    return allComments;
  }
  /**
   * Get historical snapshots for a feed item
   */
  static async getSnapshots(feedItemId: string) {
    return prisma.socialFeedSnapshot.findMany({
      where: { socialFeedId: feedItemId },
      orderBy: { snapshotAt: "asc" },
    });
  }
}

