import amqp from "amqplib";
import { RABBITMQ_URL } from "../config";
import { rabbitMQService } from "../utils/rabbitmq";
import logger from "../utils/logger";
import {
  batchOverlayAudioFiles,
  concatenateAudioFiles,
  mixVocalsWithBacking,
  VoiceEffect,
} from "../utils/audio.utils";
import S3Util from "../utils/s3.util";
import MusicLibraryRepo from "../repositories/music-library.repository";
import MusicRecordRepo from "../repositories/music-record.repository";
import TempMusicRecordRepo from "../repositories/temp-music-record.repository";
import { prisma } from "../utils/prisma";
import { S3_CDN_URL } from "../config";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AudioMergeJob {
  jobId: string;
  studioId: string;
  musicId: string;
  studioType: "CROWDSINGING" | "RELAYSINGING";
  audioUrls: string[];
  offsets: number[];
  backingTrackUrl: string;
  jobType: "preview" | "save";
  /** For save jobs: singer IDs to credit */
  singerIds?: string[];
  /** For save jobs: performance mapping */
  performanceMapping?: {
    startLine: number;
    endLine: number;
    singerId: string;
    vocalRoleIndex?: number;
  }[];
  /** For save jobs: additional metadata */
  metaData?: any;
  /** Max duration in seconds to trim the final audio */
  maxDuration?: number;
  /** Voice effect preset */
  voiceEffect?: VoiceEffect;
}

const QUEUE_NAME = "audio-merge-queue";
const ROUTING_KEY = "audio.merge";

// ---------------------------------------------------------------------------
// Worker
// ---------------------------------------------------------------------------

export class AudioMergeWorker {
  private connection: amqp.Connection | null = null;
  private channel: amqp.Channel | null = null;

  async start(): Promise<void> {
    try {
      logger.info("[AudioMergeWorker] Connecting to RabbitMQ...");
      this.connection = (await amqp.connect(RABBITMQ_URL)) as any;
      this.channel = await (this.connection as any).createChannel();

      // Only process 1 merge at a time (CPU-heavy)
      await this.channel!.prefetch(1);

      await this.channel!.assertExchange("chumme_exchange", "topic", {
        durable: true,
      });
      await this.channel!.assertQueue(QUEUE_NAME, { durable: true });
      await this.channel!.bindQueue(QUEUE_NAME, "chumme_exchange", ROUTING_KEY);

      await this.channel!.consume(QUEUE_NAME, async (msg) => {
        if (!msg) return;
        try {
          const job: AudioMergeJob = JSON.parse(msg.content.toString());
          logger.info(
            `[AudioMergeWorker] Processing ${job.jobType} job: ${job.jobId}`,
          );
          await this.processJob(job);
          this.channel?.ack(msg);
        } catch (error: any) {
          logger.error(`[AudioMergeWorker] Job failed: ${error.message}`);
          // Don't requeue to avoid infinite loop
          this.channel?.nack(msg, false, false);
        }
      });

      logger.info(`[AudioMergeWorker] Listening on queue: ${QUEUE_NAME}`);

      (this.connection as any).on("error", (err: any) => {
        logger.error("[AudioMergeWorker] Connection error:", err);
      });

      (this.connection as any).on("close", () => {
        logger.warn("[AudioMergeWorker] Connection closed. Reconnecting...");
        setTimeout(() => this.start(), 5000);
      });
    } catch (error) {
      logger.error("[AudioMergeWorker] Failed to start:", error);
      throw error;
    }
  }

  private async processJob(job: AudioMergeJob): Promise<void> {
    const startTime = Date.now();

    // 1. Merge vocals based on studio type
    let vocalsBuffer: Buffer;
    if (job.studioType === "RELAYSINGING") {
      const initialOffset = job.offsets[0] || 0;
      vocalsBuffer = await concatenateAudioFiles(
        job.audioUrls,
        initialOffset,
        "wav",
      );
    } else {
      vocalsBuffer = await batchOverlayAudioFiles(job.audioUrls, job.offsets);
    }

    logger.info(
      `[AudioMergeWorker] Vocals merged: ${vocalsBuffer.length} bytes in ${Date.now() - startTime}ms`,
    );

    // 2. Mix vocals with backing track (produces final MP3 with loudness norm)
    const mergedBuffer = await mixVocalsWithBacking(
      vocalsBuffer,
      job.backingTrackUrl,
      job.maxDuration,
      job.voiceEffect,
    );

    if (!mergedBuffer || mergedBuffer.length === 0) {
      throw new Error("Mixed audio buffer is empty (0 bytes)");
    }

    const mergeTime = Date.now() - startTime;
    logger.info(
      `[AudioMergeWorker] Final mix complete: ${mergedBuffer.length} bytes in ${mergeTime}ms`,
    );

    // 3. Upload to S3 and handle based on job type
    const io = (global as any).io;
    if (!io) {
      logger.error(
        `[AudioMergeWorker] CRITICAL: global.io is undefined. Cannot emit socket events!`,
      );
    }

    if (job.jobType === "preview") {
      const previewKey = `previews/preview_${job.studioId}_${job.musicId}.mp3`;
      const previewUrl = await S3Util.uploadFileWithKey(
        mergedBuffer,
        previewKey,
        "audio/mpeg",
      );

      console.log("im here");

      // Broadcast preview_ready to studio
      if (io) {
        io.to(job.studioId).emit("preview_ready", {
          studioId: job.studioId,
          previewUrl,
          chunkCount: job.audioUrls.length,
          mergeTimeMs: mergeTime,
        });
      }

      logger.info(
        `[AudioMergeWorker] Preview delivered: ${previewUrl} (${mergeTime}ms)`,
      );
    } else if (job.jobType === "save") {
      const mergedFilename = `recording_${job.studioId}_${job.musicId}.mp3`;
      const mergedUrl = await S3Util.uploadFile(
        mergedBuffer,
        mergedFilename,
        "audio/mpeg",
      );

      // Create MusicLibrary + MusicRecord in DB
      const fileRecord = await MusicLibraryRepo.create({
        filename: mergedFilename,
        fileUrl: mergedUrl,
        metaData: {
          mimetype: "audio/mpeg",
          size: mergedBuffer.length,
        },
      });

      const musicRecord = await MusicRecordRepo.create({
        studioId: job.studioId,
        musicId: job.musicId,
        fileId: fileRecord.id,
        singerIds: job.singerIds || [],
        metaData: job.metaData,
      });

      // Create music parts if performance mapping provided
      if (job.performanceMapping && job.performanceMapping.length > 0) {
        await prisma.musicPart.createMany({
          data: job.performanceMapping.map((p, index) => ({
            recordId: musicRecord.id,
            startLine: p.startLine,
            endLine: p.endLine,
            singerId: p.singerId,
            vocalRoleIndex: p.vocalRoleIndex || 1,
            order: index,
          })),
        });
      }

      // Cleanup temp records + S3 chunks
      await TempMusicRecordRepo.deleteByMusicIdAndStudioId(
        job.musicId,
        job.studioId,
      );

      for (const url of job.audioUrls) {
        try {
          await S3Util.deleteFile(url);
        } catch (e) {
          logger.warn(`[AudioMergeWorker] Failed to delete chunk: ${url}`);
        }
      }

      // Delete preview if exists
      try {
        const previewKey = `previews/preview_${job.studioId}_${job.musicId}.mp3`;
        const previewUrl = `${S3_CDN_URL}/${previewKey}`;
        await S3Util.deleteFile(previewUrl);
      } catch (_) {}

      // Broadcast recording_saved to studio
      if (io) {
        io.to(job.studioId).emit("recording_saved", {
          studioId: job.studioId,
          musicId: job.musicId,
          recordId: musicRecord.id,
          fileUrl: mergedUrl,
          mergeTimeMs: mergeTime,
        });
      }

      logger.info(
        `[AudioMergeWorker] Recording saved: ${musicRecord.id} (${mergeTime}ms)`,
      );
    }
  }

  async stop(): Promise<void> {
    try {
      if (this.channel) await this.channel.close();
      if (this.connection) await (this.connection as any).close();
      logger.info("[AudioMergeWorker] Stopped");
    } catch (error) {
      logger.error("[AudioMergeWorker] Error stopping:", error);
    }
  }
}

/**
 * Publish an audio merge job to the queue.
 * Called by MusicStudioSvc to offload merging to the background worker.
 */
export async function publishMergeJob(job: AudioMergeJob): Promise<void> {
  await rabbitMQService.publishMessage(ROUTING_KEY, job);
  logger.info(
    `[AudioMergeWorker] Job published: ${job.jobId} (${job.jobType})`,
  );
}
