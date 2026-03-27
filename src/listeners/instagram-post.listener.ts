import amqp from "amqplib";
import { RABBITMQ_URL } from "../config";
import { QUEUE_NAMES } from "../utils/constant";
import { processInstagramCrawlerData } from "../services/instagram-ingestion.service";

export interface InstagramPostEvent {
  data: {
    id: string;
    username: string;
    displayName: string;
    bio: string;
    followers: string;
    following: string;
    profileImageUrl: string;
    createdAt: Date;
    posts: Array<{
      id: string;
      platform: string;
      caption: string;
      title: string;
      createdAt: Date;
      isDownloaded: boolean;
      isSynced: boolean;
      type: string;
      url: string;
      metadata: {
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
      postDate: Date | null;
      instagramMetaId: string;
      mediaSrc: {
        id: string;
        filename: string | null;
        fileUrl: string;
        createdAt: Date;
        updatedAt: Date | null;
        deletedAt: Date | null;
        metadata: {
          size: number;
          contentType: string;
          key: string;
        } | null;
        instagramPostId: string;
      };
      instagramMeta: {
        id: string;
        createdAt: Date;
        displayName: string;
        bio: string;
        followers: string;
        following: string;
        profileImageUrl: string;
        username: string;
      };
    }>;
  };
}

export class InstagramPostListener {
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
      const queueName = QUEUE_NAMES.INSTAGRAM_SYNC;
      const routingKey = QUEUE_NAMES.INSTAGRAM_SYNC;

      // Use passive check or match existing exchange configuration
      await this.channel!.assertExchange(exchangeName, "topic", {
        durable: false, // Match existing exchange configuration
      });
      await this.channel!.assertQueue(queueName, { durable: true });
      await this.channel!.bindQueue(queueName, exchangeName, routingKey);

      this.isConnected = true;
      console.log("RabbitMQ connected for instagram post events");

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
        QUEUE_NAMES.INSTAGRAM_SYNC,
        async (msg: amqp.ConsumeMessage | null) => {
          if (msg) {
            try {
              const postData: any = JSON.parse(msg.content.toString());
              console.log("Received Instagram post event:", postData);

              // Process the individual post
              await this.handleInstagramPost(postData);

              // Acknowledge the message
              this.channel?.ack(msg);
            } catch (error) {
              console.error("Error processing video post event:", error);
              // Reject the message and don't requeue
              this.channel?.nack(msg, false, false);
            }
          }
        },
      );

      console.log(
        "Listening for video post events...",
        QUEUE_NAMES.INSTAGRAM_SYNC,
      );
    } catch (error) {
      console.error("Error setting up video post listener:", error);
      throw error;
    }
  }

  private async handleInstagramPost(postData: any): Promise<void> {
    try {
      console.log(
        `Processing individual Instagram post: ${postData.caption} by ${postData.instagramMeta.displayName}`,
      );

      // Convert individual post to VideoPostEvent format for the ingestion service
      const postEvent: InstagramPostEvent = {
        data: {
          id: postData.instagramMeta.id,
          username: postData.instagramMeta.profileUrl,
          displayName: postData.instagramMeta.displayName,
          bio: postData.instagramMeta.bio,
          followers: postData.instagramMeta.followers,
          following: postData.instagramMeta.following,
          profileImageUrl: postData.instagramMeta.profileImageUrl,
          createdAt: postData.instagramMeta.createdAt,
          posts: [
            {
              id: postData.id,
              instagramMetaId: postData.instagramMeta.id,
              type: postData.type,
              url: postData.url,
              platform: postData.platform,
              caption: postData.caption,
              title: postData.title,
              createdAt: postData.createdAt,
              isDownloaded: postData.isDownloaded,
              isSynced: postData.isSynced,
              metadata: postData.metadata,
              postDate: postData.postDate,
              mediaSrc: postData.mediaSrc,
              instagramMeta: postData.instagramMeta,
            },
          ],
        },
      };

      // Process the crawler data
      await processInstagramCrawlerData(postEvent);
      console.log(`Successfully processed Instagram post: ${postData.caption}`);
    } catch (error) {
      console.error("Error handling Instagram post event:", error);
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
  // async publishVideoPostEvent(videoPostData: any): Promise<void> {
  //     if (!this.isConnected || !this.channel) {
  //         throw new Error("RabbitMQ not connected");
  //     }

  //     try {
  //         const messageBuffer = Buffer.from(JSON.stringify(videoPostData));
  //         const published = this.channel.sendToQueue(
  //             "video_post_queue",
  //             messageBuffer,
  //             {
  //                 persistent: true,
  //             }
  //         );

  //         if (!published) {
  //             throw new Error("Failed to publish video post event");
  //         }

  //         console.log(
  //             `Video post event published for: ${videoPostData.data.displayName}`
  //         );
  //     } catch (error) {
  //         console.error("Error publishing video post event:", error);
  //         throw error;
  //     }
  // }
}

export const instagramPostListener = new InstagramPostListener();
