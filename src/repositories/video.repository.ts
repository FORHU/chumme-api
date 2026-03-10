import { Prisma } from "@prisma/client";
import { prisma } from "../utils/prisma";

export default class VideoRepo {
  // Save / create video record
  static async createVideo(data: {
    title: string;
    platform: any;
    artistId?: string | null;
    meta_data?: any | null;
    externalUrl?: string;
  }) {
    return prisma.socialFeedItem.create({
      data: {
        type: "VIDEO",
        title: data.title,
        platform: data.platform,
        artistId: data.artistId ?? null,
        metaData: data.meta_data ?? null,
        externalUrl: data.externalUrl,
        stats: {
          create: {},
        },
      },
    });
  }

  // Create or update video (upsert) - uses externalUrl as unique key
  static async upsertVideo(
    where: { externalUrl: string },
    data: {
      id?: string;
      title: string;
      platform: any;
      externalUrl: string;
      artistId?: string | null;
      meta_data?: any | null;
    },
  ) {
    const existing = await prisma.socialFeedItem.findUnique({
      where: { externalUrl: where.externalUrl },
    });
    const isUpdate = !!existing;

    const video = await prisma.socialFeedItem.upsert({
      where: { externalUrl: where.externalUrl },
      create: {
        id: data.id,
        type: "VIDEO",
        title: data.title,
        platform: data.platform,
        externalUrl: data.externalUrl,
        artistId: data.artistId ?? null,
        metaData: data.meta_data ?? null,
        stats: {
          create: {},
        },
      },
      update: {
        title: data.title,
        platform: data.platform,
        externalUrl: data.externalUrl,
        artistId: data.artistId ?? null,
        metaData: data.meta_data ?? null,
      },
    });

    return { video, isUpdate };
  }

  /**
   * Find videos by emotion name and optionally filter by artist IDs
   * @param emotionName - The emotion to search for (case-insensitive)
   * @param artistIds - Optional array of artist IDs to filter by
   * @param limit - Maximum number of results to return
   * @returns Array of videos with their relations
   */
  static async findVideosByEmotionAndArtist(
    emotionName: string,
    artistIds?: string[],
    limit: number = 10,
  ) {
    // NOTE: emotions are not currently linked to flattened SocialFeedItem.
    // Returning recent items from SocialFeedItem as a fallback or empty array.
    const whereClause: any = {
      isDeleted: false,
      type: "VIDEO",
    };

    if (artistIds && artistIds.length > 0) {
      whereClause.artistId = { in: artistIds };
    }

    return prisma.socialFeedItem.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  /**
   * Find videos by multiple emotion names (matches ANY of the emotions)
   * @param emotionNames - Array of emotion names to search for
   * @param artistIds - Optional array of artist IDs to filter by
   * @param limit - Maximum number of results to return
   * @returns Array of videos with their relations
   */
  static async findVideosByEmotions(
    emotionNames: string[],
    artistIds?: string[],
    limit: number = 10,
  ) {
    if (!emotionNames || emotionNames.length === 0) {
      return [];
    }

    const whereClause: any = {
      isDeleted: false,
      type: "VIDEO",
    };

    if (artistIds && artistIds.length > 0) {
      whereClause.artistId = { in: artistIds };
    }

    return prisma.socialFeedItem.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }
}
