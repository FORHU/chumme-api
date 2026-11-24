import {
  AUDIO_MERGE_MAX_RECEIVES,
  AUDIO_MERGE_QUEUE_URL,
  AUDIO_MERGE_RESULTS_QUEUE_URL,
} from "../config";
import { Consumer, enqueue, receiveCount, startConsumer } from "../utils/sqs";
import logger from "../utils/logger";
import {
  AudioMergeJob,
  AudioMergeResult,
  renderMix,
} from "../services/audio-render";
import { handleMergeResult } from "./audio-result.listener";

export type { AudioMergeJob } from "../services/audio-render";

// ---------------------------------------------------------------------------
// Worker (AUDIO_MERGE_MODE=local)
// ---------------------------------------------------------------------------

/**
 * Consumes audio-merge-queue in this process: renders with FFmpeg, then hands
 * the result to the save half. In the API process that is a direct call. In a
 * process without socket.io (src/worker.ts) it goes over audio-merge-results
 * to the API — handling it here would save the rows but silently drop
 * preview_ready / recording_saved, as worker.ts used to.
 */
export class AudioMergeWorker {
  private consumer: Consumer | null = null;

  async start(): Promise<void> {
    if (!AUDIO_MERGE_QUEUE_URL) {
      throw new Error("AUDIO_MERGE_QUEUE_URL is empty — check env");
    }
    if (!(global as any).io && !AUDIO_MERGE_RESULTS_QUEUE_URL) {
      throw new Error(
        "AudioMergeWorker outside the API process needs AUDIO_MERGE_RESULTS_QUEUE_URL, " +
          "or its socket events would be lost",
      );
    }
    this.consumer = startConsumer<AudioMergeJob>({
      queueUrl: AUDIO_MERGE_QUEUE_URL,
      // Only process 1 merge at a time (CPU-heavy)
      concurrency: 1,
      visibilityTimeout: 120,
      handler: async (job, message) => {
        const attempt = receiveCount(message);
        logger.info(
          `[AudioMergeWorker] Processing ${job.jobType} job ${job.jobId} (attempt ${attempt}/${AUDIO_MERGE_MAX_RECEIVES})`,
        );
        try {
          const output = await renderMix(job, attempt);
          await deliver({ status: "done", job, ...output });
        } catch (error: any) {
          logger.error(
            `[AudioMergeWorker] Job ${job.jobId} failed: ${error.message}`,
          );
          // On the last attempt tell the client, rather than leave it waiting.
          if (attempt >= AUDIO_MERGE_MAX_RECEIVES) {
            await deliver({
              status: "failed",
              job,
              error: String(error?.message || error),
            }).catch((e) =>
              logger.error(
                `[AudioMergeWorker] Could not report failure of ${job.jobId}:`,
                e,
              ),
            );
          }
          // SQS retries it, or after the last attempt moves it to the DLQ.
          throw error;
        }
      },
    });
    logger.info("[AudioMergeWorker] Listening on audio merge queue");
  }

  async stop(): Promise<void> {
    try {
      await this.consumer?.stop();
      logger.info("[AudioMergeWorker] Stopped");
    } catch (error) {
      logger.error("[AudioMergeWorker] Error stopping:", error);
    }
  }
}

async function deliver(result: AudioMergeResult): Promise<void> {
  if ((global as any).io) {
    await handleMergeResult(result);
  } else {
    await enqueue(AUDIO_MERGE_RESULTS_QUEUE_URL, result);
  }
}

/**
 * Publish an audio merge job to the queue.
 * Called by MusicStudioSvc to offload merging to the background worker.
 */
export async function publishMergeJob(job: AudioMergeJob): Promise<void> {
  await enqueue(AUDIO_MERGE_QUEUE_URL, job);
  logger.info(
    `[AudioMergeWorker] Job published: ${job.jobId} (${job.jobType})`,
  );
}
