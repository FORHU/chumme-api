import { prisma } from "../utils/prisma";

interface CreateMusicRecordData {
  studioId: string;
  musicId: string;
  fileId: string;
  singerIds?: string[]; // Optional array of user IDs who participated
  metaData?: any;
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
        singers: data.singerIds
          ? { connect: data.singerIds.map((id) => ({ id })) }
          : undefined,
      },
      include: {
        studio: true,
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
        studio: true,
        music: {
          include: {
            musicArtist: true,
            featuredArtists: {
              include: {
                artist: true,
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
  static async findAll(params: { page?: number; limit?: number } = {}) {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      prisma.musicRecord.findMany({
        where: { deletedAt: null },
        include: {
          studio: true,
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
      prisma.musicRecord.count({
        where: { deletedAt: null },
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

  /**
   * Get MusicRecords by studioId with pagination
   */
  static async findByStudioId(
    studioId: string,
    params: { page?: number; limit?: number } = {},
  ) {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      prisma.musicRecord.findMany({
        where: {
          studioId: studioId,
          deletedAt: null,
        },
        include: {
          studio: true,
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
      prisma.musicRecord.count({
        where: {
          studioId: studioId,
          deletedAt: null,
        },
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

  /**
   * Get MusicRecords by musicId (all recordings of a song) with pagination
   */
  static async findByMusicId(
    musicId: string,
    params: { page?: number; limit?: number } = {},
  ) {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      prisma.musicRecord.findMany({
        where: { musicId, deletedAt: null },
        include: {
          studio: true,
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
      prisma.musicRecord.count({
        where: { musicId, deletedAt: null },
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

  /**
   * Soft delete a MusicRecord
   */
  static async delete(id: string) {
    return prisma.musicRecord.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
