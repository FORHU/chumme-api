import SocialFeedRepo from "../repositories/social-feed.repository";
import CacheUtil from "../utils/cache.util";
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
              stats: item.stats,
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
  ) {
    // Validate pagination params
    if (page < 0) {
      throw new Error("Page must be non-negative");
    }
    if (limit < 1 || limit > 50) {
      throw new Error("Limit must be between 1 and 50");
    }

    // Check cache
    const cacheKey = `feed:ids:limit:${limit}:seed:${seed || "default"}`;
    let shuffledIds: string[];

    const cachedIds = await CacheUtil.get(cacheKey);
    if (cachedIds && !refresh) {
      shuffledIds = cachedIds;
    } else {
      const allIds = await SocialFeedRepo.getGlobalFeedIds();
      shuffledIds = seededShuffle(allIds, seed);
      await CacheUtil.set(cacheKey, shuffledIds);
    }

    const start = page * limit;
    const pageIds = shuffledIds.slice(start, start + limit);

    if (pageIds.length === 0) return [];

    const feedItems = await SocialFeedRepo.getFeedItemsByIds(pageIds);

    // Restore the shuffled order (Prisma findMany with 'in' doesn't guarantee order)
    const idMap = new Map(feedItems.map((item) => [item.id, item]));
    const orderedItems = pageIds
      .map((id) => idMap.get(id))
      .filter((v): v is NonNullable<typeof v> => !!v);

    return this.formatFeedItems(orderedItems);
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

    const cacheKey = `feed:personalized:ids:${userId}:limit:${limit}:artist:${artistInUrlString || "all"}:seed:${seed || "default"}`;
    let shuffledIds: string[];

    const cachedIds = await CacheUtil.get(cacheKey);
    if (cachedIds && !refresh) {
      shuffledIds = cachedIds;
    } else {
      const allIds = await SocialFeedRepo.getPersonalizedFeedIds(
        userId,
        artistStringToArray,
      );
      shuffledIds = seededShuffle(allIds, seed);
      await CacheUtil.set(cacheKey, shuffledIds, 1800); // 30 mins cache
    }

    const start = page * limit;
    const pageIds = shuffledIds.slice(start, start + limit);

    if (pageIds.length === 0) return [];

    const feedItems = await SocialFeedRepo.getFeedItemsByIds(pageIds);

    // Restore order
    const idMap = new Map(feedItems.map((item) => [item.id, item]));
    const orderedItems = pageIds
      .map((id) => idMap.get(id))
      .filter((v): v is NonNullable<typeof v> => !!v);

    return this.formatFeedItems(orderedItems);
  }

  /**
   * Upsert external media (YouTube/TikTok/Instagram)
   */
  static async upsertExternalMedia(data: {
    externalUrl: string;
    title: string;
    socialPlatform: any;
    chummeArtistId?: string;
    metaData?: any;
  }) {
    if (!data.externalUrl) {
      throw new Error("externalUrl is required to upsert external media");
    }

    if (!data.title || data.title.trim().length === 0) {
      throw new Error("Title is required");
    }

    const { item, isUpdate } = await SocialFeedRepo.upsertExternalMedia(
      { externalUrl: data.externalUrl },
      {
        title: data.title.trim(),
        socialPlatform: data.socialPlatform,
        externalUrl: data.externalUrl,
        chummeArtistId: data.chummeArtistId ?? null,
        metaData: data.metaData ?? null,
      },
    );

    // Clear feed cache only for new items
    if (!isUpdate) {
      await CacheUtil.delByPattern(`feed:page:*`);
      await CacheUtil.delByPattern(`feed:personalized:*`);
    }

    return { item, isUpdate };
  }
}

