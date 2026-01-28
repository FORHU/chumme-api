import VideoRepo from "../../repositories/video.repository";
import logger from "../logger";

/**
 * Simple video fetch by emotion - always returns a video if available
 * Unlike fetchVideoRecommendation, this does NOT check for video intent
 *
 * @param emotions - Array of emotion names or single emotion
 * @param userId - User ID (for future tracking)
 * @param limit - Max videos to return
 */
export async function fetchVideosByEmotion(
  emotions: string | string[],
  userId: string,
  limit: number = 3,
): Promise<any[]> {
  try {
    const emotionArray = Array.isArray(emotions) ? emotions : [emotions];
    logger.info(
      `[FETCH-VIDEO-BY-EMOTION] Fetching videos for emotions: ${emotionArray.join(", ")}`,
    );
    // Try with detected emotions first
    let videos = await VideoRepo.findVideosByEmotions(
      emotionArray,
      undefined, // no artist filter
      limit,
    );

    // Fallback to neutral emotions if no results
    if (!videos || videos.length === 0) {
      logger.info(
        `[FETCH-VIDEO-BY-EMOTION] No videos for ${emotionArray.join(", ")}, trying neutral`,
      );
      videos = await VideoRepo.findVideosByEmotions(
        ["neutral", "content", "peaceful"],
        undefined,
        limit,
      );
    }

    if (!videos || videos.length === 0) {
      logger.warn(`[FETCH-VIDEO-BY-EMOTION] No videos found`);
      return [];
    }

    logger.info(`[FETCH-VIDEO-BY-EMOTION] Found ${videos.length} videos`);

    // Format videos for response
    return videos.map((video: any) => ({
      id: video.id,
      title: video.title ?? "Video",
      // url: video.file?.fileUrl || video.externalUrl || null,
      artist: video.artist?.name ?? null,
      artistImage: video.artist?.imageUrl ?? null,
      externalUrl: video.externalUrl ?? null,
    }));
  } catch (error: any) {
    logger.error(`[FETCH-VIDEO-BY-EMOTION] Error: ${error?.message}`);
    return [];
  }
}
