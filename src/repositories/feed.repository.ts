import { Prisma } from "@prisma/client";
import { prisma } from "../utils/prisma";

export default class FeedRepo {
    /**
     * Create a feed item for a post
     */
    static async createPostFeedItem(postId: string) {
        return await prisma.feedItem.create({
            data: {
                type: "POST",
                postId
            }
        });
    }

    /**
     * Create a feed item for a video
     */
    static async createVideoFeedItem(videoId: string) {
        return await prisma.feedItem.create({
            data: {
                type: "VIDEO",
                videoId
            }
        });
    }

    /**
     * Get paginated feed with all content
     */
    static async getFeed(page: number = 0, limit: number = 20) {
        return await prisma.feedItem.findMany({
            where: { isDeleted: false },
            include: {
                post: {
                    where: { isDeleted: false },
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                name: true,
                                avatar: true
                            }
                        },
                        likes: {
                            where: { isDeleted: false }
                        },
                        comments: {
                            where: { isDeleted: false }
                        }
                    }
                },
                video: {
                    where: { isDeleted: false },
                    include: {
                        artist: {
                            select: {
                                id: true,
                                name: true,
                                imageUrl: true,
                                genre: true
                            }
                        },
                        file: true,
                        videoEmotions: {
                            include: {
                                emotion: {
                                    select: {
                                        id: true,
                                        name: true,
                                        icon: true
                                    }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            skip: page * limit,
            take: limit
        });
    }

    /**
     * Soft delete feed item when post is deleted
     */
    static async softDeleteByPostId(postId: string) {
        return await prisma.feedItem.updateMany({
            where: { postId },
            data: { isDeleted: true }
        });
    }

    /**
     * Soft delete feed item when video is deleted
     */
    static async softDeleteByVideoId(videoId: string) {
        return await prisma.feedItem.updateMany({
            where: { videoId },
            data: { isDeleted: true }
        });
    }

    /**
     * Get total count of feed items (for pagination metadata)
     */
    static async getFeedCount() {
        return await prisma.feedItem.count({
            where: { isDeleted: false }
        });
    }

    /**
     * Get personalized feed based on:
     * - Posts from users they follow (social content)
     * - Videos from their favorite artists (fandom content)
     * - Fallback to all videos if no artist preferences set
     */
    static async getPersonalizedFeed(userId: string, page: number = 0, limit: number = 20) {
        // Get user's followed users
        const following = await prisma.follow.findMany({
            where: {
                followerId: userId,
                isDeleted: false
            },
            select: {
                followingId: true
            }
        });
        const followingIds = following.map(f => f.followingId);
        followingIds.push(userId); // Include user's own posts

        // Get user's favorite artists
        const userArtists = await prisma.userArtist.findMany({
            where: { userId },
            select: { artistId: true }
        });
        const artistIds = userArtists.map(a => a.artistId);

        // Build OR conditions: Posts from following + Videos from favorite artists
        const orConditions: any[] = [];

        // 1. Always include posts from followed users (including own posts)
        orConditions.push({
            type: "POST",
            post: {
                userId: { in: followingIds },
                isDeleted: false
            }
        });

        // 2. Include ALL videos from favorite artists (if any selected)
        if (artistIds.length > 0) {
            orConditions.push({
                type: "VIDEO",
                video: {
                    artistId: { in: artistIds },
                    isDeleted: false
                }
            });
        } else {
            // 3. If no artist preferences set, show all videos as fallback
            orConditions.push({
                type: "VIDEO",
                video: {
                    isDeleted: false
                }
            });
        }

        return await prisma.feedItem.findMany({
            where: {
                isDeleted: false,
                OR: orConditions
            },
            include: {
                post: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                name: true,
                                avatar: true
                            }
                        },
                        likes: {
                            where: { isDeleted: false }
                        },
                        comments: {
                            where: { isDeleted: false }
                        }
                    }
                },
                video: {
                    include: {
                        artist: {
                            select: {
                                id: true,
                                name: true,
                                imageUrl: true,
                                genre: true
                            }
                        },
                        file: true,
                        videoEmotions: {
                            include: {
                                emotion: {
                                    select: {
                                        id: true,
                                        name: true,
                                        icon: true
                                    }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            skip: page * limit,
            take: limit
        });
    }
}
