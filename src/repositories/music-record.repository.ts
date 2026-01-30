import { prisma } from "../utils/prisma";

interface CreateMusicRecordData {
  userIds: string[];
  musicId: string;
  fileId: string;
}

export default class MusicRecordRepo {
  /**
   * Create a new MusicRecord (user's karaoke recording)
   */
  static async create(data: CreateMusicRecordData) {
    return prisma.musicRecord.create({
      data: {
        users: {
          connect: data.userIds.map((id) => ({ id })),
        },
        musicId: data.musicId,
        fileId: data.fileId,
      },
      include: {
        users: true,
        music: {
          include: {
            musicArtist: true,
          },
        },
        file: true,
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
        users: true,
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
          users: true,
          music: {
            include: {
              musicArtist: true,
            },
          },
          file: true,
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
   * Get MusicRecords by userId with pagination
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
        where: {
          users: {
            some: { id: userId },
          },
          deletedAt: null,
        },
        include: {
          users: true,
          music: {
            include: {
              musicArtist: true,
            },
          },
          file: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.musicRecord.count({
        where: {
          users: {
            some: { id: userId },
          },
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
          users: true,
          file: true,
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
