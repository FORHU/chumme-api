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
}