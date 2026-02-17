import { rabbitMQService } from "../utils/rabbitmq";
import logger from "../utils/logger";

const MEDIA_QUEUE = "media_processing_queue";

export interface MediaJob {
  jobType: "optimize_video" | "optimize_audio" | "generate_hls";
  inputUrl: string;
  outputKeyPrefix: string; // S3 folder prefix
  studioId?: string; // Optional context
  mediaId?: string;
  resolution?: "1080p" | "720p" | "480p";
  format?: "mp3" | "aac";
}

class MediaQueueSvc {
  /**
   * Publish a media processing job to RabbitMQ
   */
  static async publishJob(job: MediaJob) {
    const channel = rabbitMQService.getChannel();
    if (!channel) {
      logger.error("[MediaQueue] Channel not initialized");
      throw new Error("RabbitMQ channel not active");
    }

    try {
      await channel.assertQueue(MEDIA_QUEUE, { durable: true });
      channel.sendToQueue(MEDIA_QUEUE, Buffer.from(JSON.stringify(job)), {
        persistent: true,
      });
      logger.info(
        `[MediaQueue] Published job: ${job.jobType} for ${job.mediaId}`,
      );
    } catch (err) {
      logger.error("[MediaQueue] Failed to publish job:", err);
      throw err;
    }
  }
}

export default MediaQueueSvc;
