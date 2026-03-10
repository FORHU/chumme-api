import { prisma } from "../utils/prisma";

export default class SocialPostRepo {
  static async createPost(data: {
    userId: string;
    content: string;
    mediaUrls?: string[];
  }) {
    return prisma.socialUserPost.create({
      data: {
        userId: data.userId,
        content: data.content,
        mediaUrls: data.mediaUrls || [],
      },
      select: {
        id: true,
        userId: true,
        content: true,
        mediaUrls: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: {
              select: {
                fileUrl: true,
              },
            },
          },
        },
      },
    });
  }

  static async findPostById(postId: string) {
    return prisma.socialUserPost.findUnique({
      where: {
        id: postId,
        isDeleted: false,
      },
    });
  }

  static async findLike(postId: string, userId: string) {
    return prisma.socialUserLike.findFirst({
      where: {
        socialPostId: postId,
        userId,
      },
    });
  }

  static async createLike(postId: string, userId: string) {
    return prisma.socialUserLike.create({
      data: {
        socialPostId: postId,
        userId,
      },
    });
  }

  static async softDeleteLike(likeId: string) {
    return prisma.socialUserLike.update({
      where: { id: likeId },
      data: { isDeleted: true },
    });
  }

  static async reactivateLike(likeId: string) {
    return prisma.socialUserLike.update({
      where: { id: likeId },
      data: { isDeleted: false },
    });
  }

  static async getLikesCount(postId: string) {
    return prisma.socialUserLike.count({
      where: {
        socialPostId: postId,
        isDeleted: false,
      },
    });
  }

  static async createComment(data: {
    postId: string;
    userId: string;
    content: string;
  }) {
    return prisma.socialUserComment.create({
      data: {
        socialUserPostId: data.postId,
        userId: data.userId,
        content: data.content,
      },
      select: {
        id: true,
        socialUserPostId: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: {
              select: {
                fileUrl: true,
              },
            },
          },
        },
      },
    });
  }

  static async getCommentsByPostId(postId: string) {
    return prisma.socialUserComment.findMany({
      where: {
        socialUserPostId: postId,
        isDeleted: false,
      },
      select: {
        id: true,
        socialUserPostId: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: {
              select: {
                fileUrl: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  static async getCommentsCount(postId: string) {
    return prisma.socialUserComment.count({
      where: {
        socialUserPostId: postId,
        isDeleted: false,
      },
    });
  }

  static async getPostsByUserId(userId: string) {
    const posts = await prisma.socialUserPost.findMany({
      where: {
        userId,
        isDeleted: false,
      },
      select: {
        id: true,
        userId: true,
        content: true,
        mediaUrls: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: {
              select: {
                fileUrl: true,
              },
            },
          },
        },
        _count: {
          select: {
            socialUserLikes: {
              where: {
                isDeleted: false,
              },
            },
            socialUserComments: {
              where: {
                isDeleted: false,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return posts.map((post) => {
      (post as any)._count = {
        likes: (post as any)._count.socialUserLikes,
        comments: (post as any)._count.socialUserComments,
      };
      return post;
    });
  }

  static async getFeedPosts(userId: string) {
    const posts = await prisma.socialUserPost.findMany({
      where: {
        isDeleted: false,
        user: {
          followers: {
            some: {
              followerId: userId,
              isDeleted: false,
            },
          },
        },
      },
      select: {
        id: true,
        userId: true,
        content: true,
        mediaUrls: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: {
              select: {
                fileUrl: true,
              },
            },
          },
        },
        _count: {
          select: {
            socialUserLikes: {
              where: {
                isDeleted: false,
              },
            },
            socialUserComments: {
              where: {
                isDeleted: false,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return posts.map((post) => {
      (post as any)._count = {
        likes: (post as any)._count.socialUserLikes,
        comments: (post as any)._count.socialUserComments,
      };
      return post;
    });
  }
}
