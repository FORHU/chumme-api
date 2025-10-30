import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default class UserRepo {

    static async findUserById(userId: string) {
        return prisma.user.findUnique({
            where: {
                id: userId,
                isDeleted: false
            },
            select: {
                id: true,
                email: true,
                name: true,
                username: true,
                role: true,
                isActive: true,
                isDeleted: true,
                lastLoginAt: true,
                createdAt: true,
                updatedAt: true,
                provider: true,
                mobileNumber: true,
                isEmailVerified: true,
                onboardingCompleted: true,
                avatar: {
                    select: {
                        id: true,
                        filename: true,
                        fileUrl: true,
                        createdAt: true,
                        updatedAt: true
                    }
                },
                userInterests: {
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
                },
                userEmotionPreferences: {
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
                },
                userArtists: {
                    include: {
                        artist: {
                            select: {
                                id: true,
                                name: true,
                                bio: true,
                                imageUrl: true,
                                nationality: true,
                                genre: true
                            }
                        }
                    }
                }
            }
        });
    }

    static async softDeleteUser(userId: string) {
        return prisma.user.update({
            where: {
                id: userId
            },
            data: {
                isDeleted: true,
                isActive: false
            }
        });
    }

    static async invalidateUserSessions(userId: string) {
        return prisma.session.deleteMany({
            where: { userId }
        });
    }

    static async findAllUsers() {
        return prisma.user.findMany({
            where: {
                isDeleted: false  // Only get active users
            },
            select: {
                id: true,
                email: true,
                username: true,
                name: true,
                role: true,
                isActive: true,
                avatar: {
                    select: {
                        fileUrl: true
                    }
                },
                lastLoginAt: true,
                createdAt: true,
                updatedAt: true
            },
            orderBy: {
                createdAt: 'desc'  // Newest first
            }
        });
    }

    static async findUserByEmail(email: string) {
        return prisma.user.findUnique({
            where: { email }
        });
    }

    static async findUserByUsername(username: string) {
        return prisma.user.findUnique({
            where: { username }
        });
    }

    static async updateUser(userId: string, data: {
        username?: string;
        name?: string;
        email?: string;
    }) {
        return prisma.user.update({
            where: {
                id: userId,
                isDeleted: false
            },
            data,
            select: {
                id: true,
                email: true,
                username: true,
                name: true,
                role: true,
                isActive: true,
                avatar: {
                    select: {
                        fileUrl: true
                    }
                },
                lastLoginAt: true,
                createdAt: true,
                updatedAt: true
            }
        });
    }
}