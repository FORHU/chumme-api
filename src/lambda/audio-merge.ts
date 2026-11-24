import {
  AUDIO_MERGE_MAX_RECEIVES,
  AUDIO_MERGE_RESULTS_QUEUE_URL,
} from "../config";
import { enqueue } from "../utils/sqs";
import logger from "../utils/logger";
import {
  AudioMergeJob,
  AudioMergeResult,
  renderMix,
} from "../services/audio-render";

// The audio-merge Lambda: consumes audio-merge-queue (event source mapping,
// batch size 1, ReportBatchItemFailures), renders, and sends the result to
// audio-merge-results. It never touches Postgres or socket.io — it runs
// outside the VPC and cannot reach RDS or Redis. The API process saves the
// result and notifies the studio (src/listeners/audio-result.listener.ts).
//
// Env, set by Terraform: AUDIO_MERGE_RESULTS_QUEUE_URL, AWS_S3_BUCKET_NAME.
// AUDIO_MERGE_MAX_RECEIVES defaults to 2, the job queue's maxReceiveCount.

/** The parts of the SQS event this reads (the aws-lambda types, trimmed). */
export interface SqsRecord {
  messageId: string;
  body: string;
  attributes: { ApproximateReceiveCount?: string };
}
export interface SqsEvent {
  Records: SqsRecord[];
}
export interface SqsBatchResponse {
  batchItemFailures: { itemIdentifier: string }[];
}

export interface HandlerDeps {
  renderMix: typeof renderMix;
  sendResult: (result: AudioMergeResult) => Promise<unknown>;
  maxReceives: number;
}

export function createHandler(deps: HandlerDeps) {
  return async (event: SqsEvent): Promise<SqsBatchResponse> => {
    const batchItemFailures: { itemIdentifier: string }[] = [];

    for (const record of event.Records) {
      if (!(await processRecord(record, deps))) {
        batchItemFailures.push({ itemIdentifier: record.messageId });
      }
    }
    return { batchItemFailures };
  };
}

/** True when the message is done with (delete it), false to retry it. */
async function processRecord(
  record: SqsRecord,
  deps: HandlerDeps,
): Promise<boolean> {
  let job: AudioMergeJob;
  try {
    job = JSON.parse(record.body);
  } catch {
    // Retrying a malformed body can never succeed: drop it.
    logger.error(
      `[AudioMergeLambda] Dropping malformed message ${record.messageId}`,
    );
    return true;
  }

  const attempt = Number(record.attributes?.ApproximateReceiveCount) || 1;
  logger.info(
    `[AudioMergeLambda] ${job.jobType} job ${job.jobId} (attempt ${attempt}/${deps.maxReceives})`,
  );

  try {
    const output = await deps.renderMix(job, attempt);
    await deps.sendResult({ status: "done", job, ...output });
    return true;
  } catch (error: any) {
    const message = String(error?.message || error);
    logger.error(`[AudioMergeLambda] Job ${job.jobId} failed: ${message}`);

    if (attempt < deps.maxReceives) return false; // SQS retries it

    // Last attempt: report the failure so the API can tell the studio, and
    // consume the message. If even the report fails, let it go to the DLQ.
    try {
      await deps.sendResult({ status: "failed", job, error: message });
      return true;
    } catch (sendError) {
      logger.error(
        `[AudioMergeLambda] Could not report failure of ${job.jobId}:`,
        sendError,
      );
      return false;
    }
  }
}

export const handler = createHandler({
  renderMix,
  sendResult: (result) => {
    if (!AUDIO_MERGE_RESULTS_QUEUE_URL) {
      throw new Error(
        "AUDIO_MERGE_RESULTS_QUEUE_URL is not set on the function",
      );
    }
    return enqueue(AUDIO_MERGE_RESULTS_QUEUE_URL, result);
  },
  maxReceives: AUDIO_MERGE_MAX_RECEIVES,
});
