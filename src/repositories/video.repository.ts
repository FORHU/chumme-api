import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default class VideoRepo {
    // Save / create video record
    static async createVideo(data: {
        title: string;
        fileId: string;
        platform: any;
        artistId?: string | null;
        meta_data?: any | null;
    }) {
        return prisma.video.create({
            data: {
                title: data.title,
                fileId: data.fileId,
                platform: data.platform,
                artistId: data.artistId ?? null,
                meta_data: data.meta_data ?? null
            }
        });
    }
}