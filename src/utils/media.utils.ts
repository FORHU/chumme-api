import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import ffprobePath from "ffprobe-static";
import path from "path";
import fs from "fs";
import os from "os";
import axios from "axios";
import logger from "./logger";
import { Readable, PassThrough, Writable } from "stream";

// Set the ffmpeg and ffprobe paths
if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath);
if (ffprobePath.path) ffmpeg.setFfprobePath(ffprobePath.path);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Ensure a URL is a valid https URL. */
function ensureCleanUrl(url: string): string {
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

/** Generate a unique temp file path. */
function makeTempPath(prefix: string, ext = ".mp4"): string {
  return path.join(
    os.tmpdir(),
    `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`,
  );
}

/** Check if input is local path */
function isLocalPath(p: string): boolean {
  return (
    p.startsWith("/") ||
    /^[a-zA-Z]:[/\\]/.test(p) ||
    (!p.startsWith("http://") && !p.startsWith("https://"))
  );
}

// ---------------------------------------------------------------------------
// Streaming Media Processing
// ---------------------------------------------------------------------------

export interface MediaMetadata {
  duration: number; // in seconds
  format: string;
  width?: number; // video only
  height?: number; // video only
  bitrate: number; // in bps
  hasAudio: boolean;
  hasVideo: boolean;
}

/**
 * Get technical metadata for a media file (Supports URL or Local Path).
 * Uses ffmpeg.ffprobe across network if possible (supported by some builds),
 * otherwise falls back to small partial download or full download.
 */
export const getMediaMetadata = async (
  input: string,
): Promise<MediaMetadata> => {
  const cleanUrl = ensureCleanUrl(input);

  // ffprobe can often read remote HTTP URLs directly
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(cleanUrl, (err, metadata) => {
      if (err) {
        // Fallback: This might fail if remote server blocks range requests or probes
        // In a full production env, you might download the first 50KB to check header
        return reject(err);
      }

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

/**
 * Generate a thumbnail screenshot from a video.
 * Note: Screenshots are hard to "stream" because seeking requires random access.
 * We download a small chunk or the whole file to temp for reliability.
 */
export const generateThumbnail = async (
  input: string,
  timestamp?: number,
): Promise<Buffer> => {
  // For thumbnail, we generally need the file locally to seek efficiently
  // Optimization: In production, you'd use a signed S3 URL that supports Range requests
  // so ffmpeg only downloads what it needs.
  const cleanUrl = ensureCleanUrl(input);

  const outputPath = makeTempPath("thumb", ".jpg");
  const folder = path.dirname(outputPath);
  const filename = path.basename(outputPath);

  return new Promise((resolve, reject) => {
    let command = ffmpeg(cleanUrl);

    // If input is remote, adding seek before input might be faster for some servers
    if (timestamp) {
      command.seekInput(timestamp);
    }

    command
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
      .on("error", (err) => {
        logger.error("[MediaUtils] Thumbnail generation failed:", err);
        reject(err);
      });
  });
};

/**
 * Optimizes video for web streaming (H.264/AAC) using STREAMS.
 *
 * @param inputStream Readable stream of the source video.
 * @returns PassThrough stream of the output MP4.
 *
 * NOTE: MP4 requires the 'moov' atom at the beginning for fast start.
 * FFmpeg cannot write a seekable MP4 to a non-seekable output stream (like S3 upload) easily
 * because it needs to go back and write the header size after processing.
 *
 * Workaround for "Streaming + FastStart":
 * 1. Output to 'frag_keyframe' fragmented MP4 (good for low latency, bad for compatibility).
 * 2. OR: Write to local temp file, then stream upload (Safest for compatibility).
 *
 * We will implement Method 2 (Temp File) for MP4 reliability, BUT we stream the DOWNLOAD.
 */
export const optimizeVideoToStream = async (
  inputUrl: string,
  resolution: "1080p" | "720p" | "480p" = "720p",
): Promise<string> => {
  const cleanUrl = ensureCleanUrl(inputUrl);
  const outputPath = makeTempPath("web_video", ".mp4");

  let width = 1280;
  if (resolution === "1080p") width = 1920;
  if (resolution === "480p") width = 854;

  return new Promise((resolve, reject) => {
    logger.info(`[MediaUtils] Starting stream transcoding for ${cleanUrl}`);

    ffmpeg(cleanUrl)
      // Video Settings
      .videoCodec("libx264")
      .videoBitrate(resolution === "1080p" ? "4500k" : "2500k")
      .size(`${width}x?`)
      .outputOptions([
        "-preset fast", // Faster encoding for worker
        "-crf 23",
        "-movflags +faststart", // Relocate moov atom to start
        "-pix_fmt yuv420p",
      ])
      // Audio Settings (Netflix Quality)
      .audioCodec("aac")
      .audioBitrate("192k")
      .audioFrequency(48000)
      .audioChannels(2)
      .audioFilters(["loudnorm=I=-16:TP=-1.5:LRA=11"])
      .on("start", (cmd) => logger.info(`[MediaUtils] FFmpeg Command: ${cmd}`))
      .on("error", (err) => {
        logger.error("[MediaUtils] Transcoding failed:", err);
        reject(err);
      })
      .on("end", () => {
        logger.info("[MediaUtils] Transcoding complete");
        resolve(outputPath);
      })
      .save(outputPath);
  });
};

/**
 * Optimizes audio for web (MP3/AAC) with loudness normalization.
 */
export const optimizeAudioToStream = async (
  inputUrl: string,
  format: "mp3" | "aac" = "mp3",
): Promise<string> => {
  const cleanUrl = ensureCleanUrl(inputUrl);
  const ext = format === "mp3" ? ".mp3" : ".m4a";
  const outputPath = makeTempPath("web_audio", ext);

  return new Promise((resolve, reject) => {
    logger.info(`[MediaUtils] Starting audio transcoding for ${cleanUrl}`);

    const command = ffmpeg(cleanUrl)
      .noVideo()
      .audioFilters(["loudnorm=I=-16:TP=-1.5:LRA=11"]);

    if (format === "mp3") {
      command.audioCodec("libmp3lame").audioBitrate("192k");
    } else {
      command.audioCodec("aac").audioBitrate("192k");
    }

    command
      .on("error", (err) => {
        logger.error("[MediaUtils] Audio transcoding failed:", err);
        reject(err);
      })
      .on("end", () => {
        logger.info("[MediaUtils] Audio transcoding complete");
        resolve(outputPath);
      })
      .save(outputPath);
  });
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
