import { prisma } from "../utils/prisma";
import { Prisma } from "@prisma/client";

export default class PlaylistRepo {
  static async create(data: Prisma.PlaylistUncheckedCreateInput) {
    return prisma.playlist.create({
      data,
    });
  }

  static async findById(id: string) {
    return prisma.playlist.findUnique({
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
    return prisma.playlist.findMany({
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

  static async update(id: string, data: Prisma.PlaylistUncheckedUpdateInput) {
    return prisma.playlist.update({
      where: { id },
      data,
    });
  }

  static async delete(id: string) {
    return prisma.playlist.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
