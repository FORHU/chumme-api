import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
                mediaUrls: data.mediaUrls || []
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
                                fileUrl: true
                            }
                        }
                    }
                }
            }
        });
    }

    static async findPostById(postId: string) {
        return prisma.post.findUnique({
            where: {
                id: postId,
                isDeleted: false
            }
        });
    }

    static async findLike(postId: string, userId: string) {
        // Find like regardless of isDeleted status
        return prisma.like.findFirst({
            where: {
                postId,
                userId
            }
        });
    }

    static async createLike(postId: string, userId: string) {
        return prisma.like.create({
            data: {
                postId,
                userId
            }
        });
    }

    static async softDeleteLike(likeId: string) {
        return prisma.like.update({
            where: { id: likeId },
            data: { isDeleted: true }
        });
    }

    static async reactivateLike(likeId: string) {
        return prisma.like.update({
            where: { id: likeId },
            data: { isDeleted: false }
        });
    }

    static async getLikesCount(postId: string) {
        return prisma.like.count({
            where: {
                postId,
                isDeleted: false
            }
        });
    }
}