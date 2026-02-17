import { rabbitMQService } from "../utils/rabbitmq";
import MediaQueueSvc, { MediaJob } from "../services/media-queue.service";
import * as MediaUtils from "../utils/media.utils";
import S3Util from "../utils/s3.util";
import fs from "fs";
import path from "path";
import logger from "../utils/logger";
import { prisma } from "../utils/prisma";

const MEDIA_QUEUE = "media_processing_queue";

export class MediaProcessingWorker {
  async start() {
    const channel = rabbitMQService.getChannel();
    if (!channel) {
      logger.error("[MediaWorker] RabbitMQ channel not available");
      return;
    }

    await channel.assertQueue(MEDIA_QUEUE, { durable: true });
    logger.info("[MediaWorker] Listening for media jobs...");

    channel.consume(MEDIA_QUEUE, async (msg) => {
      if (!msg) return;

      const job: MediaJob = JSON.parse(msg.content.toString());
      logger.info(
        `[MediaWorker] Processing job: ${job.jobType} for ${job.mediaId}`,
      );

      try {
        if (job.jobType === "optimize_video") {
          await this.handleOptimizeVideo(job);
        } else if (job.jobType === "optimize_audio") {
          await this.handleOptimizeAudio(job);
        } else if (job.jobType === "generate_hls") {
          await this.handleGenerateHls(job);
        }

        channel.ack(msg);
        logger.info(`[MediaWorker] Job ${job.mediaId} completed`);
      } catch (err) {
        logger.error(`[MediaWorker] Job ${job.mediaId} failed:`, err);
        // Nack with requeue=false to avoid infinite loop on bad input
        channel.nack(msg, false, false);
      }
    });
  }

  private async handleOptimizeVideo(job: MediaJob) {
    const { inputUrl, outputKeyPrefix, resolution = "720p", mediaId } = job;

    // 1. Transcode (Stream -> Temp File)
    const tempPath = await MediaUtils.optimizeVideoToStream(
      inputUrl,
      resolution,
    );

    // 2. Upload to S3
    const s3Key = `${outputKeyPrefix}/${resolution}.mp4`;

    // Use stream for S3 upload
    const fileStream = fs.createReadStream(tempPath);
    const optimizedUrl = await S3Util.uploadFileWithKey(
      fileStream as any,
      s3Key,
      "video/mp4",
    );
    logger.info(`[MediaWorker] Uploaded optimized video to ${s3Key}`);

    // 3. Update File Record in DB
    // Find the File ID from the Video record
    const video = await prisma.video.findUnique({
      where: { id: mediaId },
      select: { fileId: true },
    });

    if (video?.fileId) {
      await prisma.file.update({
        where: { id: video.fileId },
        data: { fileUrl: optimizedUrl },
      });
      logger.info(
        `[MediaWorker] Updated File record ${video.fileId} with optimized URL`,
      );
    }

    // Cleanup
    fs.unlinkSync(tempPath);
  }

  private async handleOptimizeAudio(job: MediaJob) {
    const { inputUrl, outputKeyPrefix, format = "mp3", mediaId } = job;

    // 1. Transcode (Stream -> Temp File)
    const tempPath = await MediaUtils.optimizeAudioToStream(inputUrl, format);

    // 2. Upload to S3
    const ext = format === "mp3" ? ".mp3" : ".m4a";
    const s3Key = `${outputKeyPrefix}/optimized${ext}`;
    const contentType = format === "mp3" ? "audio/mpeg" : "audio/aac";

    // Use stream for S3 upload
    const fileStream = fs.createReadStream(tempPath);
    const optimizedUrl = await S3Util.uploadFileWithKey(
      fileStream as any,
      s3Key,
      contentType,
    );
    logger.info(`[MediaWorker] Uploaded optimized audio to ${s3Key}`);

    // 3. Update MusicLibrary Record in DB
    // musicId is passed in job.mediaId
    const music = await prisma.music.findUnique({
      where: { id: mediaId },
      select: { musicFileId: true },
    });

    if (music?.musicFileId) {
      await prisma.musicLibrary.update({
        where: { id: music.musicFileId },
        data: { fileUrl: optimizedUrl },
      });
      logger.info(
        `[MediaWorker] Updated MusicLibrary record ${music.musicFileId} with optimized URL`,
      );
    }

    // Cleanup
    fs.unlinkSync(tempPath);
  }

  private async handleGenerateHls(job: MediaJob) {
    const { inputUrl, outputKeyPrefix } = job;

    // 1. Generate HLS in Temp Dir (all variants at once)
    const hlsDir = await MediaUtils.generateMultiVariantHls(inputUrl);

    // 2. Upload all files with ordered sequence to prevent player 403/404
    const files = fs.readdirSync(hlsDir);

    // Categorize files
    const segments = files.filter((f) => f.endsWith(".ts"));
    const variants = files.filter(
      (f) => f.endsWith(".m3u8") && f !== "master.m3u8",
    );
    const master = files.filter((f) => f === "master.m3u8");

    const uploadFile = async (file: string) => {
      const filePath = path.join(hlsDir, file);
      const s3Key = `${outputKeyPrefix}/hls/${file}`;
      const fileStream = fs.createReadStream(filePath);
      const contentType = file.endsWith(".m3u8")
        ? "application/x-mpegURL"
        : "video/MP2T";

      logger.info(`[MediaWorker] Uploading HLS file ${file} to ${s3Key}`);
      await S3Util.uploadFileWithKey(fileStream as any, s3Key, contentType);
    };

    // SEQUENCE MATTERS:
    // 1. Segments first (Batch for safety)
    const CONCURRENCY = 10;
    logger.info(
      `[MediaWorker] Uploading ${segments.length} segments in batches of ${CONCURRENCY}...`,
    );
    for (let i = 0; i < segments.length; i += CONCURRENCY) {
      const batch = segments.slice(i, i + CONCURRENCY);
      await Promise.all(batch.map((f) => uploadFile(f)));
    }

    // 2. Variant Playlists second
    logger.info(
      `[MediaWorker] Uploading ${variants.length} variant playlists...`,
    );
    await Promise.all(variants.map((f) => uploadFile(f)));

    // 3. Master Playlist LAST
    let masterUrl = "";
    if (master.length > 0) {
      const file = master[0];
      const filePath = path.join(hlsDir, file);
      const s3Key = `${outputKeyPrefix}/hls/${file}`;
      const fileStream = fs.createReadStream(filePath);
      const contentType = "application/x-mpegURL";

      logger.info(`[MediaWorker] Uploading master playlist to ${s3Key}`);
      masterUrl = await S3Util.uploadFileWithKey(
        fileStream as any,
        s3Key,
        contentType,
      );
    }

    // 4. Update DB
    if (masterUrl) {
      const video = await prisma.video.findUnique({
        where: { id: job.mediaId },
        select: { fileId: true },
      });

      if (video?.fileId) {
        await prisma.file.update({
          where: { id: video.fileId },
          data: { fileUrl: masterUrl },
        });
        logger.info(
          `[MediaWorker] Updated File record ${video.fileId} with HLS Master URL`,
        );
      }
    }

    // Cleanup
    fs.rmSync(hlsDir, { recursive: true, force: true });
    logger.info(
      `[MediaWorker] HLS Processing completed for ${outputKeyPrefix}`,
    );
  }
}
