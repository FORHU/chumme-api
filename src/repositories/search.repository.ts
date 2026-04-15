import { prisma } from "../utils/prisma";

export default class SearchRepo {
  static async searchTracks(q: string, limit: number) {
    return prisma.music.findMany({
      where: {
        deletedAt: null,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { genre: { contains: q, mode: "insensitive" } },
          { musicArtist: { name: { contains: q, mode: "insensitive" } } },
        ],
      },
      take: limit,
      orderBy: { playCount: "desc" },
      include: {
        musicArtist: true,
        musicAlbum: true,
        musicFile: true,
      },
    });
  }

  static async searchAlbums(q: string, limit: number) {
    return prisma.musicAlbum.findMany({
      where: {
        deletedAt: null,
        OR: [
          { album: { contains: q, mode: "insensitive" } },
          { genre: { contains: q, mode: "insensitive" } },
          { musicArtist: { name: { contains: q, mode: "insensitive" } } },
        ],
      },
      take: limit,
      include: {
        musicArtist: true,
        music: { take: 3, include: { musicFile: true } },
      },
    });
  }

  static async searchArtists(q: string, limit: number) {
    return prisma.chummeArtist.findMany({
      where: {
        isDeleted: false,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { bio: { contains: q, mode: "insensitive" } },
        ],
      },
      take: limit,
    });
  }

  static async searchPlaylists(q: string, limit: number) {
    return prisma.musicPlaylist.findMany({
      where: {
        deletedAt: null,
        isPublic: true,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      },
      take: limit,
      include: {
        tracks: {
          take: 3,
          include: { music: { include: { musicFile: true } } },
          orderBy: { order: "asc" },
        },
      },
    });
  }
}
