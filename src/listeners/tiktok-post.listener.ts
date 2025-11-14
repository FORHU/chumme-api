import amqp from "amqplib";
import { RABBITMQ_URL } from "../config";
import { processTikTokCrawlerData } from "../services/tiktok-ingestion.service";

import { QUEUE_NAMES } from "../utils/constant";

// Individual post structure sent from crawler
export interface TikTokPostMessage {
    id: string;
    tiktokMetaId: string;
    videoPage: string;
    caption: string;
    title: string;
    videoSrc: string | null;
    createdAt: string;
    isDownloaded: boolean;
    metadata?: {
        artist: string;
        songTitle: string;
        fullTitle: string;
        spotifyData?: {
            success: boolean;
            data?: {
                track?: {
                    id: string;
                    name: string;
                    artists: Array<{ id: string; name: string }>;
                    album?: any;
                    external_urls?: any;
                    preview_url?: string;
                    popularity?: number;
                    duration_ms?: number;
                };
                emotion?: {
                    primaryEmotion: string;
                    emotionIntensity: number;
                    description: string;
                    secondaryEmotions: string[];
                    audioCharacteristics?: any;
                };
                confidence?: number;
                analysisMethod?: string;
                note?: string;
            };
        };
    };
    videoFile: {
        id: string;
        postId: string;
        filename: string;
        fileUrl: string;
        createdAt: string;
        updatedAt: string;
        deletedAt: string | null;
        metadata: {
            key: string;
            size: number;
            contentType: string;
        };
    } | null;
    tiktokMeta: {
        id: string;
        profileUrl: string;
        displayName: string;
        bio: string;
        followers: string;
        following: string;
        likes: string;
        profileImageUrl: string;
        createdAt: string;
    };
}

// Legacy interface for backward compatibility
export interface VideoPostEvent {
    data: {
        id: string;
        profileUrl: string;
        displayName: string;
        bio: string;
        followers: string;
        following: string;
        likes: string;
        profileImageUrl: string;
        createdAt: string;
        posts: Array<{
            id: string;
            tiktokMetaId: string;
            videoPage: string;
            caption: string;
            title: string;
            videoSrc: string | null;
            createdAt: string;
            isDownloaded: boolean;
            metadata?: {
                artist: string;
                songTitle: string;
                fullTitle: string;
                spotifyData?: {
                    success: boolean;
                    data?: {
                        track?: any;
                        emotion?: {
                            primaryEmotion: string;
                            emotionIntensity: number;
                            description: string;
                            secondaryEmotions: string[];
                            audioCharacteristics?: any;
                        };
                        confidence?: number;
                        analysisMethod?: string;
                    };
                };
            };
            videoFile: {
                id: string;
                postId: string;
                filename: string;
                fileUrl: string;
                createdAt: string;
                updatedAt: string;
                deletedAt: string | null;
                metadata: {
                    key: string;
                    size: number;
                    contentType: string;
                };
            } | null;
        }>;
    };
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

            // Declare exchange and queue for video post events
            const exchangeName = "system_events";
            const queueName = QUEUE_NAMES.TIKTOK_SYNC;
            const routingKey = QUEUE_NAMES.TIKTOK_SYNC;

            // Use passive check or match existing exchange configuration
            await this.channel!.assertExchange(exchangeName, "topic", {
                durable: false, // Match existing exchange configuration
            });
            await this.channel!.assertQueue(queueName, { durable: true });
            await this.channel!.bindQueue(queueName, exchangeName, routingKey);

            this.isConnected = true;
            console.log("RabbitMQ connected for tiktok post events");

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
                QUEUE_NAMES.TIKTOK_SYNC,
                async (msg: amqp.ConsumeMessage | null) => {
                    if (msg) {
                        try {
                            const postData: TikTokPostMessage = JSON.parse(
                                msg.content.toString()
                            );
                            console.log(
                                "Received TikTok post event:",
                                postData
                            );

                            // Process the individual post
                            await this.handleTikTokPost(postData);

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

            console.log(
                "Listening for video post events...",
                QUEUE_NAMES.TIKTOK_SYNC
            );
        } catch (error) {
            console.error("Error setting up video post listener:", error);
            throw error;
        }
    }

    private async handleTikTokPost(postData: TikTokPostMessage): Promise<void> {
        try {
            console.log(
                `Processing individual TikTok post: ${postData.caption} by ${postData.tiktokMeta.displayName}`
            );

            // Convert individual post to VideoPostEvent format for the ingestion service
            const videoPostEvent: VideoPostEvent = {
                data: {
                    id: postData.tiktokMeta.id,
                    profileUrl: postData.tiktokMeta.profileUrl,
                    displayName: postData.tiktokMeta.displayName,
                    bio: postData.tiktokMeta.bio,
                    followers: postData.tiktokMeta.followers,
                    following: postData.tiktokMeta.following,
                    likes: postData.tiktokMeta.likes,
                    profileImageUrl: postData.tiktokMeta.profileImageUrl,
                    createdAt: postData.tiktokMeta.createdAt,
                    posts: [
                        {
                            id: postData.id,
                            tiktokMetaId: postData.tiktokMetaId,
                            videoPage: postData.videoPage,
                            caption: postData.caption,
                            title: postData.title,
                            videoSrc: postData.videoSrc,
                            createdAt: postData.createdAt,
                            isDownloaded: postData.isDownloaded,
                            metadata: postData.metadata,
                            videoFile: postData.videoFile,
                        },
                    ],
                },
            };

            // Process the crawler data
            await processTikTokCrawlerData(videoPostEvent);
            console.log(
                `Successfully processed TikTok post: ${postData.caption}`
            );
        } catch (error) {
            console.error("Error handling TikTok post event:", error);
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
                `Video post event published for: ${videoPostData.data.displayName}`
            );
        } catch (error) {
            console.error("Error publishing video post event:", error);
            throw error;
        }
    }
}

export const videoPostListener = new VideoPostListener();
