import { prisma } from "../utils/prisma";

export default class BookmarkRepo {
  static async fetchUserBookmarks(
    userId: string,
    page: number = 0,
    limit: number = 20
  ) {
    return prisma.bookmark.findMany({
      where: { userId },
      select: {
        id: true,
        postId: true,
        userId: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
      },
      orderBy: { createdAt: "desc" },
      skip: page * limit,
      take: limit,
    });
  }

  static async deleteUserBookmark(bookmarkId: string) {
    return prisma.bookmark.delete({ where: { id: bookmarkId } });
  }

  static async createUserBookmark(bookmarkId: string, userId: string) {
    return prisma.bookmark.create({
      data: {
        id: bookmarkId,
        userId,
      },
    });
  }
}
