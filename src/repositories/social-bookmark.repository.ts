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
    const bookmarks = await prisma.socialUserBookmark.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip: page * limit,
      take: limit,
      select: {
        id: true,
        createdAt: true,
        socialFeedItem: {
          select: {
            id: true,
            type: true,
            postId: true,
            // Flat fields
            title: true,
            externalUrl: true,
            platform: true,
            metaData: true,
            createdAt: true,
            artist: true,
            stats: true,
            post: {
              select: {
                id: true,
                content: true,
                mediaUrls: true,
                createdAt: true,
                user: {
                  select: {
                    id: true,
                    username: true,
                    name: true,
                    avatar: { select: { fileUrl: true } },
                  },
                },
                _count: {
                  select: {
                    socialUserLikes: { where: { isDeleted: false } },
                    socialUserComments: { where: { isDeleted: false } },
                  },
                },
              },
            },
          },
        },
      },
    });

    return bookmarks.map((item: any) => {
      const meta = item.socialFeedItem?.metaData as any;

      const filteredMeta: NeededMetaData = {
        caption: meta?.caption || null,
        artist: meta?.musicData?.artist || null,
        fullTitle: meta?.musicData?.fullTitle || null,
        songTitle: meta?.musicData?.songTitle || null,
      };

      if (item.socialFeedItem?.post) {
        (item.socialFeedItem.post as any)._count = {
          likes: (item.socialFeedItem.post as any)._count.socialUserLikes,
          comments: (item.socialFeedItem.post as any)._count.socialUserComments,
        };
      }

      return {
        ...item,
        feed: {
          ...item.socialFeedItem,
          video: {
            id: item.socialFeedItem?.id,
            title: item.socialFeedItem?.title,
            meta_data: filteredMeta,
            externalUrl: item.socialFeedItem?.externalUrl,
          },
        },
      };
    });
  }

  static async getBookmark(query: any) {
    return prisma.socialUserBookmark.findUnique({
      where: query,
    });
  }

  static async removeBookmarksInFeedItem(socialFeedItemId: string) {
    return prisma.socialUserBookmark.deleteMany({ where: { socialFeedItemId } });
  }

  static async deleteUserBookmark(bookmarkId: string) {
    return prisma.socialUserBookmark.delete({ where: { id: bookmarkId } });
  }

  static async createUserBookmark(userId: string, socialFeedItemId: string) {
    return prisma.socialUserBookmark.create({
      data: {
        socialFeedItemId,
        userId,
      },
    });
  }
}
