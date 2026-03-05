import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import ffprobePath from "ffprobe-static";
import path from "path";
import fs from "fs";
import os from "os";
import axios from "axios";
import logger from "./logger";
import { Readable, PassThrough, Writable } from "stream";

import S3Util from "./s3.util";

// Set the ffmpeg and ffprobe paths globally
if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath);
if (ffprobePath.path) ffmpeg.setFfprobePath(ffprobePath.path);

export { ffmpeg };

// ---------------------------------------------------------------------------
// Shared Infrastructure (Connected to AudioUtils)
// ---------------------------------------------------------------------------

/**
 * Ensure a URL is a valid https URL, free of common typos and trailing dots.
 */
export function ensureCleanUrl(url: string): string {
  if (!url) return url;
  let clean = url.trim();

  clean = clean.replace(/cloudfront\.netr\//i, "cloudfront.net/");
  clean = clean.replace(/\.+$/, "");

  if (
    !clean.startsWith("http://") &&
    !clean.startsWith("https://") &&
    !clean.startsWith("/") &&
    !/^[a-zA-Z]:[/\\]/.test(clean)
  ) {
    clean = `https://${clean}`;
  }

  return clean;
}

/** Check if a string is a local file path rather than a URL. */
export function isLocalPath(p: string): boolean {
  return (
    p.startsWith("/") ||
    /^[a-zA-Z]:[/\\]/.test(p) ||
    (!p.startsWith("http://") && !p.startsWith("https://"))
  );
}

/** Sleep helper for backoff. */
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Generate a unique temp file path. */
export function makeTempPath(prefix: string, ext = ".wav"): string {
  return path.join(
    os.tmpdir(),
    `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`,
  );
}

/** Read a temp file into a Buffer and delete it. */
export function readAndCleanup(filePath: string): Buffer {
  const buffer = fs.readFileSync(filePath);
  try {
    fs.unlinkSync(filePath);
  } catch (_) {}
  return buffer;
}

/**
 * Delete temp files. Skips paths that are not in os.tmpdir() (original local files).
 */
export function cleanupTempFiles(paths: string[]): void {
  const tmpDir = os.tmpdir();
  for (const p of paths) {
    try {
      if (p && p.startsWith(tmpDir)) fs.unlinkSync(p);
    } catch (_) {}
  }
}

/**
 * Purge ALL orphaned chumme-related temp files from os.tmpdir().
 * Call this on worker startup to clear residue from previous crashes.
 */
export function cleanupAllTempFiles(): void {
  const tmpDir = os.tmpdir();
  try {
    const files = fs.readdirSync(tmpDir);
    const prefixes = [
      "chunk_",
      "overlay_",
      "vocals_",
      "submix_",
      "mixed_",
      "web_video_",
      "web_audio_",
      "thumb_",
      "chumme-job-",
    ];

    let count = 0;
    for (const file of files) {
      if (prefixes.some((pre) => file.startsWith(pre))) {
        const fullPath = path.join(tmpDir, file);
        try {
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            fs.rmSync(fullPath, { recursive: true, force: true });
          } else {
            fs.unlinkSync(fullPath);
          }
          count++;
        } catch (_) {}
      }
    }
    if (count > 0) {
      logger.info(
        `[MediaUtils] Startup cleanup: Removed ${count} orphaned files/dirs`,
      );
    }
  } catch (err: any) {
    logger.error(`[MediaUtils] Global cleanup failed: ${err.message}`);
  }
}

/**
 * Create an isolated temp directory for a specific job.
 * All temp files for this job should go inside this directory.
 */
export function createJobTempDir(jobId: string): string {
  const jobDir = path.join(os.tmpdir(), `chumme-job-${jobId}`);
  if (!fs.existsSync(jobDir)) {
    fs.mkdirSync(jobDir, { recursive: true });
  }
  return jobDir;
}

/**
 * Recursively delete a job's temp directory and all its contents.
 * Call in a `finally` block to guarantee cleanup.
 */
export function cleanupJobTempDir(jobId: string): void {
  const jobDir = path.join(os.tmpdir(), `chumme-job-${jobId}`);
  try {
    if (fs.existsSync(jobDir)) {
      fs.rmSync(jobDir, { recursive: true, force: true });
    }
  } catch (err: any) {
    logger.warn(
      `[MediaUtils] Failed to cleanup job dir ${jobDir}: ${err.message}`,
    );
  }
}

/**
 * Generate a temp file path inside a job directory.
 */
export function makeJobTempPath(
  jobDir: string,
  prefix: string,
  ext = ".wav",
): string {
  return path.join(
    jobDir,
    `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`,
  );
}

/**
 * Download a single URL to a temp file with retry + exponential backoff.
 */
export async function downloadSingle(
  url: string,
  retries = 3,
): Promise<string> {
  const cleanUrl = ensureCleanUrl(url);

  if (isLocalPath(cleanUrl) && fs.existsSync(cleanUrl)) return cleanUrl;

  const urlObj = new URL(cleanUrl);
  const ext = path.extname(urlObj.pathname) || ".m4a";
  const tempPath = makeTempPath("chunk", ext);

  const isS3Url =
    cleanUrl.includes("amazonaws.com") || cleanUrl.includes("cloudfront.net");

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      let data: Buffer;

      if (isS3Url) {
        data = await S3Util.getFile(cleanUrl);
      } else {
        const response = await axios.get(cleanUrl, {
          responseType: "arraybuffer",
          timeout: 30_000,
        });
        data = Buffer.from(response.data);
      }

      fs.writeFileSync(tempPath, data as any);
      return tempPath;
    } catch (err: any) {
      logger.warn(
        `[MediaUtils] Download attempt ${attempt}/${retries} failed for ${cleanUrl}: ${err.message}`,
      );
      if (attempt === retries) throw err;
      await sleep(1000 * attempt);
    }
  }

  throw new Error(`Failed to download after ${retries} attempts: ${cleanUrl}`);
}

/**
 * Downloads an array of URLs to local temp files with concurrency limiting.
 */
export async function downloadToTemp(
  urls: string[],
  concurrency = 5,
  skipFailures = false,
): Promise<(string | null)[]> {
  const results: (string | null)[] = new Array(urls.length).fill(null);
  let nextIndex = 0;

  const worker = async () => {
    while (nextIndex < urls.length) {
      const i = nextIndex++;
      try {
        results[i] = await downloadSingle(urls[i]);
      } catch (err: any) {
        if (skipFailures) {
          logger.warn(
            `[MediaUtils] Skipping failed chunk ${i}: ${err.message}`,
          );
          results[i] = null;
        } else {
          throw err;
        }
      }
    }
  };

  const workers = Array.from(
    { length: Math.min(concurrency, urls.length) },
    () => worker(),
  );
  await Promise.all(workers);

  return results;
}

// ---------------------------------------------------------------------------
// Specialized Media Processing (Required by MediaCtrl & Listeners)
// ---------------------------------------------------------------------------

export interface MediaMetadata {
  duration: number;
  format: string;
  width?: number;
  height?: number;
  bitrate: number;
  hasAudio: boolean;
  hasVideo: boolean;
}

/** Get technical metadata for a media file */
export const getMediaMetadata = async (
  input: string,
): Promise<MediaMetadata> => {
  const cleanUrl = ensureCleanUrl(input);
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(cleanUrl, (err, metadata) => {
      if (err) return reject(err);
      const format = metadata.format;
      const videoStream = metadata.streams.find(
        (s) => s.codec_type === "video",
      );
      const audioStream = metadata.streams.find(
        (s) => s.codec_type === "audio",
      );
      resolve({
        duration: format.duration || 0,
        format: format.format_name || "unknown",
        bitrate: format.bit_rate ? parseInt(format.bit_rate.toString()) : 0,
        width: videoStream ? videoStream.width : undefined,
        height: videoStream ? videoStream.height : undefined,
        hasVideo: !!videoStream,
        hasAudio: !!audioStream,
      });
    });
  });
};

/** Generate a thumbnail screenshot from a video */
export const generateThumbnail = async (
  input: string,
  timestamp?: number,
): Promise<Buffer> => {
  const cleanUrl = ensureCleanUrl(input);
  const outputPath = makeTempPath("thumb", ".jpg");
  const folder = path.dirname(outputPath);
  const filename = path.basename(outputPath);

  return new Promise((resolve, reject) => {
    ffmpeg(cleanUrl)
      .seekInput(timestamp || 1)
      .screenshots({
        timestamps: [timestamp || 1],
        filename: filename,
        folder: folder,
        size: "640x?",
      })
      .on("end", () => {
        try {
          const buffer = fs.readFileSync(outputPath);
          fs.unlinkSync(outputPath);
          resolve(buffer);
        } catch (e) {
          reject(e);
        }
      })
      .on("error", (err) => reject(err));
  });
};

/** Optimizes video for web streaming */
export const optimizeVideoToStream = async (
  inputUrl: string,
  resolution: "1080p" | "720p" | "480p" | "240p" | "144p" = "720p",
): Promise<string> => {
  const cleanUrl = ensureCleanUrl(inputUrl);
  const outputPath = makeTempPath("web_video", ".mp4");

  let width = 1280;
  let bitrate = "2500k";

  if (resolution === "1080p") {
    width = 1920;
    bitrate = "4500k";
  } else if (resolution === "480p") {
    width = 854;
    bitrate = "1000k";
  } else if (resolution === "240p") {
    width = 426;
    bitrate = "400k";
  } else if (resolution === "144p") {
    width = 256;
    bitrate = "200k";
  }

  return new Promise((resolve, reject) => {
    ffmpeg(cleanUrl)
      .videoCodec("libx264")
      .size(`${width}x?`)
      .videoBitrate(bitrate)
      .outputOptions([
        "-preset fast",
        "-crf 23",
        "-movflags +faststart",
        "-pix_fmt yuv420p",
      ])
      .audioCodec("aac")
      .audioBitrate("192k")
      .audioFrequency(48000)
      .audioChannels(2)
      .audioFilters(["loudnorm=I=-16:TP=-1.5:LRA=11"])
      .on("start", (cmd) =>
        logger.info(`[MediaUtils] Transcoding to ${resolution}: ${cmd}`),
      )
      .on("error", (err) => {
        logger.error(`[MediaUtils] Transcoding failed:`, err);
        reject(err);
      })
      .on("end", () => {
        logger.info(`[MediaUtils] Transcoding complete: ${outputPath}`);
        resolve(outputPath);
      })
      .save(outputPath);
  });
};

/** Optimizes audio for web */
export const optimizeAudioToStream = async (
  inputUrl: string,
  format: "mp3" | "aac" = "mp3",
): Promise<string> => {
  const cleanUrl = ensureCleanUrl(inputUrl);
  const ext = format === "mp3" ? ".mp3" : ".m4a";
  const outputPath = makeTempPath("web_audio", ext);

  return new Promise((resolve, reject) => {
    const command = ffmpeg(cleanUrl)
      .noVideo()
      .audioFilters(["loudnorm=I=-16:TP=-1.5:LRA=11"]);
    if (format === "mp3") command.audioCodec("libmp3lame").audioBitrate("192k");
    else command.audioCodec("aac").audioBitrate("192k");

    command
      .on("error", (err) => reject(err))
      .on("end", () => resolve(outputPath))
      .save(outputPath);
  });
};

/**
 * Streaming variant of optimizeVideoToStream.
 * Pipes FFmpeg output through a PassThrough stream using fragmented MP4
 * (`frag_keyframe+empty_moov`) so playback can begin before processing ends.
 * Ideal for piping directly to S3 upload or real-time delivery.
 */
export const streamOptimizedVideo = (
  inputUrl: string,
  resolution: "1080p" | "720p" | "480p" | "240p" | "144p" = "720p",
): PassThrough => {
  const cleanUrl = ensureCleanUrl(inputUrl);
  const output = new PassThrough();

  let width = 1280;
  let bitrate = "2500k";

  if (resolution === "1080p") {
    width = 1920;
    bitrate = "4500k";
  } else if (resolution === "480p") {
    width = 854;
    bitrate = "1000k";
  } else if (resolution === "240p") {
    width = 426;
    bitrate = "400k";
  } else if (resolution === "144p") {
    width = 256;
    bitrate = "200k";
  }

  ffmpeg(cleanUrl)
    .videoCodec("libx264")
    .size(`${width}x?`)
    .videoBitrate(bitrate)
    .outputOptions([
      "-preset fast",
      "-crf 23",
      "-movflags frag_keyframe+empty_moov",
      "-pix_fmt yuv420p",
    ])
    .audioCodec("aac")
    .audioBitrate("192k")
    .audioFrequency(48000)
    .audioChannels(2)
    .audioFilters(["loudnorm=I=-16:TP=-1.5:LRA=11"])
    .format("mp4")
    .on("start", (cmd) =>
      logger.info(`[MediaUtils] Stream transcode (${resolution}): ${cmd}`),
    )
    .on("error", (err) => {
      logger.error(`[MediaUtils] Stream transcode failed:`, err);
      output.destroy(err);
    })
    .pipe(output, { end: true });

  return output;
};

/**
 * Streaming variant of optimizeAudioToStream.
 * Pipes FFmpeg output through a PassThrough stream for real-time delivery
 * or direct S3 upload without writing to disk.
 */
export const streamOptimizedAudio = (
  inputUrl: string,
  format: "mp3" | "aac" = "mp3",
): PassThrough => {
  const cleanUrl = ensureCleanUrl(inputUrl);
  const output = new PassThrough();

  const command = ffmpeg(cleanUrl)
    .noVideo()
    .audioFilters(["loudnorm=I=-16:TP=-1.5:LRA=11"]);

  if (format === "mp3") command.audioCodec("libmp3lame").audioBitrate("192k");
  else command.audioCodec("aac").audioBitrate("192k");

  command
    .format(format === "mp3" ? "mp3" : "adts")
    .on("error", (err) => {
      logger.error(`[MediaUtils] Audio stream failed:`, err);
      output.destroy(err);
    })
    .pipe(output, { end: true });

  return output;
};

/**
 * HLS Generation (Single-Pass Multi-Bitrate).
 * Generates a master playlist and 5 variant streams:
 * 1080p, 720p, 480p, 240p, 144p.
 *
 * This MUST write to a local directory because HLS creates multiple files.
 * Returns the directory path containing the artifacts.
 */
export const generateMultiVariantHls = async (
  inputUrl: string,
): Promise<string> => {
  const cleanUrl = ensureCleanUrl(inputUrl);
  const outputDir = path.join(
    os.tmpdir(),
    `hls_multi_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
  );
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  return new Promise((resolve, reject) => {
    ffmpeg(cleanUrl)
      // Map one audio to all variants
      .outputOptions([
        "-map 0:v",
        "-map 0:a",
        "-map 0:v",
        "-map 0:a",
        "-map 0:v",
        "-map 0:a",
        "-map 0:v",
        "-map 0:a",
        "-map 0:v",
        "-map 0:a",

        // Variant 0: 1080p
        "-s:v:0 1920x1080",
        "-b:v:0 4500k",
        "-maxrate:v:0 4500k",
        "-bufsize:v:0 9000k",

        // Variant 1: 720p
        "-s:v:1 1280x720",
        "-b:v:1 2500k",
        "-maxrate:v:1 2500k",
        "-bufsize:v:1 5000k",

        // Variant 2: 480p
        "-s:v:2 854x480",
        "-b:v:2 1000k",
        "-maxrate:v:2 1000k",
        "-bufsize:v:2 2000k",

        // Variant 3: 240p
        "-s:v:3 426x240",
        "-b:v:3 400k",
        "-maxrate:v:3 400k",
        "-bufsize:v:3 800k",

        // Variant 4: 144p
        "-s:v:4 256x144",
        "-b:v:4 200k",
        "-maxrate:v:4 200k",
        "-bufsize:v:4 400k",

        // Audio settings (shared via map)
        "-c:a aac",
        "-b:a 128k",
        "-ar 48000",

        // HLS Settings
        "-f hls",
        "-hls_time 4",
        "-hls_playlist_type vod",
        "-master_pl_name master.m3u8",
        "-hls_segment_filename " + path.join(outputDir, "v%v_seg_%03d.ts"),
        '-var_stream_map "v:0,a:0 v:1,a:1 v:2,a:2 v:3,a:3 v:4,a:4"',
      ])
      .output(path.join(outputDir, "v%v.m3u8"))
      .on("start", (cmd) =>
        logger.info(`[MediaUtils] Multi-HLS started: ${cmd}`),
      )
      .on("error", (err) => {
        logger.error(`[MediaUtils] Multi-HLS failed:`, err);
        reject(err);
      })
      .on("end", () => {
        logger.info(`[MediaUtils] Multi-HLS complete`);
        resolve(outputDir);
      })
      .run();
  });
};
