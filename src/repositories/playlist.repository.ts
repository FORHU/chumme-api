import { prisma } from "../utils/prisma";
import { Prisma } from "@prisma/client";

export default class PlaylistRepo {
  static async create(data: Prisma.MusicPlaylistUncheckedCreateInput) {
    return prisma.musicPlaylist.create({
      data,
    });
  }

  static async findOwner(id: string) {
    return prisma.musicPlaylist.findUnique({
      where: { id },
      select: { userId: true, deletedAt: true },
    });
  }

  static async findById(id: string) {
    return prisma.musicPlaylist.findUnique({
      where: { id },
      include: {
        tracks: {
          include: {
            music: true,
          },
          orderBy: {
            order: "asc",
          },
        },
      },
    });
  }

  static async findAll(userId?: string) {
    return prisma.musicPlaylist.findMany({
      where: {
        deletedAt: null,
        ...(userId ? { userId } : { isPublic: true }),
      },
      include: {
        tracks: {
          include: {
            music: true,
          },
          orderBy: {
            order: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  static async update(
    id: string,
    data: Prisma.MusicPlaylistUncheckedUpdateInput,
  ) {
    return prisma.musicPlaylist.update({
      where: { id },
      data,
    });
  }

  static async delete(id: string) {
    return prisma.musicPlaylist.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  static async findTrack(playlistId: string, musicId: string) {
    return prisma.musicSubPlaylist.findUnique({
      where: { musicId_playlistId: { musicId, playlistId } },
    });
  }

  static async addTrack(playlistId: string, musicId: string, order: number) {
    const maxOrder = await prisma.musicSubPlaylist.aggregate({
      where: { playlistId },
      _max: { order: true },
    });
    const nextOrder =
      order ?? (maxOrder._max.order !== null ? maxOrder._max.order + 1 : 0);

    return prisma.musicSubPlaylist.create({
      data: { playlistId, musicId, order: nextOrder },
      include: { music: { include: { musicArtist: true, musicFile: true } } },
    });
  }

  static async removeTrack(playlistId: string, musicId: string) {
    return prisma.musicSubPlaylist.delete({
      where: { musicId_playlistId: { musicId, playlistId } },
    });
  }

  static async reorderTracks(
    playlistId: string,
    trackOrder: { musicId: string; order: number }[],
  ) {
    await prisma.$transaction(
      trackOrder.map(({ musicId, order }) =>
        prisma.musicSubPlaylist.update({
          where: { musicId_playlistId: { musicId, playlistId } },
          data: { order },
        }),
      ),
    );
  }
}
