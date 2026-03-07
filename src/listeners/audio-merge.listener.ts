import amqp from "amqplib";
import fs from "fs";
import path from "path";
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
import MusicTempRecordRepo from "../repositories/music-temp-record.repository";
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
  /** Final merged recording duration */
  recordDuration?: number;
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

    // 2. Mix vocals with backing track (produces final MP3 path with loudness norm and metadata)
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
    logger.info(
      `[AudioMergeWorker] Final mix complete at ${finalAudioPath} in ${mergeTime}ms`,
    );

    // 3. Upload to S3 and handle based on job type
    const io = (global as any).io;
    if (!io) {
      logger.error(
        `[AudioMergeWorker] CRITICAL: global.io is undefined. Cannot emit socket events!`,
      );
    }

    try {
      if (job.jobType === "preview") {
        // Delete old preview(s) for this studio+music combo before uploading new one
        const previewPrefix = `previews/preview_${job.studioId}_${job.musicId}`;
        try {
          await S3Util.deleteByPrefix(previewPrefix);
        } catch (e) {
          logger.warn(
            `[AudioMergeWorker] Failed to cleanup old previews: ${e}`,
          );
        }

        // Upload with unique key so CDN/client always gets fresh content
        const previewKey = `previews/preview_${job.studioId}_${job.musicId}_${Date.now()}.mp3`;

        // Use stream for S3 upload
        const audioStream = fs.createReadStream(finalAudioPath);
        const previewUrl = await S3Util.uploadFileWithKey(
          audioStream as any,
          previewKey,
          "audio/mpeg",
        );

        // Create MusicLibrary record for the preview
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

        // Broadcast preview_ready to studio
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
      } else if (job.jobType === "save") {
        const mergedFilename = `recording_${job.studioId}_${job.musicId}.mp3`;

        // Use stream for S3 upload to prevent OOM
        const audioStream = fs.createReadStream(finalAudioPath);
        const mergedUrl = await S3Util.uploadFile(
          audioStream as any,
          mergedFilename,
          "audio/mpeg",
        );

        // Create MusicLibrary + MusicRecord in DB
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

        // Catch and save test data for the user
        try {
          const harvestFile = path.join(
            process.cwd(),
            "harvested_test_data.json",
          );
          const harvestEntry = {
            timestamp: new Date().toISOString(),
            jobId: job.jobId,
            studioId: job.studioId,
            musicId: job.musicId,
            backing: job.backingTrackUrl,
            vocals: job.audioUrls,
            offsets: job.offsets || [],
            cdn_url: mergedUrl,
          };
          let currentData = [];
          if (fs.existsSync(harvestFile)) {
            currentData = JSON.parse(fs.readFileSync(harvestFile, "utf-8"));
          }
          currentData.push(harvestEntry);
          fs.writeFileSync(harvestFile, JSON.stringify(currentData, null, 2));
          logger.info(
            `[AudioMergeWorker] Test data harvested to ${harvestFile}`,
          );
        } catch (e) {
          logger.warn(`[AudioMergeWorker] Failed to harvest test data: ${e}`);
        }

        // Cleanup temp records + S3 chunks
        const lookupMusicId = job.metaData?.lookupMusicId || job.musicId;

        await MusicTempRecordRepo.deleteByMusicIdAndStudioId(
          lookupMusicId,
          job.studioId,
        );

        try {
          // 4. Delete temporary chunks from S3
          for (const url of job.audioUrls) {
            try {
              await S3Util.deleteFile(url);
            } catch (e) {
              logger.warn(
                `[AudioMergeWorker] Failed to delete chunk ${url}: ${e}`,
              );
            }
          }

          // 5. Delete preview files for this studio+music session
          const previewPrefix = `previews/preview_${job.studioId}_${job.musicId}`;
          try {
            await S3Util.deleteByPrefix(previewPrefix);
          } catch (e) {
            // Preview might not exist, that's okay
          }
        } catch (e) {
          logger.warn(`[AudioMergeWorker] Failed to cleanup S3 files: ${e}`);
        }

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
    } finally {
      // Final cleanup of the mixed file
      if (fs.existsSync(finalAudioPath)) {
        // try {
        //   fs.unlinkSync(finalAudioPath);
        // } catch (e) {
        //   logger.warn(
        //     `[AudioMergeWorker] Failed to cleanup final mix: ${finalAudioPath}`,
        //   );
        // }
      }
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
