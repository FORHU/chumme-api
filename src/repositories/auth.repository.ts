import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default class AuthRepo {
    static async findUserByEmailOrUsername(email: string, username: string) {
        return prisma.user.findFirst({
            where: {
                OR: [{ email }, { username }],
                isDeleted: false
            }
        });
    }

    static async createUser(data: {
        email: string;
        password: string;
        username: string;
        name?: string;
    }) {
        return prisma.user.create({
            data: {
                ...data,
                provider: null
            },
            select: {
                id: true,
                email: true,
                username: true,
                name: true,
                role: true,
                createdAt: true,
                updatedAt: true
            }
        });
    }

    static async findUserByEmail(email: string) {
        return prisma.user.findUnique({
            where: {
                email,
                isDeleted: false
            },
            include: {
                avatar: {
                    select: {
                        fileUrl: true
                    }
                }
            }
        });
    }

    static async updateUserLoginStatus(userId: string) {
        return prisma.user.update({
            where: {
                id: userId,
                isDeleted: false
            },
            data: {
                isActive: true,
                lastLoginAt: new Date(),
                updatedAt: new Date() // This is handled automatically by @updatedAt
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
                lastLoginAt: true
            }
        });
    }

    static async createSession(data: {
        userId: string;
        token: string;
        expiresAt: Date;
    }) {
        return prisma.session.create({
            data: {
                ...data
            }
        });
    }
}