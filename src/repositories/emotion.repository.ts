import { Prisma } from "@prisma/client";
import { prisma } from "../utils/prisma";

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

// Video linking logic removed as we move to a unified SocialFeedItem structure.

/**
 * Get all emotions from the database
 * Returns only non-deleted emotions
 */
export const getAllEmotions = async () => {
    return await prisma.emotion.findMany({
        where: {
            isDeleted: false,
        },
        select: {
            id: true,
            name: true,
            description: true,
            icon: true,
        },
        orderBy: {
            name: 'asc',
        },
    });
};

export default {
    upsertEmotion,
    getAllEmotions,
};
