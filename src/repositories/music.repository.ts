import { prisma } from "../utils/prisma";
import { Prisma } from "@prisma/client";

export default class MusicRepo {
  static async create(data: any) {
    const {
      playlistId,
      order,
      metaData,
      meta_data,
      parts,
      musicAlbumId,
      musicArtistId,
      musicFileId,
      ...musicData
    } = data;

    // Use either camelCase or snake_case input
    const finalMetaData = metaData || meta_data;

    // 1. Update File Metadata if needed (Prisma doesn't allow update on create relation)
    if (musicFileId && finalMetaData) {
      await prisma.musicLibrary.update({
        where: { id: musicFileId },
        data: { metaData: finalMetaData },
      });
    }

    return prisma.music.create({
      data: {
        ...musicData,
        // Connect relations if IDs are present
        musicAlbum: musicAlbumId
          ? { connect: { id: musicAlbumId } }
          : undefined,
        musicArtist: musicArtistId
          ? { connect: { id: musicArtistId } }
          : undefined,
        musicFile: musicFileId ? { connect: { id: musicFileId } } : undefined,
        parts: parts ? { create: parts } : undefined,
        musicSubPlaylists: playlistId
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
        musicFeaturedArtists: {
          include: {
            chummeArtist: true,
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

  static async findDuplicate(params: {
    title: string;
    musicArtistId?: string | null;
    musicAlbumId?: string | null;
    isKaraoke: boolean;
  }) {
    return prisma.music.findFirst({
      where: {
        title: params.title,
        musicArtistId: params.musicArtistId || null,
        musicAlbumId: params.musicAlbumId || null,
        isKaraoke: params.isKaraoke,
        deletedAt: null,
      },
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
    search?: string;
    genre?: string;
    sort?: "popular" | "newest" | "oldest";
  }) {
    const {
      page = 1,
      limit = 10,
      albumId,
      artistId,
      playlistId,
      isKaraoke,
      search,
      genre,
      sort,
    } = params;
    const skip = (page - 1) * limit;

    const whereClause: Prisma.MusicWhereInput = {
      deletedAt: null,
      //  search: WHERE (title LIKE %search% OR artist.name LIKE %search%)
      ...(search && {
        OR: [
          { title: { contains: search, mode: "insensitive" as const } },
          {
            musicArtist: {
              name: { contains: search, mode: "insensitive" as const },
            },
          },
        ],
      }),
      ...(albumId && { musicAlbumId: albumId }),
      ...(artistId && { musicArtistId: artistId }),
      ...(isKaraoke !== undefined && { isKaraoke }),
      ...(genre && { genre }),
      ...(playlistId && {
        musicSubPlaylists: {
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
          musicFeaturedArtists: {
            include: {
              chummeArtist: true,
            },
          },
          musicFile: true,
          parts: true,
          musicAlbum: true,
        },
        orderBy:
          sort === "popular"
            ? { playCount: "desc" }
            : sort === "oldest"
              ? { createdAt: "asc" }
              : { createdAt: "desc" },
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

  static async findNewReleases(params: { limit: number; cursor?: string }) {
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const rows = await prisma.music.findMany({
      where: { deletedAt: null, createdAt: { gte: since } },
      take: params.limit + 1,
      ...(params.cursor && { cursor: { id: params.cursor }, skip: 1 }),
      orderBy: { createdAt: "desc" },
      include: {
        musicArtist: true,
        musicAlbum: true,
        musicFile: true,
        parts: true,
      },
    });

    const hasNextPage = rows.length > params.limit;
    const items = hasNextPage ? rows.slice(0, params.limit) : rows;
    const nextCursor = hasNextPage ? items[items.length - 1].id : null;
    return { items, nextCursor, hasNextPage };
  }

  static async findTrending(limit: number) {
    const since = new Date();
    since.setDate(since.getDate() - 7);

    return prisma.music.findMany({
      where: { deletedAt: null, updatedAt: { gte: since } },
      take: limit,
      orderBy: { playCount: "desc" },
      include: {
        musicArtist: true,
        musicAlbum: true,
        musicFile: true,
        parts: true,
      },
    });
  }

  static async incrementPlayCount(id: string) {
    return prisma.music.update({
      where: { id },
      data: { playCount: { increment: 1 } },
    });
  }

  static async update(id: string, data: any) {
    const { playlistId, order, ...musicData } = data;
    return prisma.music.update({
      where: { id },
      data: {
        ...musicData,
        musicSubPlaylists: playlistId
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
