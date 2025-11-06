import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Upsert an emotion by name (case-insensitive)
 * Creates if doesn't exist, returns existing if it does
 */
export const upsertEmotion = async (emotionName: string) => {
    const normalizedName = emotionName.toLowerCase().trim();

    // Try to find existing emotion (case-insensitive)
    let emotion = await prisma.emotion.findFirst({
        where: {
            name: {
                equals: normalizedName,
                mode: 'insensitive'
            },
            isDeleted: false,
        },
    });

    // Create if doesn't exist
    if (!emotion) {
        emotion = await prisma.emotion.create({
            data: {
                name: normalizedName,
                description: `Auto-generated from Spotify emotion analysis`,
            },
        });
    }

    return emotion;
};

/**
 * Create a link between a video and an emotion
 * Uses upsert to avoid duplicates
 */
export const linkVideoToEmotion = async (
    videoId: string,
    emotionId: string
) => {
    return await prisma.videoEmotion.upsert({
        where: {
            videoId_emotionId: {
                videoId,
                emotionId,
            },
        },
        update: {}, // No updates needed if already exists
        create: {
            videoId,
            emotionId,
        },
    });
};

/**
 * Bulk link a video to multiple emotions
 * Returns array of created/existing VideoEmotion records
 */
export const linkVideoToEmotions = async (
    videoId: string,
    emotionNames: string[]
) => {
    const results = [];

    for (const emotionName of emotionNames) {
        if (!emotionName || emotionName.trim().length === 0) continue;

        // Upsert the emotion first
        const emotion = await upsertEmotion(emotionName);

        // Link to video
        const videoEmotion = await linkVideoToEmotion(videoId, emotion.id);
        results.push(videoEmotion);
    }

    return results;
};

/**
 * Get all emotions linked to a video
 */
export const getVideoEmotions = async (videoId: string) => {
    return await prisma.videoEmotion.findMany({
        where: {
            videoId,
            emotion: {
                isDeleted: false,
            },
        },
        include: {
            emotion: {
                select: {
                    id: true,
                    name: true,
                    description: true,
                    icon: true,
                },
            },
        },
    });
};

export default {
    upsertEmotion,
    linkVideoToEmotion,
    linkVideoToEmotions,
    getVideoEmotions,
};
