import { prisma } from "../utils/prisma";

export default class PostRepo {
    static async createPost(data: {
        userId: string;
        content: string;
        mediaUrls?: string[];
    }) {
        return prisma.post.create({
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

    static async upsertPost(
        where: { externalUrl: string },
        data: {
            id?: string;
            title: string;
            fileId: string;
            platform: any;
            externalUrl: string;
            artistId?: string | null;
            meta_data?: any | null;
        }
    ) {
        const existing = await prisma.post.findUnique({ where });
        const isUpdate = !!existing;

        // const post = await prisma.post.upsert({
        //     where: where,
        //     create: {

        //     }
        // })
    }

    static async findPostById(postId: string) {
        return prisma.post.findUnique({
            where: {
                id: postId,
                isDeleted: false,
            },
        });
    }

    static async findLike(postId: string, userId: string) {
        // Find like regardless of isDeleted status
        return prisma.like.findFirst({
            where: {
                postId,
                userId,
            },
        });
    }

    static async createLike(postId: string, userId: string) {
        return prisma.like.create({
            data: {
                postId,
                userId,
            },
        });
    }

    static async softDeleteLike(likeId: string) {
        return prisma.like.update({
            where: { id: likeId },
            data: { isDeleted: true },
        });
    }

    static async reactivateLike(likeId: string) {
        return prisma.like.update({
            where: { id: likeId },
            data: { isDeleted: false },
        });
    }

    static async getLikesCount(postId: string) {
        return prisma.like.count({
            where: {
                postId,
                isDeleted: false,
            },
        });
    }

    static async createComment(data: {
        postId: string;
        userId: string;
        content: string;
    }) {
        return prisma.comment.create({
            data: {
                postId: data.postId,
                userId: data.userId,
                content: data.content,
            },
            select: {
                id: true,
                postId: true,
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
        return prisma.comment.findMany({
            where: {
                postId,
                isDeleted: false,
            },
            select: {
                id: true,
                postId: true,
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
                createdAt: "desc", // Newest comments first
            },
        });
    }

    static async getCommentsCount(postId: string) {
        return prisma.comment.count({
            where: {
                postId,
                isDeleted: false,
            },
        });
    }

    static async getPostsByUserId(userId: string) {
        return prisma.post.findMany({
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
                        likes: {
                            where: {
                                isDeleted: false,
                            },
                        },
                        comments: {
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
    }

    static async getFeedPosts(userId: string) {
        return prisma.post.findMany({
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
                        likes: {
                            where: {
                                isDeleted: false,
                            },
                        },
                        comments: {
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
    }
}
