import { prisma } from "../utils/prisma";
import { Prisma } from "@prisma/client";

export default class MusicRepo {
  static async create(data: any) {
    const { playlistId, order, metaData, parts, ...musicData } = data;
    return prisma.music.create({
      data: {
        ...musicData,
        parts: parts ? { create: parts } : undefined,
        playlists: playlistId
          ? {
              create: {
                playlistId: playlistId,
                order: order || 0,
              },
            }
          : undefined,
      },
      include: {
        musicFile: true,
        musicArtist: true,
        musicAlbum: true,
        parts: true,
      },
    });
  }

  static async findById(id: string) {
    return prisma.music.findUnique({
      where: { id },
      include: {
        musicArtist: true,
        featuredArtists: {
          include: {
            artist: true,
          },
        },
        musicAlbum: true,
        musicFile: true,
        parts: true,
      },
    });
  }

  static async findByTitle(title: string) {
    return prisma.music.findFirst({
      where: { title, deletedAt: null },
      include: {
        musicArtist: true,
        musicFile: true,
      },
    });
  }

  static async findAll(params: {
    page?: number;
    limit?: number;
    albumId?: string;
    artistId?: string;
    playlistId?: string;
    isKaraoke?: boolean;
  }) {
    const {
      page = 1,
      limit = 10,
      albumId,
      artistId,
      playlistId,
      isKaraoke,
    } = params;
    const skip = (page - 1) * limit;

    const whereClause: Prisma.MusicWhereInput = {
      deletedAt: null,
      ...(albumId && { musicAlbumId: albumId }),
      ...(artistId && { musicArtistId: artistId }),
      ...(isKaraoke !== undefined && { isKaraoke }),
      ...(playlistId && {
        playlists: {
          some: {
            playlistId: playlistId,
          },
        },
      }),
    };

    const [data, total] = await Promise.all([
      prisma.music.findMany({
        where: whereClause,
        take: limit,
        skip: skip,
        include: {
          musicArtist: true,
          featuredArtists: true,
          musicFile: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.music.count({
        where: whereClause,
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async update(id: string, data: any) {
    const { playlistId, order, metaData, ...musicData } = data;
    return prisma.music.update({
      where: { id },
      data: {
        ...musicData,
        playlists: playlistId
          ? {
              upsert: {
                where: {
                  musicId_playlistId: {
                    musicId: id,
                    playlistId: playlistId,
                  },
                },
                create: {
                  playlistId: playlistId,
                  order: order || 0,
                },
                update: {
                  order: order,
                },
              },
            }
          : undefined,
      },
      include: {
        musicFile: true,
        musicArtist: true,
        musicAlbum: true,
      },
    });
  }

  static async delete(id: string) {
    return prisma.music.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
