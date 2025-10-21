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