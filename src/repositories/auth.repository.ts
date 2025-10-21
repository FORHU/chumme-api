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
}