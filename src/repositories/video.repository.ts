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

    // Create or update video (upsert) - uses externalUrl as unique key
    static async upsertVideo(
        where: { externalUrl: string },
        data: {
            title: string;
            fileId: string;
            platform: any;
            externalUrl: string;
            artistId?: string | null;
            meta_data?: any | null;
        }
    ) {
        // Check if record exists before upserting
        const existing = await prisma.video.findUnique({ where });
        const isUpdate = !!existing;

        const video = await prisma.video.upsert({
            where: where,
            create: {
                title: data.title,
                fileId: data.fileId,
                platform: data.platform,
                externalUrl: data.externalUrl,
                artistId: data.artistId ?? null,
                meta_data: data.meta_data ?? null
            },
            update: {
                title: data.title,
                fileId: data.fileId,
                platform: data.platform,
                externalUrl: data.externalUrl,
                artistId: data.artistId ?? null,
                meta_data: data.meta_data ?? null
            }
        });

        return { video, isUpdate };
    }
}