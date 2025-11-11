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
            id?: string;
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
                id: data.id,
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

    /**
     * Find videos by emotion name and optionally filter by artist IDs
     * @param emotionName - The emotion to search for (case-insensitive)
     * @param artistIds - Optional array of artist IDs to filter by
     * @param limit - Maximum number of results to return
     * @returns Array of videos with their relations
     */
    static async findVideosByEmotionAndArtist(
        emotionName: string,
        artistIds?: string[],
        limit: number = 10
    ) {
        const whereClause: any = {
            isDeleted: false,
            videoEmotions: {
                some: {
                    emotion: {
                        name: {
                            equals: emotionName.toLowerCase(),
                            mode: 'insensitive'
                        },
                        isDeleted: false
                    }
                }
            }
        };

        // Only add artist filter if artistIds are provided
        if (artistIds && artistIds.length > 0) {
            whereClause.artistId = { in: artistIds };
        }

        return prisma.video.findMany({
            where: whereClause,
            include: {
                file: true,
                artist: true,
                videoEmotions: {
                    include: {
                        emotion: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: limit
        });
    }
}