import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default class UserRepo {
    static async findUserById(userId: string) {
        return prisma.user.findFirst({
            where: {
                id: userId,
                isDeleted: false
            },
            select: {
                id: true,
                email: true,
                username: true,
                name: true,
                role: true,
                isActive: true,
                isDeleted: true,
                avatar: {
                    select: {
                        fileUrl: true
                    }
                },
                lastLoginAt: true,
                createdAt: true,
                updatedAt: true
            }
        });
    }

    static async softDeleteUser(userId: string) {
        return prisma.user.update({
            where: {
                id: userId
            },
            data: {
                isDeleted: true,
                isActive: false
            }
        });
    }

    static async invalidateUserSessions(userId: string) {
        return prisma.session.deleteMany({
            where: { userId }
        });
    }

    static async findAllUsers() {
        return prisma.user.findMany({
            where: {
                isDeleted: false  // Only get active users
            },
            select: {
                id: true,
                email: true,
                username: true,
                name: true,
                role: true,
                isActive: true,
                avatar: {
                    select: {
                        fileUrl: true
                    }
                },
                lastLoginAt: true,
                createdAt: true,
                updatedAt: true
            },
            orderBy: {
                createdAt: 'desc'  // Newest first
            }
        });
    }

    static async findUserByEmail(email: string) {
        return prisma.user.findUnique({
            where: { email }
        });
    }

    static async findUserByUsername(username: string) {
        return prisma.user.findUnique({
            where: { username }
        });
    }

    static async updateUser(userId: string, data: {
        username?: string;
        name?: string;
        email?: string;
    }) {
        return prisma.user.update({
            where: {
                id: userId,
                isDeleted: false
            },
            data,
            select: {
                id: true,
                email: true,
                username: true,
                name: true,
                role: true,
                isActive: true,
                avatar: {
                    select: {
                        fileUrl: true
                    }
                },
                lastLoginAt: true,
                createdAt: true,
                updatedAt: true
            }
        });
    }
}