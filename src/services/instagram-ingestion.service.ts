import VideoSvc from "./video.service";
import FileRepo from "../repositories/file.repository";
import { upsertArtist } from "../repositories/artist.repository";
import EmotionRepo from "../repositories/emotion.repository";
import { InstagramPostEvent } from "../listeners/instagram-post.listener";
import MediaPostRepo from "../repositories/media-post.repository";
import MediaPostSvc from "./media-post.service";

/**
 * Service for processing TikTok crawler data and ingesting it into the database
 * Orchestrates multiple repositories: Artist, File, and Video
 */
export async function processInstagramCrawlerData(
    crawlerData: InstagramPostEvent
): Promise<void> {
    const { data } = crawlerData;

    console.log(
        `Processing ${data.posts.length} posts for ${data.displayName}`
    );

    // Step 1: Upsert artist based on TikTok profile
    const artist = await upsertArtist({
        name: data.displayName || data.username,
        bio: data.bio || null,
        imageUrl: data.profileImageUrl || null,
        genre: "Instagram Creator",
    });

    console.log(`Artist: ${artist.name} (ID: ${artist.id})`);

    // Step 2: Process each post
    let newVideos = 0;
    let newPosts = 0;
    let updatedVideos = 0;
    let skippedVideos = 0;
    let updatedPosts = 0;
    let skippedPosts = 0;

    for (const post of data.posts) {
        // Skip posts without video files or not downloaded
        if (!post.mediaSrc || !post.isDownloaded) {
            console.log(
                `Skipping post ${post.id} - no video file or not downloaded`
            );
            skippedVideos++;
            continue;
        }

        try {
            // Step 2a: Create file record - File ID = post.id
            const fileResult = await FileRepo.upsertFile(
                post.id, // File ID = post.id
                {
                    filename: post.mediaSrc,
                    fileUrl: post.videoFile?.fileUrl,
                }
            );

            // Step 2b: Prepare metadata - store crawler-specific data (including full Spotify data)
            const metadata = {
                instagramMetaId: post.instagramMetaId,
                caption: post.caption,
                mediaSrc: post.mediaSrc,
                crawledAt: post.createdAt,
                fileMetadata: {
                    size: post.videoFile?.metadata.size,
                    contentType: post.videoFile?.metadata.contentType,
                    s3Key: post.videoFile?.metadata.key,
                },
                // Store full music/Spotify data in meta_data for reference
                musicData: post.metadata || null,
            };

            let videoResult;
            let mediaPostResult;

           if(post.type === 'Video'){
                // Step 2c: upsert video (service layer handles FeedItem creation)
                videoResult = await VideoSvc.upsertVideo({
                    externalUrl: post.videoPage,
                    title: post.title || "Instagram Post/Video",
                    fileId: fileResult.file.id,
                    platform: "INSTAGRAM",
                    artistId: artist.id,
                    meta_data: metadata,
                });

                if (videoResult.isUpdate) {
                    updatedVideos++;
                    console.log(`Updated existing video: ${videoResult.video.id}`);
                } else {
                    newVideos++;
                    console.log(`Created new video: ${videoResult.video.id}`);
                }
           } else {
                //for type == 'Image' | 'Sidecar', use MediaPostService
                mediaPostResult = await MediaPostSvc.upsertMediaPost({
                    externalUrl: post.videoPage,
                    title: post.title || "Instagram Post/Media",
                    fileId: fileResult.file.id,
                    platform: "INSTAGRAM",
                    artistId: artist.id,
                    meta_data: metadata,
                });

                if (mediaPostResult.isUpdate) {
                    updatedPosts++;
                    console.log(`Updated existing video: ${mediaPostResult.mediaPost.id}`);
                } else {
                    newPosts++;
                    console.log(`Created new video: ${mediaPostResult.mediaPost.id}`);
                }

           }

            const resultId = videoResult ? videoResult.video.id : mediaPostResult ? mediaPostResult.mediaPost.id : '';

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
                    try {
                        
                        await EmotionRepo.linkVideoToEmotions(
                            resultId,
                            emotionsToLink
                        );
                        console.log(
                            `Linked emotions to video ${resultId}: ${emotionsToLink.join(", ")}`
                        );
                    } catch (emotionError) {
                        console.warn(
                            `Failed to link emotions for video ${resultId}:`,
                            emotionError
                        );
                        // Don't fail the entire ingestion if emotion linking fails
                    }
                } else {
                    console.log(
                        `No emotions found in Spotify data for video ${resultId}`
                    );
                }
            } else {
                console.log(
                    `No Spotify emotion data available for video ${resultId}`
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
