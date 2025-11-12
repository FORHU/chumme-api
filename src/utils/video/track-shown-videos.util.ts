import CacheUtil from "../cache.util";
import logger from "../logger";

/**
 * Tracks videos that have been shown to a user to prevent immediate repeats.
 * Uses Redis cache with TTL to automatically clear history after some time.
 * 
 * @module video-history
 */

const SHOWN_VIDEOS_KEY_PREFIX = "user:shown_videos:";
const MAX_HISTORY_SIZE = 10; // Track last 10 videos
const HISTORY_TTL = 3600; // 1 hour in seconds

/**
 * Get list of video IDs that have been shown to user recently
 * @param userId - User ID
 * @returns Array of video IDs
 */
export async function getShownVideos(userId: string): Promise<string[]> {
    try {
        const key = `${SHOWN_VIDEOS_KEY_PREFIX}${userId}`;
        const videos = await CacheUtil.get(key);

        if (!videos || !Array.isArray(videos)) {
            return [];
        }

        return videos;
    } catch (error: any) {
        logger.error(`[VIDEO-HISTORY] Error getting shown videos: ${error?.message}`);
        return [];
    }
}

/**
 * Add a video to user's shown history
 * @param userId - User ID
 * @param videoId - Video ID to add
 */
export async function addShownVideo(userId: string, videoId: string): Promise<void> {
    try {
        const key = `${SHOWN_VIDEOS_KEY_PREFIX}${userId}`;
        const videos = await getShownVideos(userId);

        // Add new video to the end
        videos.push(videoId);

        // Keep only last N videos (FIFO queue)
        const recentVideos = videos.slice(-MAX_HISTORY_SIZE);

        // Save back to cache with TTL
        await CacheUtil.set(key, recentVideos, HISTORY_TTL);

        logger.info(`[VIDEO-HISTORY] Added video ${videoId} to user ${userId} history (${recentVideos.length} total)`);
    } catch (error: any) {
        logger.error(`[VIDEO-HISTORY] Error adding shown video: ${error?.message}`);
        // Don't throw - video history is non-critical feature
    }
}

/**
 * Clear video history for a user (useful for testing or user request)
 * @param userId - User ID
 */
export async function clearShownVideos(userId: string): Promise<void> {
    try {
        const key = `${SHOWN_VIDEOS_KEY_PREFIX}${userId}`;
        await CacheUtil.del(key);
        logger.info(`[VIDEO-HISTORY] Cleared video history for user ${userId}`);
    } catch (error: any) {
        logger.error(`[VIDEO-HISTORY] Error clearing shown videos: ${error?.message}`);
    }
}

/**
 * Filter out videos that have been recently shown to user
 * @param videos - Array of video objects
 * @param userId - User ID
 * @returns Filtered array of videos not in history
 */
export async function filterShownVideos(
    videos: any[],
    userId: string
): Promise<any[]> {
    try {
        const shownVideoIds = await getShownVideos(userId);

        if (shownVideoIds.length === 0) {
            return videos; // No history, return all
        }

        const filtered = videos.filter(v => !shownVideoIds.includes(v.id));

        logger.info(
            `[VIDEO-HISTORY] Filtered ${videos.length - filtered.length} previously shown videos ` +
            `(${filtered.length} remaining)`
        );

        return filtered;
    } catch (error: any) {
        logger.error(`[VIDEO-HISTORY] Error filtering shown videos: ${error?.message}`);
        return videos; // On error, return all videos
    }
}
