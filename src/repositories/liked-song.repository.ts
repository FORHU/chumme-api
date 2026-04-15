import { prisma } from "../utils/prisma";

export default class LikedSongRepo {
  static async findByUserAndMusic(userId: string, musicId: string) {
    return prisma.userLikedSong.findUnique({
      where: { userId_musicId: { userId, musicId } },
    });
  }

  static async create(userId: string, musicId: string) {
    return prisma.userLikedSong.create({
      data: { userId, musicId },
    });
  }

  static async delete(userId: string, musicId: string) {
    return prisma.userLikedSong.delete({
      where: { userId_musicId: { userId, musicId } },
    });
  }

  static async countByMusic(musicId: string) {
    return prisma.userLikedSong.count({ where: { musicId } });
  }

  static async findAllByUser(
    userId: string,
    params: { limit: number; cursor?: string },
  ) {
    const { limit, cursor } = params;

    const rows = await prisma.userLikedSong.findMany({
      where: { userId },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      orderBy: { createdAt: "desc" },
      include: {
        music: {
          include: {
            musicArtist: true,
            musicAlbum: true,
            musicFile: true,
            parts: true,
          },
        },
      },
    });

    const hasNextPage = rows.length > limit;
    const items = hasNextPage ? rows.slice(0, limit) : rows;
    const nextCursor = hasNextPage ? items[items.length - 1].id : null;

    return { items, nextCursor, hasNextPage };
  }
}
