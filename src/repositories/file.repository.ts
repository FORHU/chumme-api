import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default class FileRepo {
    // Save / create file record 
    static async createFile(data: { filename?: string | null; fileUrl?: string | null }) {
        return prisma.file.create({
            data: {
                filename: data.filename ?? null,
                fileUrl: data.fileUrl ?? null
            }
        });
    }

    // helper to search
    static async findFileById(fileId: string) {
        return prisma.file.findUnique({ where: { id: fileId } });
    }
}