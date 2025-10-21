import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

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
        const salt = crypto.randomBytes(16).toString('hex');
        const hashedPassword = crypto
            .pbkdf2Sync(data.password, salt, 1000, 64, 'sha512')
            .toString('hex');

        return prisma.user.create({
            data: {
                email: data.email,
                password: `${salt}:${hashedPassword}`,
                username: data.username,
                name: data.name,
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