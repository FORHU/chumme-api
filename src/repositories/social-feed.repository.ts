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

  /**
   * Get paginated feed with all content
   */
  static async getFeed(
    page: number = 0,
    limit: number = 20,
    countryCode?: string,
  ) {
    const where: any = { isDeleted: false };

    if (countryCode) {
      where.AND = [
        { NOT: { blockedCountries: { has: countryCode } } },
        {
          OR: [
            { allowedCountries: { equals: [] } },
            { allowedCountries: { has: countryCode } },
          ],
        },
      ];
    }

    const items = await prisma.socialFeedItem.findMany({
      where,
      include: {
        chummeArtist: true,
        post: {
          where: { isDeleted: false },
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
      orderBy: { createdAt: "desc" },
      skip: page * limit,
      take: limit,
    });

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

  /**
   * Get trending feed ordered by growth score
   */
  static async getTrendingFeed(page: number = 0, limit: number = 20) {
    const items = await prisma.socialFeedItem.findMany({
      where: {
        isDeleted: false,
        score: { gt: 0 }, // Only show items with some momentum
      },
      include: {
        chummeArtist: true,
        post: {
          where: { isDeleted: false },
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
      orderBy: { score: "desc" },
      skip: page * limit,
      take: limit,
    });

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

  /**
   * Get all available feed item IDs for a given filter (global or artist)
   */
  static async getGlobalFeedIds(chummeArtistId?: string, countryCode?: string) {
    const where: any = { isDeleted: false };
    if (chummeArtistId) {
      where.chummeArtistId = chummeArtistId;
    }

    if (countryCode) {
      if (!where.AND) where.AND = [];
      where.AND.push(
        { NOT: { blockedCountries: { has: countryCode } } },
        {
          OR: [
            { allowedCountries: { equals: [] } },
            { allowedCountries: { has: countryCode } },
          ],
        },
      );
    }

    const items = await prisma.socialFeedItem.findMany({
      where,
      select: { id: true },
    });

    return items.map((i) => i.id);
  }

  /**
   * Get full content for specific feed item IDs
   */
  static async getFeedItemsByIds(ids: string[]) {
    const items = await prisma.socialFeedItem.findMany({
      where: {
        id: { in: ids },
      },
      include: {
        chummeArtist: true,
        post: {
          where: { isDeleted: false },
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

  /**
   * Soft delete feed item when post is deleted
   */
  static async softDeleteByPostId(postId: string) {
    return await prisma.socialFeedItem.updateMany({
      where: { postId },
      data: { isDeleted: true },
    });
  }

  /**
   * Soft delete feed item when external content is removed (by URL)
   */
  static async softDeleteByUrl(externalUrl: string) {
    return await prisma.socialFeedItem.updateMany({
      where: { externalUrl },
      data: { isDeleted: true },
    });
  }

  /**
   * Get total count of feed items (for pagination metadata)
   */
  static async getFeedCount() {
    return await prisma.socialFeedItem.count({
      where: { isDeleted: false },
    });
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
    artistInArray: string[] = [],
    countryCode?: string,
    categoryIds: string[] = [],
    subCategoryIds: string[] = [],
    topicCategoryIds: string[] = [],
  ) {
    const following = await prisma.follow.findMany({
      where: { followerId: userId, isDeleted: false },
      select: { followingId: true },
    });

    const followingIds = following.map((f) => f.followingId);
    followingIds.push(userId);

    const orConditions: Prisma.SocialFeedItemWhereInput[] = [
      {
        post: {
          is: {
            userId: { in: followingIds },
            isDeleted: false,
          },
        },
      },
    ];

    if (artistInArray.length > 0) {
      orConditions.push({ chummeArtistId: { in: artistInArray } });
    }
    if (categoryIds.length > 0) {
      orConditions.push({ chummeCategoryId: { in: categoryIds } });
    }
    if (subCategoryIds.length > 0) {
      orConditions.push({ chummeSubCategoryId: { in: subCategoryIds } });
    }
    if (topicCategoryIds.length > 0) {
      orConditions.push({ chummeTopicCategoryId: { in: topicCategoryIds } });
    }

    const where: any = {
      isDeleted: false,
      OR: orConditions,
    };

    if (countryCode) {
      where.AND = [
        { NOT: { blockedCountries: { has: countryCode } } },
        {
          OR: [
            { allowedCountries: { equals: [] } },
            { allowedCountries: { has: countryCode } },
          ],
        },
      ];
    }

    const items = await prisma.socialFeedItem.findMany({
      where,
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
      orderBy: { createdAt: "desc" },
      skip: page * limit,
      take: limit,
    });

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

  /**
   * Get all available personalized feed item IDs
   */
  static async getPersonalizedFeedIds(
    userId: string,
    artistInArray: string[] = [],
    countryCode?: string,
    categoryIds: string[] = [],
    subCategoryIds: string[] = [],
    topicCategoryIds: string[] = [],
  ) {
    const following = await prisma.follow.findMany({
      where: { followerId: userId, isDeleted: false },
      select: { followingId: true },
    });

    const followingIds = following.map((f) => f.followingId);
    followingIds.push(userId);

    const orConditions: Prisma.SocialFeedItemWhereInput[] = [
      {
        post: {
          is: {
            userId: { in: followingIds },
            isDeleted: false,
          },
        },
      },
    ];

    if (artistInArray.length > 0) {
      orConditions.push({ chummeArtistId: { in: artistInArray } });
    }
    if (categoryIds.length > 0) {
      orConditions.push({ chummeCategoryId: { in: categoryIds } });
    }
    if (subCategoryIds.length > 0) {
      orConditions.push({ chummeSubCategoryId: { in: subCategoryIds } });
    }
    if (topicCategoryIds.length > 0) {
      orConditions.push({ chummeTopicCategoryId: { in: topicCategoryIds } });
    }

    const where: any = {
      isDeleted: false,
      OR: orConditions,
    };

    if (countryCode) {
      where.AND = [
        { NOT: { blockedCountries: { has: countryCode } } },
        {
          OR: [
            { allowedCountries: { equals: [] } },
            { allowedCountries: { has: countryCode } },
          ],
        },
      ];
    }

    const items = await prisma.socialFeedItem.findMany({
      where,
      select: { id: true },
    });

    return items.map((i) => i.id);
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
      chummeCategoryId?: string | null;
      chummeSubCategoryId?: string | null;
      chummeTopicCategoryId?: string | null;
      metaData?: any | null;
      blockedCountries?: string[];
      allowedCountries?: string[];
      videoId?: string | null;
      views?: number;
      likes?: number;
      comments?: number;
    },
  ) {
    const existing = await prisma.socialFeedItem.findUnique({
      where: { externalUrl: where.externalUrl },
    });
    const isUpdate = !!existing;

    const item = await prisma.socialFeedItem.upsert({
      where: { externalUrl: where.externalUrl },
      create: {
        id: data.id,
        title: data.title,
        socialPlatform: data.socialPlatform,
        externalUrl: data.externalUrl,
        videoId: data.videoId ?? null,
        chummeArtistId: data.chummeArtistId ?? null,
        chummeCategoryId: data.chummeCategoryId ?? null,
        chummeSubCategoryId: data.chummeSubCategoryId ?? null,
        chummeTopicCategoryId: data.chummeTopicCategoryId ?? null,
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
        chummeArtistId: data.chummeArtistId ?? null,
        chummeCategoryId: data.chummeCategoryId ?? null,
        chummeSubCategoryId: data.chummeSubCategoryId ?? null,
        chummeTopicCategoryId: data.chummeTopicCategoryId ?? null,
        metaData: data.metaData ?? null,
        blockedCountries: data.blockedCountries || [],
        allowedCountries: data.allowedCountries || [],
        views: data.views !== undefined ? data.views : undefined,
        likes: data.likes !== undefined ? data.likes : undefined,
        comments: data.comments !== undefined ? data.comments : undefined,
      } as any,
    });

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

  /**
   * Get random external media IDs for discovery mixins
   */
  static async getRandomExternalMedia(
    limit: number,
    excludeIds: string[] = [],
  ): Promise<string[]> {
    if (excludeIds.length === 0) {
      const items: any[] = await prisma.$queryRaw`
        SELECT id FROM "SocialFeedItem" 
        WHERE "isDeleted" = false 
        AND "externalUrl" IS NOT NULL 
        ORDER BY RANDOM() 
        LIMIT ${limit}
      `;
      return items.map((item: any) => item.id);
    }

    const items: any[] = await prisma.$queryRawUnsafe(`
      SELECT id FROM "SocialFeedItem" 
      WHERE "isDeleted" = false 
      AND "externalUrl" IS NOT NULL 
      AND id NOT IN (${excludeIds.map((id) => `'${id}'`).join(",")})
      ORDER BY RANDOM() 
      LIMIT ${limit}
    `);

    return items.map((item: any) => item.id);
  }
}
