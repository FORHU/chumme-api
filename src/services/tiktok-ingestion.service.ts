import SocialFeedSvc from "./social-feed.service";
import SocialFeedRepo from "../repositories/social-feed.repository";

import FileRepo from "../repositories/file.repository";
import { upsertArtist } from "../repositories/chumme-artist.repository";
import type { VideoPostEvent } from "../listeners/tiktok-post.listener";
import logger from "../utils/logger";

/**
 * Service for processing TikTok crawler data and ingesting it into the database
 * Orchestrates multiple repositories: Artist, File, and Video
 */
export async function processTikTokCrawlerData(
  crawlerData: VideoPostEvent,
): Promise<void> {
  const { data } = crawlerData;

  logger.info(`Processing ${data.posts.length} posts for ${data.displayName}`);

  // Step 1: Upsert artist based on TikTok profile
  const artist = await upsertArtist({
    name: data.displayName || data.profileUrl,
    bio: data.bio || null,
    imageUrl: data.profileImageUrl || null,
    genre: "TikTok Creator",
  });

  logger.debug(`Artist: ${artist.name} (ID: ${artist.id})`);

  // Step 2: Process each post
  let newVideos = 0;
  let updatedVideos = 0;
  let skippedVideos = 0;

  for (const post of data.posts) {
    // Skip posts without video files or not downloaded
    if (!post.videoFile || !post.isDownloaded) {
      logger.debug(
        `Skipping post ${post.id} - no video file or not downloaded`,
      );
      skippedVideos++;
      continue;
    }

    try {
      // Step 2a: Create file record - File ID = post.id
      await FileRepo.upsertFile(
        post.id, // File ID = post.id
        {
          filename: post.videoFile.filename,
          fileUrl: post.videoFile.fileUrl,
        },
      );

      // Step 2b: Prepare metadata - store crawler-specific data (including full Spotify data)
      const metadata = {
        tiktokMetaId: post.tiktokMetaId,
        caption: post.caption,
        videoSrc: post.videoSrc,
        crawledAt: post.createdAt,
        fileMetadata: {
          size: post.videoFile.metadata.size,
          contentType: post.videoFile.metadata.contentType,
          s3Key: post.videoFile.metadata.key,
        },
        // Store full music/Spotify data in meta_data for reference
        musicData: post.metadata || null,
      };

      // Step 2c: upsert external media (service layer handles FeedItem creation)
      const result = await SocialFeedSvc.upsertExternalMedia({
        externalUrl: post.videoPage,
        title: post.title || "TikTok Video",
        socialPlatform: "TIKTOK",
        chummeArtistId: artist.id,
        metaData: metadata,
      });

      if (result.isUpdate) {
        updatedVideos++;
        logger.debug(`Updated existing video: ${result.item.id}`);
      } else {
        newVideos++;
        logger.debug(`Created new video: ${result.item.id}`);
      }

      // Step 2d: Extract and link emotions from Spotify data
      if (post.metadata?.spotifyData?.data?.emotion) {
        const emotionData = post.metadata.spotifyData.data.emotion;
        const signalsToLink: {
          type: string;
          value: string;
          confidence: number;
        }[] = [];

        // Add primary emotion
        if (emotionData.primaryEmotion) {
          signalsToLink.push({
            type: "EMOTION",
            value: emotionData.primaryEmotion,
            confidence: 0.95,
          });
        }

        // Add secondary emotions (optional, for richer emotional context)
        if (
          emotionData.secondaryEmotions &&
          Array.isArray(emotionData.secondaryEmotions)
        ) {
          for (const emo of emotionData.secondaryEmotions) {
            signalsToLink.push({
              type: "EMOTION",
              value: emo,
              confidence: 0.7,
            });
          }
        }

        if (signalsToLink.length > 0) {
          await SocialFeedRepo.upsertSocialSignals(
            result.item.id,
            signalsToLink,
          );
          logger.debug(
            `[INGESTION] Linked ${signalsToLink.length} emotions for ${result.item.id}`,
          );
        } else {
          logger.debug(
            `No emotions found in Spotify data for video ${result.item.id}`,
          );
        }
      } else {
        logger.debug(
          `No Spotify emotion data available for video ${result.item.id}`,
        );
      }
    } catch (error) {
      logger.error(`Error processing post ${post.id}:`, error);
      // Continue with other posts even if one fails
    }
  }

  logger.info(`Finished processing for ${artist.name}:`);
  logger.info(`  - New videos: ${newVideos}`);
  logger.info(`  - Updated videos: ${updatedVideos}`);
  logger.info(`  - Skipped videos: ${skippedVideos}`);
}
