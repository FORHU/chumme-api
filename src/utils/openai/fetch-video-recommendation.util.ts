import VideoRepo from "../../repositories/video.repository";
import * as ArtistRepo from "../../repositories/artist.repository";
import logger from "../logger";
import { detectVideoIntent } from "./detect-video-intent.util";
import { detectRequestedArtist } from "./detect-requested-artist.util";

/**
 * Fetch a video recommendation based on detected emotion and user's favorite artists.
 * This function:
 * 1. Checks if user is requesting a video using AI-based intent detection
 * 2. Validates emotion confidence is high enough (> 0.5)
 * 3. Extracts artist name from user message using AI
 * 4. Searches for videos matching the emotion and requested artist
 * 5. Falls back to user's favorite artists if no artist mentioned
 * 6. Falls back to emotion-only search if no results
 * 7. Returns a random video from matches or null
 * 
 * @param userInput - The user's chat message
 * @param emotion - Detected emotion (e.g., "sad", "happy")
 * @param confidence - Confidence score of emotion detection (0-1)
 * @param userId - User ID for fetching preferences
 * @returns Formatted video object or null if no match found
 */
export async function fetchVideoRecommendation(
    userInput: string,
    emotion: string | undefined,
    confidence: number | undefined,
    userId: string
): Promise<any | null> {
    try {
        logger.info(`[VIDEO-RECOMMENDATION] Starting video recommendation flow`);
        logger.info(`[VIDEO-RECOMMENDATION] User input: "${userInput}"`);
        logger.info(`[VIDEO-RECOMMENDATION] Detected emotion: "${emotion}" with confidence: ${confidence}`);

        // Check if user is requesting a video using AI-based intent detection
        const wantsVideo = await detectVideoIntent(userInput || "");

        // Only proceed if:
        // - User explicitly asked for a video
        // - Emotion was detected
        // - Confidence is above threshold (> 0.5)
        if (!wantsVideo) {
            logger.info(`[VIDEO-RECOMMENDATION] User does not want a video, skipping video recommendation`);
            return null;
        }

        if (!emotion || typeof confidence !== 'number' || confidence <= 0.5) {
            logger.warn(`[VIDEO-RECOMMENDATION] Emotion validation failed - emotion: ${emotion}, confidence: ${confidence}`);
            return null;
        }

        logger.info(`[VIDEO-RECOMMENDATION] ✓ Video intent detected, proceeding with search`);

        // Get all available artists to help AI detect mentioned artist
        const allArtists = await ArtistRepo.getAllArtists();
        const artistNames = allArtists.map((a) => a.name);

        // Use AI to extract artist name from user message
        const requestedArtist = await detectRequestedArtist(userInput, artistNames);

        let videos: any[] = [];

        // Priority 1: If user mentioned a specific artist, search with that artist only
        if (requestedArtist) {
            logger.info(`[VIDEO-RECOMMENDATION] Priority 1: Searching for videos with emotion="${emotion}" and artist="${requestedArtist}"`);
            const artist = allArtists.find((a) => a.name === requestedArtist);
            if (artist) {
                videos = await VideoRepo.findVideosByEmotionAndArtist(emotion, [artist.id], 10);
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
                videos = await VideoRepo.findVideosByEmotionAndArtist(emotion, artistIds, 10);
                logger.info(`[VIDEO-RECOMMENDATION] Found ${videos.length} videos from favorite artists`);
            }
        }

        // Priority 3: If still no videos, search by emotion only across all videos
        if (videos.length === 0) {
            logger.info(`[VIDEO-RECOMMENDATION] Priority 3: Searching by emotion only across all videos`);
            videos = await VideoRepo.findVideosByEmotionAndArtist(emotion, undefined, 10);
            logger.info(`[VIDEO-RECOMMENDATION] Found ${videos.length} videos with emotion="${emotion}"`);
        }

        // No matching videos found
        if (!videos || videos.length === 0) {
            logger.warn(`[VIDEO-RECOMMENDATION] No videos found matching criteria`);
            return null;
        }

        // Pick one video at random from the results
        const selectedVideo = videos[Math.floor(Math.random() * videos.length)];

        logger.info(`[VIDEO-RECOMMENDATION] ✓ Selected video: "${selectedVideo.title}" by ${selectedVideo.artist?.name || 'Unknown'}`);

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
            } : null
        };
    } catch (err: any) {
        // Log error but don't throw - video lookup is optional feature
        // Chat should continue working even if video recommendation fails
        logger.error(`[VIDEO-RECOMMENDATION] error: ${err?.message || err}`);
        return null;
    }
}
