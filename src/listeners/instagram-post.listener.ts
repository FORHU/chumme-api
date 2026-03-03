import amqp from "amqplib";
import { QUEUE_NAMES } from "../utils/constant";
import { processInstagramCrawlerData } from "../services/instagram-ingestion.service";
import { rabbitMQService } from "../utils/rabbitmq";

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
  private channel: amqp.Channel | null = null;
  private isConnected: boolean = false;

  async connect(): Promise<void> {
    try {
      console.log("Connecting to RabbitMQ for instagram post events...");
      this.channel = await rabbitMQService.createChannel();

      // Declare exchange and queue for video post events
      const exchangeName = "system_events";
      const queueName = QUEUE_NAMES.INSTAGRAM_SYNC;
      const routingKey = QUEUE_NAMES.INSTAGRAM_SYNC;

      // Use passive check or match existing exchange configuration
      await this.channel.assertExchange(exchangeName, "topic", {
        durable: false, // Match existing exchange configuration
      });
      await this.channel.assertQueue(queueName, { durable: true });
      await this.channel.bindQueue(queueName, exchangeName, routingKey);

      this.isConnected = true;
      console.log("RabbitMQ connected for instagram post events");

      // Handle channel events
      this.channel.on("error", (err: any) => {
        console.error("RabbitMQ channel error (Instagram):", err);
        this.isConnected = false;
      });

      this.channel.on("close", () => {
        console.log("RabbitMQ channel closed (Instagram). Reconnecting...");
        this.isConnected = false;
        setTimeout(
          () => this.connect().then(() => this.startListening()),
          5000,
        );
      });
    } catch (error) {
      console.error("Failed to connect to RabbitMQ (Instagram):", error);
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
          if (msg && this.channel) {
            try {
              const postData: any = JSON.parse(msg.content.toString());
              console.log("Received Instagram post event:", postData);

              // Process the individual post
              await this.handleInstagramPost(postData);

              // Acknowledge the message
              this.channel.ack(msg);
            } catch (error) {
              console.error("Error processing video post event:", error);
              // Reject the message and don't requeue
              this.channel.nack(msg, false, false);
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
      this.isConnected = false;
      console.log("Video post listener disconnected");
    } catch (error) {
      console.error("Error disconnecting video post listener:", error);
    }
  }

  isConnectionActive(): boolean {
    return this.isConnected;
  }
}

export const instagramPostListener = new InstagramPostListener();
