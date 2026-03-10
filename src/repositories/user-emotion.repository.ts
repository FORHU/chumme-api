import { Prisma } from "@prisma/client";
import { prisma } from "../utils/prisma";


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
