import VideoRepo from "../repositories/video.repository";
import FileRepo from "../repositories/file.repository";
import { upsertArtist } from "../repositories/artist.repository";
import type { VideoPostEvent } from "../listeners/video-post.listener";

/**
 * Service for processing TikTok crawler data and ingesting it into the database
 * Orchestrates multiple repositories: Artist, File, and Video
 */
export async function processTikTokCrawlerData(crawlerData: VideoPostEvent): Promise<void> {
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
            const fileResult = await FileRepo.upsertFile(
                post.id,  // File ID = post.id
                {
                    filename: post.videoFile.filename,
                    fileUrl: post.videoFile.fileUrl,
                }
            );

            // Step 2b: Prepare metadata - store crawler-specific data
            const metadata = {
                tiktokMetaId: post.tiktokMetaId,
                likes: post.caption,
                videoSrc: post.videoSrc,
                crawledAt: post.createdAt,
                fileMetadata: {
                    size: post.videoFile.metadata.size,
                    contentType: post.videoFile.metadata.contentType,
                    s3Key: post.videoFile.metadata.key,
                }
            };

            // Step 2c: upsert video 
            const result = await VideoRepo.upsertVideo(
                { externalUrl: post.videoPage },
                {
                    id: post.videoFile.id,  // Video ID = post.videoFile.id
                    title: post.title || "TikTok Video",
                    fileId: fileResult.file.id,
                    platform: "TIKTOK",
                    externalUrl: post.videoPage,
                    artistId: artist.id,
                    meta_data: metadata,
                }
            );

            if (result.isUpdate) {
                updatedVideos++;
                console.log(`Updated existing video: ${result.video.id}`);
            } else {
                newVideos++;
                console.log(`Created new video: ${result.video.id}`);
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
