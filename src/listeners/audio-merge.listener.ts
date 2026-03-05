import amqp from "amqplib";
import fs from "fs";
import path from "path";
import { rabbitMQService } from "../utils/rabbitmq";
import logger from "../utils/logger";
import {
  cleanupAllTempFiles,
  createJobTempDir,
  cleanupJobTempDir,
} from "../utils/media.utils";
import {
  batchOverlayAudioFiles,
  concatenateAudioFiles,
  mixVocalsWithBacking,
  VoiceEffect,
} from "../utils/audio.utils";
import S3Util from "../utils/s3.util";
import MusicLibraryRepo from "../repositories/music-library.repository";
import MusicRecordRepo from "../repositories/music-record.repository";
import MusicTempRecordRepo from "../repositories/music-temp-record.repository";
import { prisma } from "../utils/prisma";

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
  /** Final merged recording duration */
  recordDuration?: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const QUEUE_NAME = "audio-merge-queue";
const DLQ_QUEUE_NAME = "audio-merge-dlq";
const ROUTING_KEY = "audio.merge";
const DLQ_ROUTING_KEY = "audio.merge.dlq";
const MAX_RETRIES = Number(process.env.MAX_RETRIES || 3);
const JOB_TIMEOUT_MS = Number(process.env.JOB_TIMEOUT_MS || 5 * 60 * 1000); // 5 minutes
const PREFETCH_COUNT = Number(process.env.PREFETCH_COUNT || 1);

// ---------------------------------------------------------------------------
// Structured Logging Helper
// ---------------------------------------------------------------------------

function logEvent(
  event: string,
  job: AudioMergeJob,
  extra: Record<string, any> = {},
) {
  logger.info(`[AudioMergeWorker] ${event}`, {
    event,
    jobId: job.jobId,
    jobType: job.jobType,
    studioId: job.studioId,
    musicId: job.musicId,
    chunkCount: job.audioUrls.length,
    ...extra,
  });
}

// ---------------------------------------------------------------------------
// Worker
// ---------------------------------------------------------------------------

export class AudioMergeWorker {
  private channel: amqp.Channel | null = null;

  async start(): Promise<void> {
    try {
      // Production safety: purge any remnants from previous runs/crashes
      cleanupAllTempFiles();

      // Get a channel on the shared singleton connection
      this.channel = await rabbitMQService.createChannel();

      // Only process N merges at a time (CPU-heavy; default 1)
      await this.channel.prefetch(PREFETCH_COUNT);

      await this.channel.assertExchange("chumme_exchange", "topic", {
        durable: true,
      });

      // Dead Letter Queue: failed jobs land here after MAX_RETRIES
      await this.channel.assertQueue(DLQ_QUEUE_NAME, { durable: true });
      await this.channel.bindQueue(
        DLQ_QUEUE_NAME,
        "chumme_exchange",
        DLQ_ROUTING_KEY,
      );

      // Main queue (no x-dead-letter args — we route to DLQ manually via republish)
      await this.channel.assertQueue(QUEUE_NAME, { durable: true });
      await this.channel.bindQueue(QUEUE_NAME, "chumme_exchange", ROUTING_KEY);

      await this.channel.consume(QUEUE_NAME, async (msg) => {
        if (!msg) return;
        const job: AudioMergeJob = JSON.parse(msg.content.toString());

        // Track retries via custom header (x-death only updates on dead-letter, not requeue)
        const retryCount =
          (msg.properties.headers?.["x-retry-count"] as number) || 0;

        try {
          logEvent("JOB_RECEIVED", job, { retryCount });

          // Run with timeout
          await Promise.race([
            this.processJob(job),
            new Promise<never>((_, reject) =>
              setTimeout(
                () =>
                  reject(new Error(`JOB_TIMEOUT after ${JOB_TIMEOUT_MS}ms`)),
                JOB_TIMEOUT_MS,
              ),
            ),
          ]);

          // Success: ack only after everything is complete
          this.channel?.ack(msg);
          logEvent("JOB_COMPLETE", job);
        } catch (error: any) {
          const errorType = error.message?.includes("JOB_TIMEOUT")
            ? "TIMEOUT"
            : "ERROR";
          logger.error(
            `[AudioMergeWorker] Job failed (${errorType}): ${error.message}`,
          );

          // Always ack the original to prevent duplicate delivery
          this.channel?.ack(msg);

          if (retryCount < MAX_RETRIES) {
            // Republish with incremented retry count
            logger.warn(
              `[AudioMergeWorker] Retrying job ${job.jobId} (attempt ${retryCount + 1}/${MAX_RETRIES})`,
            );
            this.channel?.publish(
              "chumme_exchange",
              ROUTING_KEY,
              Buffer.from(JSON.stringify(job)),
              {
                persistent: true,
                headers: { "x-retry-count": retryCount + 1 },
              },
            );
          } else {
            // Exceeded retries → publish directly to DLQ
            logger.error(
              `[AudioMergeWorker] Job ${job.jobId} exceeded ${MAX_RETRIES} retries. Routing to DLQ.`,
            );
            this.channel?.publish(
              "chumme_exchange",
              DLQ_ROUTING_KEY,
              Buffer.from(JSON.stringify(job)),
              {
                persistent: true,
                headers: {
                  "x-retry-count": retryCount,
                  "x-failure-reason": error.message,
                },
              },
            );
          }
        }
      });

      logger.info(
        `[AudioMergeWorker] Listening on queue: ${QUEUE_NAME} (prefetch=${PREFETCH_COUNT}, timeout=${JOB_TIMEOUT_MS}ms, maxRetries=${MAX_RETRIES})`,
      );

      this.channel.on("error", (err: any) => {
        logger.error("[AudioMergeWorker] Channel error:", err);
      });

      this.channel.on("close", () => {
        logger.warn("[AudioMergeWorker] Channel closed. Restarting in 5s...");
        setTimeout(() => this.start(), 5000);
      });
    } catch (error) {
      logger.error("[AudioMergeWorker] Failed to start:", error);
      throw error;
    }
  }

  private async processJob(job: AudioMergeJob): Promise<void> {
    const startTime = Date.now();

    // Create isolated temp directory for this job
    const jobDir = createJobTempDir(job.jobId);
    logEvent("PROCESSING_STARTED", job, { jobDir });

    try {
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

      logEvent("VOCALS_MERGED", job, {
        bufferSize: vocalsBuffer.length,
        durationMs: Date.now() - startTime,
      });

      // 2. Mix vocals with backing track
      const finalAudioPath = await mixVocalsWithBacking(
        vocalsBuffer,
        job.backingTrackUrl,
        {
          maxDuration: job.maxDuration,
          voiceEffect: job.voiceEffect,
          title: job.metaData?.title || `Mix_${job.musicId}`,
          artist: job.singerIds?.join(", ") || "Chumme Artist",
        },
      );

      if (!finalAudioPath || !fs.existsSync(finalAudioPath)) {
        throw new Error("Final audio file was not generated");
      }

      const mergeTime = Date.now() - startTime;
      logEvent("MIX_COMPLETE", job, { finalAudioPath, mergeTimeMs: mergeTime });

      // 3. Upload to S3 and handle based on job type
      const io = (global as any).io;
      if (!io) {
        logger.warn(
          `[AudioMergeWorker] global.io is undefined. Socket events will not emit.`,
        );
      }
      if (job.jobType === "preview") {
        await this.handlePreviewUpload(job, finalAudioPath, mergeTime, io);
      } else if (job.jobType === "save") {
        await this.handleSaveUpload(job, finalAudioPath, mergeTime, io);
      }

      logEvent("JOB_UPLOADED", job, { mergeTimeMs: mergeTime });
    } finally {
      // Production hygiene: Delete the entire job temp directory
      cleanupJobTempDir(job.jobId);
      logEvent("CLEANUP_DONE", job, {
        totalDurationMs: Date.now() - startTime,
      });
    }
  }

  // -----------------------------------------------------------------------
  // Preview Upload
  // -----------------------------------------------------------------------
  private async handlePreviewUpload(
    job: AudioMergeJob,
    finalAudioPath: string,
    mergeTime: number,
    io: any,
  ): Promise<void> {
    // Delete old preview(s) — idempotent
    const previewPrefix = `previews/preview_${job.studioId}_${job.musicId}`;
    // try {
    //   await S3Util.deleteByPrefix(previewPrefix);
    // } catch (e) {
    //   logger.warn(`[AudioMergeWorker] Failed to cleanup old previews: ${e}`);
    // }

    // Deterministic key (no timestamp for idempotency on retry)
    const previewKey = `previews/preview_${job.studioId}_${job.musicId}.mp3`;

    const audioStream = fs.createReadStream(finalAudioPath);
    const previewUrl = await S3Util.uploadFileWithKey(
      audioStream as any,
      previewKey,
      "audio/mpeg",
    );

    const fileRecord = await MusicLibraryRepo.create({
      filename: path.basename(previewKey),
      fileUrl: previewUrl,
      fileType: "PREVIEW",
      metaData: {
        mimetype: "audio/mpeg",
        size: fs.statSync(finalAudioPath).size,
        isTransient: true,
      },
    });

    if (io) {
      io.to(job.studioId).emit("preview_ready", {
        studioId: job.studioId,
        previewUrl,
        fileId: fileRecord.id,
        chunkCount: job.audioUrls.length,
        mergeTimeMs: mergeTime,
      });
    }

    logger.info(
      `[AudioMergeWorker] Preview delivered: ${previewUrl} (${mergeTime}ms)`,
    );
  }

  // -----------------------------------------------------------------------
  // Save Upload
  // -----------------------------------------------------------------------
  private async handleSaveUpload(
    job: AudioMergeJob,
    finalAudioPath: string,
    mergeTime: number,
    io: any,
  ): Promise<void> {
    // Deterministic key for idempotency
    const mergedFilename = `recording_${job.studioId}_${job.musicId}.mp3`;

    const audioStream = fs.createReadStream(finalAudioPath);
    const mergedUrl = await S3Util.uploadFile(
      audioStream as any,
      mergedFilename,
      "audio/mpeg",
    );

    const fileRecord = await MusicLibraryRepo.create({
      filename: mergedFilename,
      fileUrl: mergedUrl,
      metaData: {
        mimetype: "audio/mpeg",
        size: fs.statSync(finalAudioPath).size,
      },
      fileType: "RECORDING",
    });

    const musicRecord = await MusicRecordRepo.create({
      studioId: job.studioId,
      musicId: job.musicId,
      fileId: fileRecord.id,
      singerIds: job.singerIds || [],
      metaData: job.metaData,
      recordDuration: job.recordDuration || job.maxDuration,
    });

    // Create music parts if performance mapping provided
    if (job.performanceMapping && job.performanceMapping.length > 0) {
      await prisma.musicSingerPart.createMany({
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
    const lookupMusicId = job.metaData?.lookupMusicId || job.musicId;

    // await MusicTempRecordRepo.deleteByMusicIdAndStudioId(
    //   lookupMusicId,
    //   job.studioId,
    // );

    // for (const url of job.audioUrls) {
    //   try {
    //     await S3Util.deleteFile(url);
    //   } catch (e) {
    //     logger.warn(`[AudioMergeWorker] Failed to delete chunk: ${url}`);
    //   }
    // }

    // Delete preview(s) if any exist
    // try {
    //   const previewPrefix = `previews/preview_${job.studioId}_${job.musicId}`;
    //   await S3Util.deleteByPrefix(previewPrefix);
    // } catch (_) {}

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

  async stop(): Promise<void> {
    try {
      if (this.channel) await this.channel.close();
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
