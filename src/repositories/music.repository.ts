import { prisma } from "../utils/prisma";
import { Prisma } from "@prisma/client";

export default class MusicRepo {
  static async create(data: any) {
    const { playlistId, order, ...musicData } = data;
    return prisma.music.create({
      data: {
        ...musicData,
        playlists: playlistId
          ? {
              create: {
                playlistId: playlistId,
                order: order || 0,
              },
            }
          : undefined,
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
      },
    });
  }

  static async findAll(params: {
    albumId?: string;
    artistId?: string;
    playlistId?: string;
  }) {
    const { albumId, artistId, playlistId } = params;
    return prisma.music.findMany({
      where: {
        musicAlbumId: albumId,
        musicArtistId: artistId,
        playlists: playlistId
          ? {
              some: {
                playlistId: playlistId,
              },
            }
          : undefined,
        deletedAt: null,
      },
      include: {
        musicArtist: true,
        featuredArtists: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  static async update(id: string, data: any) {
    const { playlistId, order, ...musicData } = data;
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
    });
  }

  static async delete(id: string) {
    return prisma.music.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
