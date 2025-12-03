import { prisma } from "../utils/prisma";

export default class BookmarkRepo {
  static async fetchUserBookmarks(
    userId: string,
    page: number = 0,
    limit: number = 20
  ) {
    return prisma.bookmark.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip: page * limit,
      take: limit,
      select: {
        id: true,
        createdAt: true,
        feed: {
          select: {
            type: true,
            postId: true,
            video: {
              select: {
                id: true,
                title: true,
                artistId: true,
                meta_data: true,
                createdAt: true,
                file: {
                  select: {
                    fileUrl: true,
                  },
                },
              },
            },
            post: {
              select: {
                id: true,
                content: true,
                mediaUrls: true,
                createdAt: true,
                comments: true,
                feedItems: true,
                likes: true,
                user: true,
              },
            },
            MediaPost: {
              select: {
                id: true,
                title: true,
                file: {
                  select: {
                    fileUrl: true,
                  },
                },
                mediaPostEmotions: true,
              },
            },
          },
        },
      },
    });
  }

  static async getBookmark(query: any) {
    return prisma.bookmark.findUnique({
      where: query,
    });
  }

  static async removeBookmarksInFeedItem(feedId: string) {
    return prisma.bookmark.deleteMany({ where: { feedId } });
  }

  static async deleteUserBookmark(bookmarkId: string) {
    return prisma.bookmark.delete({ where: { id: bookmarkId } });
  }

  static async createUserBookmark(userId: string, feedId: string) {
    return prisma.bookmark.create({
      data: {
        feedId,
        userId,
      },
    });
  }
}
