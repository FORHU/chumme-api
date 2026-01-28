import { prisma } from "../utils/prisma";
import { Prisma } from "@prisma/client";

export default class MusicAlbumRepo {
  static async findByTitle(title: string) {
    return prisma.musicAlbum.findFirst({
      where: { album: title, deletedAt: null },
    });
  }

  static async create(data: Prisma.MusicAlbumUncheckedCreateInput) {
    return prisma.musicAlbum.create({
      data,
    });
  }

  static async findById(id: string) {
    return prisma.musicAlbum.findUnique({
      where: { id },
      include: {
        musicArtist: true,
        music: true,
      },
    });
  }

  static async findAll(params: {
    artistId?: string;
    genre?: string;
    language?: string;
  }) {
    const { artistId, genre, language } = params;
    return prisma.musicAlbum.findMany({
      where: {
        musicArtistId: artistId,
        genre,
        language,
        deletedAt: null,
      },
      include: {
        musicArtist: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  static async update(id: string, data: Prisma.MusicAlbumUncheckedUpdateInput) {
    return prisma.musicAlbum.update({
      where: { id },
      data,
    });
  }

  static async delete(id: string) {
    return prisma.musicAlbum.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
