import { Prisma } from "@prisma/client";
import { prisma } from "../utils/prisma";

export default class SocialFeedRepo {
  /**
   * Create a feed item for a post
   */
  static async createPostFeedItem(postId: string) {
    return await prisma.socialFeedItem.create({
      data: {
        type: "POST",
        postId,
        stats: {
          create: {},
        },
      },
    });
  }

  /**
   * Create a feed item for external content (Video/Link)
   */
  static async createExternalFeedItem(data: {
    type: "VIDEO" | "MEDIA_POST";
    title: string;
    externalUrl: string;
    platform: any; // VideoPlatform enum
    metaData?: any;
    artistId?: string;
  }) {
    return await prisma.socialFeedItem.create({
      data: {
        type: data.type,
        title: data.title,
        externalUrl: data.externalUrl,
        platform: data.platform,
        metaData: data.metaData,
        artistId: data.artistId,
        stats: {
          create: {},
        },
      },
    });
  }

  /**
   * Legacy wrapper - now uses direct storage
   */
  static async createVideoFeedItem(data: {
    title: string;
    externalUrl: string;
    platform: any;
    metaData?: any;
    artistId?: string;
  }) {
    return this.createExternalFeedItem({ ...data, type: "VIDEO" });
  }

  static async createMediaPostFeedItem(data: {
    title: string;
    externalUrl: string;
    platform: any;
    metaData?: any;
    artistId?: string;
  }) {
    return this.createExternalFeedItem({ ...data, type: "MEDIA_POST" });
  }

  /**
   * Get paginated feed with all content
   */
  static async getFeed(page: number = 0, limit: number = 20) {
    const items = await prisma.socialFeedItem.findMany({
      where: { isDeleted: false },
      include: {
        artist: true,
        stats: true,
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
   * Get all available feed item IDs for a given filter (global or artist)
   */
  static async getGlobalFeedIds(artistId?: string) {
    const where: any = { isDeleted: false };
    if (artistId) {
      where.artistId = artistId;
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
      where: { id: { in: ids } },
      include: {
        artist: true,
        stats: true,
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
  ) {
    const following = await prisma.follow.findMany({
      where: { followerId: userId, isDeleted: false },
      select: { followingId: true },
    });

    const followingIds = following.map((f) => f.followingId);
    followingIds.push(userId);

    const orConditions: Prisma.SocialFeedItemWhereInput[] = [
      {
        type: "POST",
        post: {
          is: {
            userId: { in: followingIds },
            isDeleted: false,
          },
        },
      },
    ];
    if (artistInArray.length > 0) {
      orConditions.push({
        artistId: { in: artistInArray },
      });
    }

    const items = await prisma.socialFeedItem.findMany({
      where: {
        isDeleted: false,
        OR: orConditions,
      },
      include: {
        artist: true,
        stats: true,
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
  ) {
    const following = await prisma.follow.findMany({
      where: { followerId: userId, isDeleted: false },
      select: { followingId: true },
    });

    const followingIds = following.map((f) => f.followingId);
    followingIds.push(userId);

    const orConditions: Prisma.SocialFeedItemWhereInput[] = [
      {
        type: "POST",
        post: {
          is: {
            userId: { in: followingIds },
            isDeleted: false,
          },
        },
      },
    ];

    if (artistInArray.length > 0) {
      orConditions.push({
        artistId: { in: artistInArray },
      });
    }

    const items = await prisma.socialFeedItem.findMany({
      where: {
        isDeleted: false,
        OR: orConditions,
      },
      select: { id: true },
    });

    return items.map((i) => i.id);
  }
}
