import VideoRepo from "../../repositories/video.repository";
import * as ArtistRepo from "../../repositories/artist.repository";
import logger from "../logger";
import { detectVideoIntent } from "./detect-video-intent.util";
import { detectRequestedArtist } from "./detect-requested-artist.util";
import { filterShownVideos, addShownVideo } from "../video/track-shown-videos.util";

/**
 * Fetch a video recommendation based on detected emotion and user's favorite artists.
 * This function:
 * 1. Checks if user is requesting a video using AI-based intent detection
 * 2. Validates emotion confidence is high enough (> 0.5)
 * 3. Extracts artist name from user message using AI (with conversation context)
 * 4. Searches for videos matching the emotions and requested artist
 * 5. Falls back to user's favorite artists if no artist mentioned
 * 6. Falls back to emotion-only search if no results
 * 7. Returns a random video from matches or null
 * 
 * @param userInput - The user's chat message
 * @param emotions - Array of emotion names (e.g., ["peaceful", "acoustic"]) or single emotion
 * @param confidence - Confidence score of emotion detection (0-1)
 * @param userId - User ID for fetching preferences
 * @param chatHistory - Recent chat messages for conversation context (optional)
 * @returns Formatted video object or null if no match found
 */
export async function fetchVideoRecommendation(
    userInput: string,
    emotions: string | string[],
    confidence: number | undefined,
    userId: string,
    chatHistory: any[] = []
): Promise<any | null> {
    try {
        // Normalize emotions to always be an array
        const emotionArray = Array.isArray(emotions) ? emotions : [emotions];
        const emotionStr = emotionArray.join(", ");

        logger.info(`[VIDEO-RECOMMENDATION] Starting video recommendation flow`);
        logger.info(`[VIDEO-RECOMMENDATION] User input: "${userInput}"`);
        logger.info(`[VIDEO-RECOMMENDATION] Detected emotions: "${emotionStr}" with confidence: ${confidence}`);

        // Check if user is requesting a video using AI-based intent detection
        const wantsVideo = await detectVideoIntent(userInput || "");

        // Only proceed if user explicitly asked for a video
        if (!wantsVideo) {
            logger.info(`[VIDEO-RECOMMENDATION] User does not want a video, skipping video recommendation`);
            return null;
        }

        // Validate we have emotions
        if (!emotionArray || emotionArray.length === 0 || typeof confidence !== 'number') {
            logger.warn(`[VIDEO-RECOMMENDATION] Emotion validation failed - emotions: ${emotionStr}, confidence: ${confidence}`);
            return null;
        }

        // Confidence tier handling
        let finalEmotions = emotionArray;
        let confidenceTier = 'high';

        if (confidence < 0.3) {
            // Very low confidence - skip video recommendation entirely
            logger.warn(`[VIDEO-RECOMMENDATION] Confidence too low (${confidence}), skipping video recommendation`);
            return null;
        } else if (confidence >= 0.3 && confidence < 0.5) {
            // Low confidence - default to safe neutral emotions
            logger.info(`[VIDEO-RECOMMENDATION] Low confidence (${confidence}), using neutral emotions instead`);
            finalEmotions = ['neutral', 'content', 'peaceful'];
            confidenceTier = 'low';
        } else if (confidence >= 0.5 && confidence < 0.7) {
            // Medium confidence - use detected emotions but log uncertainty
            logger.info(`[VIDEO-RECOMMENDATION] Medium confidence (${confidence}), proceeding with caution`);
            confidenceTier = 'medium';
        } else {
            // High confidence - use detected emotions with confidence
            logger.info(`[VIDEO-RECOMMENDATION] High confidence (${confidence}), proceeding normally`);
            confidenceTier = 'high';
        }

        logger.info(`[VIDEO-RECOMMENDATION] ✓ Video intent detected, using emotions: [${finalEmotions.join(', ')}] (confidence tier: ${confidenceTier})`);

        // Get all available artists to help AI detect mentioned artist
        const allArtists = await ArtistRepo.getAllArtists();
        const artistNames = allArtists.map((a) => a.name);

        // Use AI to extract artist name from user message (with conversation context)
        const requestedArtist = await detectRequestedArtist(userInput, artistNames, chatHistory);

        let videos: any[] = [];

        // Priority 1: If user mentioned a specific artist, search with that artist only
        if (requestedArtist) {
            logger.info(`[VIDEO-RECOMMENDATION] Priority 1: Searching for videos with emotions="${finalEmotions.join(', ')}" and artist="${requestedArtist}"`);
            const artist = allArtists.find((a) => a.name === requestedArtist);
            if (artist) {
                videos = await VideoRepo.findVideosByEmotions(finalEmotions, [artist.id], 10);
                logger.info(`[VIDEO-RECOMMENDATION] Found ${videos.length} videos matching requested artist`);
            }
        }

        // Priority 2: If no artist mentioned or no results, try user's favorite artists
        if (videos.length === 0) {
            logger.info(`[VIDEO-RECOMMENDATION] Priority 2: Searching with user's favorite artists`);
            const userArtists = await ArtistRepo.getUserArtists(userId);
            const artistIds = (userArtists || [])
                .map((ua: any) => ua.artistId || (ua.artist && ua.artist.id))
                .filter(Boolean);

            logger.info(`[VIDEO-RECOMMENDATION] User has ${artistIds.length} favorite artists`);

            if (artistIds.length > 0) {
                videos = await VideoRepo.findVideosByEmotions(finalEmotions, artistIds, 10);
                logger.info(`[VIDEO-RECOMMENDATION] Found ${videos.length} videos from favorite artists`);
            }
        }

        // Priority 3: If still no videos, search by emotion only across all videos
        if (videos.length === 0) {
            logger.info(`[VIDEO-RECOMMENDATION] Priority 3: Searching by emotions only across all videos`);
            videos = await VideoRepo.findVideosByEmotions(finalEmotions, undefined, 10);
            logger.info(`[VIDEO-RECOMMENDATION] Found ${videos.length} videos with emotions="${finalEmotions.join(', ')}"`);
        }

        // No matching videos found
        if (!videos || videos.length === 0) {
            logger.warn(`[VIDEO-RECOMMENDATION] No videos found matching criteria`);
            return null;
        }

        // Filter out recently shown videos to prevent immediate repeats
        const unseenVideos = await filterShownVideos(videos, userId);

        // If all videos have been shown, reset and use full pool
        const finalVideoPool = unseenVideos.length > 0 ? unseenVideos : videos;

        if (unseenVideos.length === 0) {
            logger.info(`[VIDEO-RECOMMENDATION] All videos in pool were shown before, resetting pool`);
        }

        // Pick one video at random from the filtered results
        const selectedVideo = finalVideoPool[Math.floor(Math.random() * finalVideoPool.length)];

        logger.info(`[VIDEO-RECOMMENDATION] ✓ Selected video: "${selectedVideo.title}" by ${selectedVideo.artist?.name || 'Unknown'} (from pool of ${finalVideoPool.length})`);

        // Track this video as shown
        await addShownVideo(userId, selectedVideo.id);

        // Format and return the video data for the API response
        return {
            id: selectedVideo.id,
            title: selectedVideo.title,
            externalUrl: selectedVideo.externalUrl || null,
            file: {
                id: selectedVideo.file?.id,
                fileUrl: selectedVideo.file?.fileUrl
            },
            artist: selectedVideo.artist ? {
                id: selectedVideo.artist.id,
                name: selectedVideo.artist.name,
                imageUrl: selectedVideo.artist.imageUrl
            } : null,
            confidenceTier // Include confidence tier for transparency
        };
    } catch (err: any) {
        // Log error but don't throw - video lookup is optional feature
        // Chat should continue working even if video recommendation fails
        logger.error(`[VIDEO-RECOMMENDATION] error: ${err?.message || err}`);
        return null;
    }
}
