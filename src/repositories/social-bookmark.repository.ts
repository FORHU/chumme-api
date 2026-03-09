import { prisma } from "../utils/prisma";
type NeededMetaData = {
  caption?: string;
  artist?: string;
  fullTitle?: string;
  songTitle?: string;
};
export default class SocialBookmarkRepo {
  static async fetchUserBookmarks(
    userId: string,
    page: number = 0,
    limit: number = 20,
  ) {
    const bookmarks = await prisma.socialBookmark.findMany({
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

    return bookmarks.map((item) => {
      const meta = item.feed?.video?.meta_data as any;

      const filteredMeta: NeededMetaData = {
        caption: meta?.caption || null,
        artist: meta?.musicData?.artist || null,
        fullTitle: meta?.musicData?.fullTitle || null,
        songTitle: meta?.musicData?.songTitle || null,
      };

      return {
        ...item,
        feed: {
          ...item.feed,
          video: {
            ...item.feed?.video,
            meta_data: filteredMeta,
          },
        },
      };
    });
  }

  static async getBookmark(query: any) {
    return prisma.socialBookmark.findUnique({
      where: query,
    });
  }

  static async removeBookmarksInFeedItem(feedId: string) {
    return prisma.socialBookmark.deleteMany({ where: { feedId } });
  }

  static async deleteUserBookmark(bookmarkId: string) {
    return prisma.socialBookmark.delete({ where: { id: bookmarkId } });
  }

  static async createUserBookmark(userId: string, feedId: string) {
    return prisma.socialBookmark.create({
      data: {
        feedId,
        userId,
      },
    });
  }
}
