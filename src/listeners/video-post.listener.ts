import amqp from "amqplib";
import { RABBITMQ_URL } from "../config";

export interface VideoPostEvent {
    id: string;
    userId: string;
    title: string;
    description?: string;
    videoUrl: string;
    thumbnailUrl?: string;
    duration?: number;
    createdAt: string;
}

export class VideoPostListener {
    private connection: amqp.Connection | null = null;
    private channel: amqp.Channel | null = null;
    private isConnected: boolean = false;

    async connect(): Promise<void> {
        try {
            console.log("Connecting to RabbitMQ for video post events...");
            this.connection = (await amqp.connect(RABBITMQ_URL)) as any;
            this.channel = await (this.connection as any).createChannel();

            // Declare queue for video post events
            await this.channel!.assertQueue("video_post_queue", {
                durable: true,
            });

            this.isConnected = true;
            console.log("RabbitMQ connected for video post events");

            // Handle connection events
            (this.connection as any).on("error", (err: any) => {
                console.error("RabbitMQ connection error:", err);
                this.isConnected = false;
            });

            (this.connection as any).on("close", () => {
                console.log("RabbitMQ connection closed");
                this.isConnected = false;
            });
        } catch (error) {
            console.error("Failed to connect to RabbitMQ:", error);
            this.isConnected = false;
            throw error;
        }
    }

    async startListening(): Promise<void> {
        if (!this.isConnected || !this.channel) {
            throw new Error("RabbitMQ not connected");
        }

        try {
            // Listen for video post events
            await this.channel.consume(
                "video_post_queue",
                async (msg: amqp.ConsumeMessage | null) => {
                    if (msg) {
                        try {
                            const videoPostData: VideoPostEvent = JSON.parse(
                                msg.content.toString()
                            );
                            console.log(
                                "Received video post event:",
                                videoPostData
                            );

                            // Process the video post
                            await this.handleVideoPostEvent(videoPostData);

                            // Acknowledge the message
                            this.channel?.ack(msg);
                        } catch (error) {
                            console.error(
                                "Error processing video post event:",
                                error
                            );
                            // Reject the message and don't requeue
                            this.channel?.nack(msg, false, false);
                        }
                    }
                }
            );

            console.log("Listening for video post events...");
        } catch (error) {
            console.error("Error setting up video post listener:", error);
            throw error;
        }
    }

    private async handleVideoPostEvent(
        videoPostData: VideoPostEvent
    ): Promise<void> {
        try {
            console.log(
                `Processing video post: ${videoPostData.title} by user ${videoPostData.userId}`
            );

            // Here you can add your business logic for handling video posts
            // For example:

            // 1. Save video metadata to database
            // await this.saveVideoPost(videoPostData);

            // 2. Generate thumbnail if not provided
            // if (!videoPostData.thumbnailUrl) {
            //   await this.generateThumbnail(videoPostData.videoUrl);
            // }

            // 3. Process video for different qualities
            // await this.processVideoQualities(videoPostData.videoUrl);

            // 4. Send notification to followers
            // await this.notifyFollowers(videoPostData.userId, videoPostData.id);

            // 5. Update search index
            // await this.updateSearchIndex(videoPostData);

            console.log(
                `Successfully processed video post ${videoPostData.id}`
            );
        } catch (error) {
            console.error("Error handling video post event:", error);
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        try {
            if (this.channel) {
                await this.channel.close();
            }
            if (this.connection) {
                await (this.connection as any).close();
            }
            this.isConnected = false;
            console.log("Video post listener disconnected");
        } catch (error) {
            console.error("Error disconnecting video post listener:", error);
        }
    }

    isConnectionActive(): boolean {
        return this.isConnected;
    }

    // Helper method to publish video post events (if needed)
    async publishVideoPostEvent(videoPostData: VideoPostEvent): Promise<void> {
        if (!this.isConnected || !this.channel) {
            throw new Error("RabbitMQ not connected");
        }

        try {
            const messageBuffer = Buffer.from(JSON.stringify(videoPostData));
            const published = this.channel.sendToQueue(
                "video_post_queue",
                messageBuffer,
                {
                    persistent: true,
                }
            );

            if (!published) {
                throw new Error("Failed to publish video post event");
            }

            console.log(
                `Video post event published for: ${videoPostData.title}`
            );
        } catch (error) {
            console.error("Error publishing video post event:", error);
            throw error;
        }
    }
}

export const videoPostListener = new VideoPostListener();
