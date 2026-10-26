import { MEDIA_PROCESSING_QUEUE_URL } from "../config";
import { enqueue } from "../utils/sqs";
import logger from "../utils/logger";

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
   * Publish a media processing job to SQS
   */
  static async publishJob(job: MediaJob) {
    try {
      await enqueue(MEDIA_PROCESSING_QUEUE_URL, job);
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
