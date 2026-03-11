import { Prisma } from "@prisma/client";
import { prisma } from "../utils/prisma";

export default class OnboardingRepo {

    static async getOnboardingStatus(userId: string) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                onboardingCompleted: true,
                userInterests: {
                    where: { user: { isDeleted: false } },
                    select: {
                        interestId: true,
                        interest: {
                            select: {
                                id: true,
                                name: true,
                                description: true,
                                icon: true
                            }
                        }
                    }
                },
                userEmotionPreferences: {
                    where: { user: { isDeleted: false } },
                    select: {
                        emotionId: true,
                        emotion: {
                            select: {
                                id: true,
                                name: true,
                                description: true,
                                icon: true
                            }
                        }
                    }
                },
                socialUserDiscoveries: {
                    where: { user: { isDeleted: false } }
                }

            }
        });

        return user;
    }

    static async saveInterests(userId: string, interestIds: string[]) {
        // Delete all existing interests for this user
        await prisma.userInterest.deleteMany({
            where: { userId }
        });

        // Create new interest selections
        if (interestIds.length > 0) {
            await prisma.userInterest.createMany({
                data: interestIds.map(interestId => ({
                    userId,
                    interestId
                }))
            });
        }

        // Return updated selections
        return prisma.userInterest.findMany({
            where: { userId },
            include: {
                interest: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        icon: true
                    }
                }
            }
        });
    }

    static async saveEmotions(userId: string, emotionIds: string[]) {
        // Delete all existing emotions for this user
        await prisma.userEmotionPreference.deleteMany({
            where: { userId }
        });

        // Create new emotion selections
        if (emotionIds.length > 0) {
            await prisma.userEmotionPreference.createMany({
                data: emotionIds.map(emotionId => ({
                    userId,
                    emotionId
                }))
            });
        }

        // Return updated selections
        return prisma.userEmotionPreference.findMany({
            where: { userId },
            include: {
                emotion: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        icon: true
                    }
                }
            }
        });
    }

    static async saveArtists(userId: string, artistIds: string[]) {
        // Relation chummeArtists was removed from SocialUserDiscovery
        return [];
    }


    static async completeOnboarding(userId: string) {
        return prisma.user.update({
            where: { id: userId },
            data: {
                onboardingCompleted: true
            },
            select: {
                id: true,
                email: true,
                username: true,
                onboardingCompleted: true
            }
        });
    }
}
