import {
    videoPostListener,
    VideoPostEvent,
} from "../listeners/video-post.listener";

export class VideoPostEventService {
    // Call this when a video post is created
    static async publishVideoPostCreated(videoData: {
        id: string;
        userId: string;
        title: string;
        description?: string;
        videoUrl: string;
        thumbnailUrl?: string;
        duration?: number;
    }): Promise<void> {
        try {
            const videoPostEvent: VideoPostEvent = {
                ...videoData,
                createdAt: new Date().toISOString(),
            };

            await videoPostListener.publishVideoPostEvent(videoPostEvent);
            console.log(`Video post event published for: ${videoData.title}`);
        } catch (error) {
            console.error("Failed to publish video post event:", error);
            // Don't throw error to avoid breaking video creation
        }
    }

    // Call this when a video post is updated
    static async publishVideoPostUpdated(videoData: {
        id: string;
        userId: string;
        title: string;
        description?: string;
        videoUrl: string;
        thumbnailUrl?: string;
        duration?: number;
    }): Promise<void> {
        try {
            const videoPostEvent: VideoPostEvent = {
                ...videoData,
                createdAt: new Date().toISOString(), // You might want to use updatedAt instead
            };

            await videoPostListener.publishVideoPostEvent(videoPostEvent);
            console.log(
                `Video post update event published for: ${videoData.title}`
            );
        } catch (error) {
            console.error("Failed to publish video post update event:", error);
        }
    }
}
