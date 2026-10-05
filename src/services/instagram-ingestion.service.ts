import SocialFeedSvc from "./social-feed.service";
import SocialFeedRepo from "../repositories/social-feed.repository";

import FileRepo from "../repositories/file.repository";
import { upsertArtist } from "../repositories/chumme-artist.repository";
import { InstagramPostEvent } from "../listeners/instagram-post.listener";
import logger from "../utils/logger";

/**
 * Service for processing TikTok crawler data and ingesting it into the database
 * Orchestrates multiple repositories: Artist, File, and Video
 */
export async function processInstagramCrawlerData(
  crawlerData: InstagramPostEvent,
  topicCategoryId?: string,
): Promise<void> {
  const { data } = crawlerData;

  logger.info(`Processing ${data.posts.length} posts for ${data.displayName}`);

  // Step 1: Upsert artist based on TikTok profile
  const artist = await upsertArtist({
    name: data.displayName || data.username,
    bio: data.bio || null,
    imageUrl: data.profileImageUrl || null,
    genre: "Instagram Creator",
  });

  logger.debug(`Artist: ${artist.name} (ID: ${artist.id})`);

  // Step 2: Process each post
  let newVideos = 0;
  let newPosts = 0;
  let updatedVideos = 0;
  let skippedVideos = 0;
  let updatedPosts = 0;
  const skippedPosts = 0;

  for (const post of data.posts) {
    // Skip posts without video files or not downloaded
    if (!post.mediaSrc || !post.isDownloaded) {
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
          filename: post.mediaSrc?.filename,
          fileUrl: post.mediaSrc?.fileUrl,
        },
      );

      // Step 2b: Prepare metadata - store crawler-specific data (including full Spotify data)
      const metadata = {
        instagramMetaId: post.instagramMetaId,
        caption: post.caption,
        mediaSrc: post.mediaSrc,
        crawledAt: post.createdAt,
        fileMetadata: {
          size: post.mediaSrc?.metadata?.size,
          contentType: post.mediaSrc?.metadata?.contentType,
          s3Key: post.mediaSrc?.metadata?.key,
        },
        // Store full music/Spotify data in meta_data for reference
        musicData: post.metadata || null,
      };

      let videoResult;
      let mediaPostResult;

      if (post.type === "Video") {
        // Step 2c: upsert video (service layer handles FeedItem creation)
        videoResult = await SocialFeedSvc.upsertExternalMedia({
          externalUrl: post.url,
          title: post.title || "Instagram Post/Video",
          socialPlatform: "INSTAGRAM",
          chummeArtistId: artist.id,
          chummeTopicCategoryId: topicCategoryId,
          metaData: metadata,
        });

        if (videoResult.isUpdate) {
          updatedVideos++;
          logger.debug(`Updated existing video: ${videoResult.item.id}`);
        } else {
          newVideos++;
          logger.debug(`Created new video: ${videoResult.item.id}`);
        }
      } else {
        //for type == 'Image' | 'Sidecar', use MediaPostService
        mediaPostResult = await SocialFeedSvc.upsertExternalMedia({
          externalUrl: post.url,
          title: post.title || "Instagram Post/Media",
          socialPlatform: "INSTAGRAM",
          chummeArtistId: artist.id,
          chummeTopicCategoryId: topicCategoryId,
          metaData: metadata,
        });

        if (mediaPostResult.isUpdate) {
          updatedPosts++;
          logger.debug(`Updated existing video: ${mediaPostResult.item.id}`);
        } else {
          newPosts++;
          logger.debug(`Created new video: ${mediaPostResult.item.id}`);
        }
      }

      const resultId = videoResult
        ? videoResult.item.id
        : mediaPostResult
          ? mediaPostResult.item.id
          : "";

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

        // Add secondary emotions
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
          await SocialFeedRepo.upsertSocialSignals(resultId, signalsToLink);
          logger.debug(
            `[INGESTION] Linked ${signalsToLink.length} emotions for ${resultId}`,
          );
        } else {
          logger.debug(
            `No emotions found in Spotify data for video ${resultId}`,
          );
        }
      } else {
        logger.debug(`No Spotify emotion data available for video ${resultId}`);
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

  logger.info(`  - New mediaPosts: ${newPosts}`);
  logger.info(`  - Updated mediaPosts: ${updatedPosts}`);
  logger.info(`  - Skipped mediaPosts: ${skippedPosts}`);
}
