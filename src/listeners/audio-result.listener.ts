import path from "path";
import { AUDIO_MERGE_RESULTS_QUEUE_URL } from "../config";
import { Consumer, startConsumer } from "../utils/sqs";
import logger from "../utils/logger";
import S3Util from "../utils/s3.util";
import { prisma } from "../utils/prisma";
import MusicLibraryRepo from "../repositories/music-library.repository";
import MusicRecordRepo from "../repositories/music-record.repository";
import MusicTempRecordRepo from "../repositories/music-temp-record.repository";
import {
  AudioMergeJob,
  AudioMergeResult,
  previewPrefix,
} from "../services/audio-render";

// The save half of an audio merge: database rows, cleanup and socket events.
// Runs only in the API process, which has Postgres and socket.io. The render
// half (src/services/audio-render.ts) may run elsewhere — the Lambda, or
// src/worker.ts — and hands its result over on audio-merge-results.

/** The slice of socket.io this needs; a fake in tests. */
export interface SocketEmitter {
  to(room: string): { emit(event: string, payload: unknown): unknown };
}

function globalIo(): SocketEmitter | null {
  return (global as any).io ?? null;
}

/**
 * Handle one finished (or finally failed) render. Safe to run twice for the
 * same result: SQS can deliver it again, and the second run converges on the
 * same rows and re-sends the same event.
 */
export async function handleMergeResult(
  result: AudioMergeResult,
  io: SocketEmitter | null = globalIo(),
): Promise<void> {
  if (!io) {
    // Throw rather than drop the event: the message goes back on the queue
    // instead of the client waiting forever.
    throw new Error(
      "handleMergeResult needs socket.io: run it in the API process only",
    );
  }
  const { job } = result;

  if (result.status === "failed") {
    await handleFailure(job, result.error, io);
  } else if (job.jobType === "preview") {
    await handlePreview(
      job,
      result.outputKey,
      result.size,
      result.mergeTimeMs,
      io,
    );
  } else {
    await handleSave(
      job,
      result.outputKey,
      result.size,
      result.mergeTimeMs,
      io,
    );
  }
}

async function handlePreview(
  job: AudioMergeJob,
  outputKey: string,
  size: number,
  mergeTimeMs: number,
  io: SocketEmitter,
): Promise<void> {
  const previewUrl = S3Util.publicUrl(outputKey);
  const filename = path.basename(outputKey);

  // A redelivered result finds the row it already wrote.
  const fileRecord =
    (await prisma.musicLibrary.findFirst({
      where: { fileType: "PREVIEW", filename },
    })) ??
    (await MusicLibraryRepo.create({
      filename,
      fileUrl: previewUrl,
      fileType: "PREVIEW",
      metaData: { mimetype: "audio/mpeg", size, isTransient: true },
    }));

  await deletePreviews(job, { key: outputKey, fileId: fileRecord.id });

  io.to(job.studioId).emit("preview_ready", {
    studioId: job.studioId,
    previewUrl,
    fileId: fileRecord.id,
    chunkCount: job.audioUrls.length,
    mergeTimeMs,
  });
  logger.info(
    `[AudioResult] Preview delivered: ${previewUrl} (${mergeTimeMs}ms)`,
  );
}

async function handleSave(
  job: AudioMergeJob,
  outputKey: string,
  size: number,
  mergeTimeMs: number,
  io: SocketEmitter,
): Promise<void> {
  const fileUrl = S3Util.publicUrl(outputKey);

  let musicRecord: Awaited<ReturnType<typeof MusicRecordRepo.findByJobId>>;
  try {
    // One transaction: a crash can no longer leave a MusicLibrary row with no
    // record, or a record with only some of its parts.
    musicRecord = await prisma.$transaction(async (tx) => {
      const fileRecord = await MusicLibraryRepo.create(
        {
          filename: `recording_${job.studioId}_${job.musicId}.mp3`,
          fileUrl,
          metaData: { mimetype: "audio/mpeg", size },
          fileType: "RECORDING",
        },
        tx,
      );

      const record = await MusicRecordRepo.create(
        {
          studioId: job.studioId,
          musicId: job.musicId,
          fileId: fileRecord.id,
          singerIds: job.singerIds || [],
          metaData: job.metaData,
          recordDuration: job.recordDuration || job.maxDuration,
          jobId: job.jobId,
        },
        tx,
      );

      if (job.performanceMapping && job.performanceMapping.length > 0) {
        await tx.musicSingerPart.createMany({
          data: job.performanceMapping.map((p, index) => ({
            recordId: record.id,
            startLine: p.startLine,
            endLine: p.endLine,
            singerId: p.singerId,
            vocalRoleIndex: p.vocalRoleIndex || 1,
            order: index,
          })),
        });
      }
      return record;
    });
  } catch (err: any) {
    // P2002 on jobId: an earlier delivery of this job already saved it.
    if (err?.code !== "P2002") throw err;
    musicRecord = await MusicRecordRepo.findByJobId(job.jobId);
    if (!musicRecord) throw err;
    logger.info(
      `[AudioResult] Job ${job.jobId} was already saved as ${musicRecord.id}`,
    );
  }
  if (!musicRecord)
    throw new Error(`Save of job ${job.jobId} returned no record`);

  // A duplicate attempt rendered its own object; the saved row points at the
  // first one, so this one is garbage.
  const savedUrl = musicRecord.file?.fileUrl || fileUrl;
  if (savedUrl !== fileUrl) {
    await S3Util.deleteFileByKey(outputKey).catch((e) =>
      logger.warn(
        `[AudioResult] Failed to delete duplicate render ${outputKey}: ${e}`,
      ),
    );
  }

  await cleanupSession(job);

  // A record without singers can never be listed by findByUserId — surface
  // it here rather than letting the client show a false "saved".
  if (!musicRecord.singers?.length) {
    logger.error(
      `[AudioResult] Record ${musicRecord.id} saved with NO singers — it will not appear in any user's recordings`,
      { jobId: job.jobId, studioId: job.studioId },
    );
  }

  emitSaved(io, job, musicRecord.id, savedUrl, mergeTimeMs);
  logger.info(
    `[AudioResult] Recording saved: ${musicRecord.id} (${mergeTimeMs}ms)`,
  );
}

async function handleFailure(
  job: AudioMergeJob,
  error: string,
  io: SocketEmitter,
): Promise<void> {
  if (job.jobType === "save") {
    // The last attempt can fail only because an earlier one already saved
    // and deleted the chunks. Then the right answer is "saved".
    const existing = await MusicRecordRepo.findByJobId(job.jobId);
    if (existing) {
      await cleanupSession(job);
      emitSaved(io, job, existing.id, existing.file?.fileUrl ?? undefined);
      return;
    }
  }

  logger.error(
    `[AudioResult] ${job.jobType} job ${job.jobId} failed: ${error}`,
    {
      studioId: job.studioId,
    },
  );
  // No error text to the client: it is internal (FFmpeg, S3) and unactionable.
  io.to(job.studioId).emit(
    job.jobType === "save" ? "save_failed" : "preview_failed",
    { studioId: job.studioId, musicId: job.musicId, jobId: job.jobId },
  );
}

function emitSaved(
  io: SocketEmitter,
  job: AudioMergeJob,
  recordId: string,
  fileUrl?: string,
  mergeTimeMs?: number,
) {
  io.to(job.studioId).emit("recording_saved", {
    studioId: job.studioId,
    musicId: job.musicId,
    recordId,
    fileUrl,
    mergeTimeMs,
  });
}

/**
 * After a save: temp records, the S3 chunks and every preview of the session.
 * Each step is idempotent and best-effort — the recording is already saved.
 */
async function cleanupSession(job: AudioMergeJob): Promise<void> {
  const lookupMusicId = job.metaData?.lookupMusicId || job.musicId;
  await MusicTempRecordRepo.deleteByMusicIdAndStudioId(
    lookupMusicId,
    job.studioId,
  );

  for (const url of job.audioUrls) {
    try {
      await S3Util.deleteFile(url);
    } catch (e) {
      logger.warn(`[AudioResult] Failed to delete chunk ${url}: ${e}`);
    }
  }

  await deletePreviews(job);
}

/**
 * Delete a session's previews: the S3 objects and their PREVIEW rows. With
 * `keep`, the newest preview stays. Before this, old PREVIEW rows were never
 * deleted, only their objects, so every preview left a dead row behind.
 */
async function deletePreviews(
  job: AudioMergeJob,
  keep?: { key: string; fileId: string },
): Promise<void> {
  const prefix = `${previewPrefix(job)}_`;
  try {
    await S3Util.deleteByPrefix(prefix, keep ? [keep.key] : []);
  } catch (e) {
    logger.warn(`[AudioResult] Failed to delete old preview objects: ${e}`);
  }
  try {
    await prisma.musicLibrary.deleteMany({
      where: {
        fileType: "PREVIEW",
        filename: { startsWith: path.basename(prefix) },
        ...(keep && { id: { not: keep.fileId } }),
      },
    });
  } catch (e) {
    logger.warn(`[AudioResult] Failed to delete old PREVIEW rows: ${e}`);
  }
}

/**
 * Consumes audio-merge-results: renders finished outside this process (the
 * Lambda, or src/worker.ts). Runs in the API process whenever the queue URL is
 * set, whatever AUDIO_MERGE_MODE says, since it is cheap and must run where
 * socket.io is.
 */
export class AudioMergeResultWorker {
  private consumer: Consumer | null = null;

  async start(): Promise<void> {
    if (!AUDIO_MERGE_RESULTS_QUEUE_URL) {
      throw new Error("AUDIO_MERGE_RESULTS_QUEUE_URL is empty — check env");
    }
    if (!globalIo()) {
      throw new Error("AudioMergeResultWorker must run in the API process");
    }
    this.consumer = startConsumer<AudioMergeResult>({
      queueUrl: AUDIO_MERGE_RESULTS_QUEUE_URL,
      concurrency: 2,
      visibilityTimeout: 60,
      handler: (result) => handleMergeResult(result),
    });
    logger.info("[AudioResult] Listening on audio merge results queue");
  }

  async stop(): Promise<void> {
    await this.consumer?.stop();
  }
}
