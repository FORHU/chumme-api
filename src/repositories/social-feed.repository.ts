import { Prisma } from "@prisma/client";
import { prisma } from "../utils/prisma";

export default class SocialFeedRepo {
  /**
   * Create a feed item for a post
   */
  static async createPostFeedItem(postId: string) {
    return await prisma.socialFeedItem.create({
      data: {
        postId,
      },
    });
  }

  private static readonly FEED_INCLUDE = {
    chummeArtist: {
      select: {
        id: true,
        name: true,
        imageUrl: true,
        isLive: true,
        subscriberCount: true,
        totalViews: true,
        lastLiveAt: true,
      },
    },
    post: {
      where: { isDeleted: false },
      select: {
        id: true,
        content: true,
        createdAt: true,
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
  } as const;

  private static normalizeFeedItems(items: any[]) {
    return items.map((item) => {
      if (item.post) {
        (item.post as any)._count = {
          likes: (item.post as any)._count.socialUserLikes,
          comments: (item.post as any)._count.socialUserComments,
        };
      }
      return item;
    });
  }

  private static buildCountryFilter(countryCode?: string) {
    if (!countryCode) return undefined;
    return [
      { NOT: { blockedCountries: { has: countryCode } } },
      {
        OR: [
          { allowedCountries: { equals: [] } },
          { allowedCountries: { has: countryCode } },
        ],
      },
    ];
  }

  /**
   * Get paginated feed with all content.
   * Supports cursor-based pagination (preferred) or offset-based (legacy).
   */
  static async getFeed(
    page: number = 0,
    limit: number = 20,
    countryCode?: string,
    chummeArtistId?: string,
    cursor?: string,
  ) {
    const where: any = {
      isDeleted: false,
      chummeArtistId: chummeArtistId || undefined,
    };

    const countryFilter = this.buildCountryFilter(countryCode);
    if (countryFilter) where.AND = countryFilter;

    const paginationArgs: any = { take: limit };
    if (cursor) {
      paginationArgs.cursor = { id: cursor };
      paginationArgs.skip = 1; // skip the cursor item itself
    } else {
      paginationArgs.skip = page * limit;
    }

    const items = await prisma.socialFeedItem.findMany({
      where,
      include: this.FEED_INCLUDE,
      orderBy: { createdAt: "desc" },
      ...paginationArgs,
    });

    return this.normalizeFeedItems(items);
  }

  /**
   * Get trending feed ordered by growth score
   */
  static async getTrendingFeed(
    page: number = 0,
    limit: number = 20,
    chummeArtistId?: string,
    cursor?: string,
  ) {
    const paginationArgs: any = { take: limit };
    if (cursor) {
      paginationArgs.cursor = { id: cursor };
      paginationArgs.skip = 1;
    } else {
      paginationArgs.skip = page * limit;
    }

    const items = await prisma.socialFeedItem.findMany({
      where: {
        isDeleted: false,
        score: { gt: 0 },
        chummeArtistId: chummeArtistId || undefined,
      },
      include: this.FEED_INCLUDE,
      orderBy: { score: "desc" },
      ...paginationArgs,
    });

    return this.normalizeFeedItems(items);
  }

  /**
   * Get personalized feed based on:
   * - Posts from users they follow (social content)
   * - Videos from their favorite artists (fandom content)
   * - Fallback to all videos if no artist preferences set
   */
  static async getPersonalizedFeed(
    userId: string,
    page: number = 0,
    limit: number = 20,
    countryCode?: string,
    topicCategoryIds: string[] = [],
    chummeArtistId?: string,
    cursor?: string,
  ) {
    const orConditions: Prisma.SocialFeedItemWhereInput[] = [];

    if (topicCategoryIds.length > 0) {
      orConditions.push({ chummeTopicCategoryId: { in: topicCategoryIds } });
    }

    const where: any = {
      isDeleted: false,
      chummeArtistId: chummeArtistId || undefined,
      OR: orConditions.length > 0 ? orConditions : undefined,
    };

    const countryFilter = this.buildCountryFilter(countryCode);
    if (countryFilter) where.AND = countryFilter;

    const paginationArgs: any = { take: limit };
    if (cursor) {
      paginationArgs.cursor = { id: cursor };
      paginationArgs.skip = 1;
    } else {
      paginationArgs.skip = page * limit;
    }

    const items = await prisma.socialFeedItem.findMany({
      where,
      include: this.FEED_INCLUDE,
      orderBy: [{ score: "desc" }, { createdAt: "desc" }],
      ...paginationArgs,
    });

    return this.normalizeFeedItems(items);
  }

  /**
   * Upsert external media (YouTube/TikTok/etc) directly into SocialFeedItem
   */
  static async upsertExternalMedia(
    where: { externalUrl: string },
    data: {
      id?: string;
      title: string;
      socialPlatform: any;
      externalUrl: string;
      chummeArtistId?: string | null;
      chummeTopicCategoryId?: string | null;
      metaData?: any | null;
      blockedCountries?: string[];
      allowedCountries?: string[];
      videoId?: string | null;
      views?: number;
      likes?: number;
      comments?: number;
      isLive?: boolean;
    },
  ) {
    const existing = await prisma.socialFeedItem.findUnique({
      where: { externalUrl: where.externalUrl },
    });
    const isUpdate = !!existing;

    const { chummeTopicCategoryId } = data;
    let { chummeArtistId: artistId } = data;

    // Infer artistId if missing
    if (!artistId) {
      // 1. Try via Metadata (Channel ID Match) - NEW GROUND TRUTH
      if (data.metaData) {
        const meta = data.metaData as any;
        const externalChannelId =
          meta?.snippet?.channelId ||
          meta?.channelId ||
          meta?.snippet?.resourceId?.channelId;

        if (externalChannelId) {
          const artist = await prisma.chummeArtist.findFirst({
            where: {
              channelId: { has: externalChannelId },
              isDeleted: false,
            },
            select: { id: true },
          });
          if (artist) artistId = artist.id;
        }
      }

      // 2. Try via Topic Category Name Match
      if (!artistId && chummeTopicCategoryId) {
        const topic = await prisma.chummeTopicCategory.findUnique({
          where: { id: chummeTopicCategoryId },
          select: { name: true },
        });
        if (topic) {
          const artist = await prisma.chummeArtist.findFirst({
            where: {
              name: { equals: topic.name, mode: "insensitive" },
              isDeleted: false,
            },
            select: { id: true },
          });
          if (artist) artistId = artist.id;
        }
      }

      // 3. Last Resort: Try via Metadata Channel Title (Fuzzy)
      if (!artistId && data.metaData) {
        const meta = data.metaData as any;
        const channelTitle = meta?.snippet?.channelTitle || meta?.channelTitle;
        if (channelTitle) {
          const artist = await prisma.chummeArtist.findFirst({
            where: {
              name: { equals: channelTitle, mode: "insensitive" },
              isDeleted: false,
            },
            select: { id: true },
          });
          if (artist) artistId = artist.id;
        }
      }
    }

    const item = await prisma.socialFeedItem.upsert({
      where: { externalUrl: where.externalUrl },
      create: {
        id: data.id,
        title: data.title,
        socialPlatform: data.socialPlatform,
        externalUrl: data.externalUrl,
        videoId: data.videoId ?? null,
        isLive: data.isLive ?? false,
        chummeArtistId: artistId ?? null,
        chummeTopicCategoryId: chummeTopicCategoryId ?? null,
        metaData: data.metaData ?? null,
        blockedCountries: data.blockedCountries || [],
        allowedCountries: data.allowedCountries || [],
        views: data.views ?? 0,
        likes: data.likes ?? 0,
        comments: data.comments ?? 0,
      } as any,
      update: {
        title: data.title,
        socialPlatform: data.socialPlatform,
        externalUrl: data.externalUrl,
        videoId: data.videoId ?? null,
        isLive: data.isLive !== undefined ? data.isLive : undefined,
        chummeArtistId: artistId ?? null,
        chummeTopicCategoryId: chummeTopicCategoryId ?? null,
        metaData: data.metaData ?? null,
        blockedCountries: data.blockedCountries || [],
        allowedCountries: data.allowedCountries || [],
        views: data.views !== undefined ? data.views : undefined,
        likes: data.likes !== undefined ? data.likes : undefined,
        comments: data.comments !== undefined ? data.comments : undefined,
      } as any,
    });

    // Real-time counter logic for Discovery bar
    if (!isUpdate && artistId) {
      // New item ingested, increment counter
      await prisma.chummeArtist.update({
        where: { id: artistId },
        data: { socialFeedItemCount: { increment: 1 } },
      });
    } else if (isUpdate && existing?.chummeArtistId !== artistId) {
      // Artist changed during update, decrement old and increment new
      if (existing?.chummeArtistId) {
        await prisma.chummeArtist.update({
          where: { id: existing.chummeArtistId },
          data: { socialFeedItemCount: { decrement: 1 } },
        });
      }
      if (artistId) {
        await prisma.chummeArtist.update({
          where: { id: artistId },
          data: { socialFeedItemCount: { increment: 1 } },
        });
      }
    }

    return { item, isUpdate };
  }

  /**
   * Find external media items by multiple artist IDs (optional)
   */
  static async findExternalMedia(
    chummeArtistIds?: string[],
    limit: number = 10,
  ) {
    const where: any = {
      isDeleted: false,
      NOT: { externalUrl: null },
    };

    if (chummeArtistIds && chummeArtistIds.length > 0) {
      where.chummeArtistId = { in: chummeArtistIds };
    }

    return prisma.socialFeedItem.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  /**
   * Save read-only comments scraped from external platforms
   */
  static async saveExternalComments(feedItemId: string, comments: any[]) {
    if (!comments || comments.length === 0) return;

    await prisma.$transaction([
      (prisma as any).socialFeedItemComment.deleteMany({
        where: { socialFeedItemId: feedItemId },
      }),
      (prisma as any).socialFeedItemComment.createMany({
        data: comments.map((c: any) => ({
          socialFeedItemId: feedItemId,
          content: c.content,
          authorName: c.authorName || null,
          authorAvatarUrl: c.authorAvatarUrl || null,
          authorHandle: c.authorHandle || null,
          externalId: c.id,
          publishedAt: c.publishedAt || null,
        })),
        skipDuplicates: true,
      }),
    ]);
  }
}
