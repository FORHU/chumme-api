import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

export default class TodoSvc {
    static async register({
        email,
        password,
        username,
        name
    }: {
        email: string;
        password: string;
        username: string;
        name?: string;
    }) {
        const exists = await prisma.user.findFirst({
            where: { OR: [{ email }, { username }] }
        });

        if (exists) {
            const field = exists.email === email ? 'email' : 'username';
            throw `This ${field} is already registered`;
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        return prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                username,
                name,
                provider: null
            },
            select: {
                id: true,
                email: true,
                username: true,
                name: true,
                role: true,
                createdAt: true, //not sure if needed by client
                updatedAt: true
            }
        });
    }
}
