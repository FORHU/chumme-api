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
}