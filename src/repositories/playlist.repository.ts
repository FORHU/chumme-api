import { prisma } from "../utils/prisma";
import { Prisma } from "@prisma/client";

export default class PlaylistRepo {
  static async create(data: Prisma.MusicPlaylistUncheckedCreateInput) {
    return prisma.musicPlaylist.create({
      data,
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

  static async findAll() {
    return prisma.musicPlaylist.findMany({
      where: {
        deletedAt: null,
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
}
