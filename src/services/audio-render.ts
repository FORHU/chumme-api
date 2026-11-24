import fs from "fs";
import logger from "../utils/logger";
import {
  batchOverlayAudioFiles,
  concatenateAudioFiles,
  mixVocalsWithBacking,
  VoiceEffect,
} from "../utils/audio.utils";
import { cleanupTempFiles } from "../utils/media.utils";
import S3Util from "../utils/s3.util";

// The render half of an audio merge: FFmpeg plus one S3 upload. It must not
// import Prisma or socket.io — the audio-merge Lambda bundles this file and has
// neither (no VPC, so no RDS or Redis). Saving and socket events live in
// src/listeners/audio-result.listener.ts, which only the API process runs.

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

export interface RenderOutput {
  /** S3 key of the final MP3. Clients get a URL built from it by the API. */
  outputKey: string;
  size: number;
  mergeTimeMs: number;
}

/** What comes back from a render, on the results queue or in-process. */
export type AudioMergeResult =
  | ({ status: "done"; job: AudioMergeJob } & RenderOutput)
  | { status: "failed"; job: AudioMergeJob; error: string };

/** Old previews for a studio+music session, matched by key prefix. */
export function previewPrefix(
  job: Pick<AudioMergeJob, "studioId" | "musicId">,
) {
  return `previews/preview_${job.studioId}_${job.musicId}`;
}

/**
 * The S3 key a job renders to: fixed per job AND attempt (the SQS receive
 * count). Not per job alone: a retry that runs after an earlier attempt
 * already saved and deleted some chunks renders a partial mix, and with a
 * shared key it would overwrite the saved file. The result handler deletes a
 * duplicate attempt's object instead. Previews stay under their session prefix
 * so the prefix cleanup still finds them.
 */
export function renderKey(job: AudioMergeJob, attempt = 1): string {
  const id = job.jobId.replace(/[^A-Za-z0-9_-]/g, "_");
  const suffix = `${id}_a${attempt}.mp3`;
  return job.jobType === "preview"
    ? `${previewPrefix(job)}_${suffix}`
    : `renders/${suffix}`;
}

export async function renderMix(
  job: AudioMergeJob,
  attempt = 1,
): Promise<RenderOutput> {
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
    `[AudioRender] Vocals merged: ${vocalsBuffer.length} bytes in ${Date.now() - startTime}ms`,
  );

  // 2. Mix with the backing track: loudness, effect, trim and ID3 tags
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

  try {
    if (!finalAudioPath || !fs.existsSync(finalAudioPath)) {
      throw new Error("Final audio file was not generated");
    }
    const size = fs.statSync(finalAudioPath).size;

    // 3. Upload. Streamed, so a long recording never sits in memory whole.
    const outputKey = renderKey(job, attempt);
    await S3Util.uploadFileWithKey(
      fs.createReadStream(finalAudioPath) as any,
      outputKey,
      "audio/mpeg",
    );

    const mergeTimeMs = Date.now() - startTime;
    logger.info(
      `[AudioRender] ${job.jobType} ${job.jobId} rendered to ${outputKey} (${size} bytes, ${mergeTimeMs}ms)`,
    );
    return { outputKey, size, mergeTimeMs };
  } finally {
    cleanupTempFiles([finalAudioPath]);
  }
}
