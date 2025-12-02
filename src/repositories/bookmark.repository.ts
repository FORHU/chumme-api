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

  static async getBookmarksByIds(bookmarkIds: string[]) {
    const bookmarks = await prisma.bookmark.findMany({
      where: { id: { in: bookmarkIds } },
      select: {
        id: true,
        feed: {
          select: {
            video: {
              select: {
                id: true,
                meta_data: true,
                artist: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    type VideoMetaData = { caption?: string; [key: string]: any };

    return bookmarks.map((bookmark) => {
      const video = bookmark.feed?.video;
      const metaData = video?.meta_data as VideoMetaData | undefined;

      return {
        ...bookmark,
        feed: bookmark.feed
          ? {
              ...bookmark.feed,
              video: video
                ? {
                    id: video.id,
                    artist: video.artist ?? null,
                    caption: metaData?.caption ?? null,
                  }
                : null,
            }
          : null,
      };
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
