import SocialFeedSvc from "./social-feed.service";

import FileRepo from "../repositories/file.repository";
import { upsertArtist } from "../repositories/chumme-artist.repository";
import type { VideoPostEvent } from "../listeners/tiktok-post.listener";

/**
 * Service for processing TikTok crawler data and ingesting it into the database
 * Orchestrates multiple repositories: Artist, File, and Video
 */
export async function processTikTokCrawlerData(
  crawlerData: VideoPostEvent,
): Promise<void> {
  const { data } = crawlerData;

  console.log(`Processing ${data.posts.length} posts for ${data.displayName}`);

  // Step 1: Upsert artist based on TikTok profile
  const artist = await upsertArtist({
    name: data.displayName || data.profileUrl,
    bio: data.bio || null,
    imageUrl: data.profileImageUrl || null,
    genre: "TikTok Creator",
  });

  console.log(`Artist: ${artist.name} (ID: ${artist.id})`);

  // Step 2: Process each post
  let newVideos = 0;
  let updatedVideos = 0;
  let skippedVideos = 0;

  for (const post of data.posts) {
    // Skip posts without video files or not downloaded
    if (!post.videoFile || !post.isDownloaded) {
      console.log(`Skipping post ${post.id} - no video file or not downloaded`);
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
        console.log(`Updated existing video: ${result.item.id}`);
      } else {
        newVideos++;
        console.log(`Created new video: ${result.item.id}`);
      }

      // Step 2d: Extract and link emotions from Spotify data
      if (post.metadata?.spotifyData?.data?.emotion) {
        const emotionData = post.metadata.spotifyData.data.emotion;
        const emotionsToLink: string[] = [];

        // Add primary emotion
        if (emotionData.primaryEmotion) {
          emotionsToLink.push(emotionData.primaryEmotion);
        }

        // Add secondary emotions (optional, for richer emotional context)
        if (
          emotionData.secondaryEmotions &&
          Array.isArray(emotionData.secondaryEmotions)
        ) {
          emotionsToLink.push(...emotionData.secondaryEmotions);
        }

        if (emotionsToLink.length > 0) {
          // NOTE: Emotion linking is currently disabled for flat SocialFeedItem
          console.log(
            `[INGESTION] Emotion linking skipped for ${result.item.id}`,
          );
        } else {
          console.log(
            `No emotions found in Spotify data for video ${result.item.id}`,
          );
        }
      } else {
        console.log(
          `No Spotify emotion data available for video ${result.item.id}`,
        );
      }
    } catch (error) {
      console.error(`Error processing post ${post.id}:`, error);
      // Continue with other posts even if one fails
    }
  }

  console.log(`Finished processing for ${artist.name}:`);
  console.log(`  - New videos: ${newVideos}`);
  console.log(`  - Updated videos: ${updatedVideos}`);
  console.log(`  - Skipped videos: ${skippedVideos}`);
}
