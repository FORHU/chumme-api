import { Prisma } from "@prisma/client";
import { prisma } from "../utils/prisma";

/**
 * The studio fields a recording response may carry. Never `studio: true`: the
 * row also holds `keyPassword`, the private-room password.
 */
const STUDIO_SUMMARY = {
  select: { id: true, name: true, studioType: true, ownerId: true },
} as const;

interface ListParams {
  page?: number;
  limit?: number;
  /** Extra filter, ANDed in: who may see which records (see music-access). */
  visibleTo?: Prisma.MusicRecordWhereInput;
}

const visibility = (where?: Prisma.MusicRecordWhereInput) =>
  where ? { AND: [where] } : {};

interface CreateMusicRecordData {
  studioId: string;
  musicId: string;
  fileId: string;
  singerIds?: string[]; // Optional array of user IDs who participated
  metaData?: any;
  recordDuration?: number;
}

export default class MusicRecordRepo {
  /**
   * Create a new MusicRecord (user's karaoke recording)
   */
  static async create(data: CreateMusicRecordData, tx?: any) {
    const client = tx || prisma;
    return client.musicRecord.create({
      data: {
        studioId: data.studioId,
        musicId: data.musicId,
        fileId: data.fileId,
        metaData: (data as any).metaData,
        recordDuration: data.recordDuration,
        // NOTE: an empty array is truthy — `connect: []` would silently create a
        // record with no singers, which findByUserId can never return.
        singers: data.singerIds?.length
          ? { connect: data.singerIds.map((id) => ({ id })) }
          : undefined,
      },
      include: {
        studio: STUDIO_SUMMARY,
        music: {
          include: {
            musicArtist: true,
          },
        },
        file: true,
        singers: true,
      },
    });
  }

  /**
   * Find a MusicRecord by ID
   */
  static async findById(id: string) {
    return prisma.musicRecord.findUnique({
      where: { id },
      include: {
        studio: STUDIO_SUMMARY,
        music: {
          include: {
            musicArtist: true,
            musicFeaturedArtists: {
              include: {
                chummeArtist: true,
              },
            },
          },
        },
        file: true,
        singers: true,
        musicParts: {
          include: {
            singer: true,
          },
        },
      },
    });
  }

  /**
   * Get all MusicRecords with pagination
   */
  static async findAll(params: ListParams = {}) {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const skip = (page - 1) * limit;
    const where = { deletedAt: null, ...visibility(params.visibleTo) };

    const [data, total] = await Promise.all([
      prisma.musicRecord.findMany({
        where,
        include: {
          studio: STUDIO_SUMMARY,
          music: {
            include: {
              musicArtist: true,
            },
          },
          file: true,
          singers: true,
          musicParts: {
            include: {
              singer: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.musicRecord.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get MusicRecords by studioId with pagination
   */
  static async findByStudioId(studioId: string, params: ListParams = {}) {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const skip = (page - 1) * limit;
    const where = {
      studioId,
      deletedAt: null,
      ...visibility(params.visibleTo),
    };

    const [data, total] = await Promise.all([
      prisma.musicRecord.findMany({
        where,
        include: {
          studio: STUDIO_SUMMARY,
          music: {
            include: {
              musicArtist: true,
            },
          },
          file: true,
          singers: true,
          musicParts: {
            include: {
              singer: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.musicRecord.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get MusicRecords by musicId (all recordings of a song) with pagination
   */
  static async findByMusicId(musicId: string, params: ListParams = {}) {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const skip = (page - 1) * limit;
    const where = {
      musicId,
      deletedAt: null,
      ...visibility(params.visibleTo),
    };

    const [data, total] = await Promise.all([
      prisma.musicRecord.findMany({
        where,
        include: {
          studio: STUDIO_SUMMARY,
          file: true,
          singers: true,
          musicParts: {
            include: {
              singer: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.musicRecord.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Soft delete a MusicRecord
   */
  static async delete(id: string) {
    return prisma.musicRecord.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Get MusicRecords by userId (all recordings of a user) with pagination
   */
  static async findByUserId(
    userId: string,
    params: { page?: number; limit?: number } = {},
  ) {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      prisma.musicRecord.findMany({
        where: { singers: { some: { id: userId } }, deletedAt: null },
        include: {
          singers: true,
          file: true,
          music: {
            include: {
              musicArtist: true,
            },
          },
          // Selected rather than `studio: true`: My Recordings needs the
          // session type to label each take, but the studio row also carries
          // `keyPassword` — the private-room password — which must not ship
          // to the client.
          studio: {
            select: { id: true, name: true, studioType: true },
          },
          musicParts: {
            include: {
              singer: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.musicRecord.count({
        where: { singers: { some: { id: userId } }, deletedAt: null },
      }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
