import FeedRepo from "../repositories/feed.repository";
import CacheUtil from "../utils/cache.util";

export default class FeedSvc {
    /**
     * Helper method to format feed items
     */
    private static formatFeedItems(feedItems: any[]) {
        return feedItems
            .map((item: any) => {
                if (item.type === 'POST' && item.post) {
                    return {
                        id: item.id,
                        type: 'post',
                        createdAt: item.createdAt,
                        content: {
                            ...item.post,
                            likesCount: item.post.likes.length,
                            commentsCount: item.post.comments.length
                        }
                    };
                } else if (item.type === 'VIDEO' && item.video) {
                    return {
                        id: item.id,
                        type: 'video',
                        createdAt: item.createdAt,
                        content: item.video
                    };
                }
                return null;
            })
            .filter(Boolean);
    }

    /**
     * Get unified feed with pagination
     */
    static async getFeed(page: number = 0, limit: number = 20) {
        // Validate pagination params
        if (page < 0) {
            throw new Error("Page must be non-negative");
        }
        if (limit < 1 || limit > 50) {
            throw new Error("Limit must be between 1 and 50");
        }

        // Check cache
        const cacheKey = `feed:page:${page}:limit:${limit}`;
        const cached = await CacheUtil.get(cacheKey);
        if (cached) {
            return cached;
        }

        const feedItems = await FeedRepo.getFeed(page, limit);
        const formattedFeed = this.formatFeedItems(feedItems);

        // Cache the formatted result
        await CacheUtil.set(cacheKey, formattedFeed);

        return formattedFeed;
    }

    /**
     * Get personalized feed based on:
     * - Posts from users they follow (+ own posts)
     * - Videos from their favorite artists
     * Note: Emotion preferences can be used elsewhere (e.g., video recommendations, mood-based playlists)
     */
    static async getPersonalizedFeed(userId: string, page: number = 0, limit: number = 20) {
        // Validate pagination params
        if (page < 0) {
            throw new Error("Page must be non-negative");
        }
        if (limit < 1 || limit > 50) {
            throw new Error("Limit must be between 1 and 50");
        }

        // Check cache (personalized per user)
        const cacheKey = `feed:personalized:${userId}:page:${page}:limit:${limit}`;
        const cached = await CacheUtil.get(cacheKey);
        if (cached) {
            return cached;
        }

        // Get feed filtered by followed users
        const feedItems = await FeedRepo.getPersonalizedFeed(userId, page, limit);
        const formattedFeed = this.formatFeedItems(feedItems);

        // Cache the result
        await CacheUtil.set(cacheKey, formattedFeed);

        return formattedFeed;
    }
}
