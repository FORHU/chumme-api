import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
            name: "asc",
        },
    });
};

export const getUserEmotions = async (userId: string) => {
    return await prisma.userEmotionPreference.findMany({
        where: {
            userId,
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
        orderBy: {
            createdAt: "desc",
        },
    });
};

export const addUserEmotions = async (
    userId: string,
    emotionIds: string[]
) => {
    await prisma.userEmotionPreference.createMany({
        data: emotionIds.map((emotionId) => ({
            userId,
            emotionId,
        })),
        skipDuplicates: true,
    });
};

export const removeUserEmotion = async (
    userId: string,
    userEmotionId: string
) => {
    const deleted = await prisma.userEmotionPreference.delete({
        where: {
            id: userEmotionId,
            userId,
        },
    });

    return deleted;
};
