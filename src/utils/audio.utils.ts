import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import ffprobePath from "ffprobe-static";
import path from "path";
import fs from "fs";
import os from "os";
import axios from "axios";
import logger from "./logger";
import { PassThrough } from "stream";

// Set the ffmpeg and ffprobe paths
if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath);
if (ffprobePath.path) ffmpeg.setFfprobePath(ffprobePath.path);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Ensure a URL is a valid https URL, free of common typos and trailing dots.
 */
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

/** Check if a string is a local file path rather than a URL. */
function isLocalPath(p: string): boolean {
  return (
    p.startsWith("/") ||
    /^[a-zA-Z]:[/\\]/.test(p) ||
    (!p.startsWith("http://") && !p.startsWith("https://"))
  );
}

/** Sleep helper for backoff. */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Generate a unique temp file path. */
function makeTempPath(prefix: string, ext = ".wav"): string {
  return path.join(
    os.tmpdir(),
    `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`,
  );
}

/** Read a temp file into a Buffer and delete it. */
function readAndCleanup(filePath: string): Buffer {
  const buffer = fs.readFileSync(filePath);
  try {
    fs.unlinkSync(filePath);
  } catch (_) {}
  return buffer;
}

/**
 * Delete temp files. Skips paths that are not in os.tmpdir() (original local files).
 */
function cleanupTempFiles(paths: string[]): void {
  const tmpDir = os.tmpdir();
  for (const p of paths) {
    try {
      if (p.startsWith(tmpDir)) fs.unlinkSync(p);
    } catch (_) {}
  }
}

// ---------------------------------------------------------------------------
// Download with retry + partial-failure tolerance
// ---------------------------------------------------------------------------

/**
 * Download a single URL to a temp file with retry + exponential backoff.
 * If the input is already a local file, returns it as-is.
 */
async function downloadSingle(url: string, retries = 3): Promise<string> {
  const cleanUrl = ensureCleanUrl(url);

  if (isLocalPath(cleanUrl) && fs.existsSync(cleanUrl)) return cleanUrl;

  const urlObj = new URL(cleanUrl);
  const ext = path.extname(urlObj.pathname) || ".m4a";
  const tempPath = makeTempPath("chunk", ext);

  // If URL belongs to S3/CloudFront, we use S3 direct download to bypass CDN 403 Forbidden
  const isS3Url =
    cleanUrl.includes("amazonaws.com") || cleanUrl.includes("cloudfront.net");

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      let data: Buffer;

      if (isS3Url) {
        const S3Util = (await import("./s3.util")).default;
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
        `[AudioUtils] Download attempt ${attempt}/${retries} failed for ${cleanUrl}: ${err.message}`,
      );
      if (attempt === retries) throw err;
      await sleep(1000 * attempt); // 1s, 2s, 3s backoff
    }
  }

  throw new Error(`Failed to download after ${retries} attempts: ${cleanUrl}`);
}

/**
 * Downloads an array of URLs to local temp files with concurrency limiting.
 * @param skipFailures If true, failed downloads are logged but skipped (returns null).
 */
async function downloadToTemp(
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
            `[AudioUtils] Skipping failed chunk ${i}: ${err.message}`,
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

  const downloaded = results.filter(Boolean).length;
  const skipped = results.length - downloaded;
  logger.info(
    `[AudioUtils] Downloaded ${downloaded}/${urls.length} chunks to local temp (skipped=${skipped}, concurrency=${concurrency})`,
  );
  return results;
}

// ---------------------------------------------------------------------------
// Core merge functions
// ---------------------------------------------------------------------------

/**
 * Overlays multiple audio files into a single file.
 * Uses WAV intermediate format to avoid re-encoding artifacts.
 *
 * @param inputFiles Array of paths or URLs.
 * @param startTimeOffsets Optional per-file delay offsets in seconds.
 * @param outputFormat "wav" for intermediate sub-mixes, "mp3" for final.
 * @param skipFailures If true, failed chunk downloads are skipped gracefully.
 */
export const overlayAudioFiles = async (
  inputFiles: string[],
  startTimeOffsets?: number[],
  outputFormat: "wav" | "mp3" = "wav",
  skipFailures = false,
): Promise<Buffer> => {
  if (inputFiles.length === 0) {
    throw new Error("No input files provided");
  }

  const allPaths = await downloadToTemp(inputFiles, 5, skipFailures);

  // Filter out failed downloads
  const localPaths: string[] = [];
  const validOffsets: number[] = [];
  allPaths.forEach((p, i) => {
    if (p) {
      localPaths.push(p);
      validOffsets.push(startTimeOffsets?.[i] || 0);
    }
  });

  if (localPaths.length === 0) {
    throw new Error("All input file downloads failed");
  }

  const ext = outputFormat === "wav" ? ".wav" : ".mp3";
  const outputPath = makeTempPath("overlay", ext);

  try {
    await new Promise<void>((resolve, reject) => {
      const command = ffmpeg();

      localPaths.forEach((file) => command.input(file));

      if (localPaths.length > 1) {
        const filterChain: any[] = [];
        const mixInputs: string[] = [];

        localPaths.forEach((_, index) => {
          const delayMs = Math.round((validOffsets[index] || 0) * 1000);
          const outputLabel = `a${index}`;

          if (delayMs > 0) {
            filterChain.push({
              filter: "adelay",
              options: `${delayMs}|${delayMs}`,
              inputs: `${index}:a`,
              outputs: outputLabel,
            });
            mixInputs.push(outputLabel);
          } else {
            mixInputs.push(`${index}:a`);
          }
        });

        filterChain.push({
          filter: "amix",
          options: {
            inputs: mixInputs.length,
            duration: "longest",
            normalize: 0,
          },
          inputs: mixInputs,
        });

        command.complexFilter(filterChain);
      } else if (validOffsets[0]) {
        const delayMs = Math.round(validOffsets[0] * 1000);
        command.complexFilter([
          {
            filter: "adelay",
            options: `${delayMs}|${delayMs}`,
            inputs: "0:a",
          },
        ]);
      }

      command
        .on("start", (cmd) => logger.info(`[FFmpeg] Overlay: ${cmd}`))
        .on("error", (err) => {
          logger.error("[FFmpeg] Overlay error:", err);
          reject(err);
        })
        .on("end", () => {
          logger.info("[FFmpeg] Overlay complete");
          resolve();
        })
        .format(outputFormat)
        .save(outputPath);
    });

    return readAndCleanup(outputPath);
  } finally {
    cleanupTempFiles(localPaths);
  }
};

/**
 * Concatenates multiple audio files sequentially.
 * Resamples all inputs to 44100Hz to prevent sample rate mismatch glitches.
 *
 * @param inputFiles Array of paths or URLs.
 * @param initialOffset Delay (seconds) before the first file.
 * @param outputFormat "wav" for intermediate, "mp3" for final.
 */
export const concatenateAudioFiles = async (
  inputFiles: string[],
  initialOffset?: number,
  outputFormat: "wav" | "mp3" = "wav",
): Promise<Buffer> => {
  if (inputFiles.length === 0) {
    throw new Error("No input files provided");
  }

  const allPaths = await downloadToTemp(inputFiles);
  const localPaths = allPaths.filter(Boolean) as string[];

  if (localPaths.length === 0) {
    throw new Error("All input file downloads failed");
  }

  const ext = outputFormat === "wav" ? ".wav" : ".mp3";
  const outputPath = makeTempPath("concat", ext);

  try {
    await new Promise<void>((resolve, reject) => {
      const command = ffmpeg();

      localPaths.forEach((file) => command.input(file));

      const filterChain: any[] = [];
      const concatInputs: string[] = [];

      // Resample every input to 44100Hz to avoid chipmunk/glitch audio
      localPaths.forEach((_, index) => {
        const resampledLabel = `rs${index}`;
        filterChain.push({
          filter: "aresample",
          options: "44100",
          inputs: `${index}:a`,
          outputs: resampledLabel,
        });

        if (index === 0 && initialOffset) {
          const delayMs = Math.round(initialOffset * 1000);
          if (delayMs > 0) {
            const delayedLabel = `delayed0`;
            filterChain.push({
              filter: "adelay",
              options: `${delayMs}|${delayMs}`,
              inputs: resampledLabel,
              outputs: delayedLabel,
            });
            concatInputs.push(delayedLabel);
            return;
          }
        }

        concatInputs.push(resampledLabel);
      });

      filterChain.push({
        filter: "concat",
        options: { n: localPaths.length, v: 0, a: 1 },
        inputs: concatInputs,
      });

      command.complexFilter(filterChain);

      command
        .on("start", (cmd) => logger.info(`[FFmpeg] Concat: ${cmd}`))
        .on("error", (err) => {
          logger.error("[FFmpeg] Concat error:", err);
          reject(err);
        })
        .on("end", () => {
          logger.info("[FFmpeg] Concat complete");
          resolve();
        })
        .format(outputFormat)
        .save(outputPath);
    });

    return readAndCleanup(outputPath);
  } finally {
    cleanupTempFiles(localPaths);
  }
};

// ---------------------------------------------------------------------------
// Batch sub-mixing
// ---------------------------------------------------------------------------

/**
 * Overlays a large number of audio files by splitting into batches.
 * Each batch is merged into a WAV sub-mix, then sub-mixes are merged into the
 * final output. This keeps each FFmpeg command small (≤ batchSize inputs).
 *
 * @param inputFiles Array of paths or URLs.
 * @param startTimeOffsets Per-file delay offsets in seconds.
 * @param batchSize Number of files per batch (default 10).
 * @param batchConcurrency How many batches to process in parallel (default 3).
 */
export const batchOverlayAudioFiles = async (
  inputFiles: string[],
  startTimeOffsets?: number[],
  batchSize = 100,
  batchConcurrency = 3,
): Promise<Buffer> => {
  if (inputFiles.length <= batchSize) {
    // Small enough — no batching needed
    return overlayAudioFiles(inputFiles, startTimeOffsets, "wav", true);
  }

  logger.info(
    `[AudioUtils] Batch sub-mixing: ${inputFiles.length} files in batches of ${batchSize}`,
  );

  // Split into batches
  const batches: { files: string[]; offsets: number[] }[] = [];
  for (let i = 0; i < inputFiles.length; i += batchSize) {
    batches.push({
      files: inputFiles.slice(i, i + batchSize),
      offsets: startTimeOffsets?.slice(i, i + batchSize) || [],
    });
  }

  // Process batches with concurrency limit
  const subMixPaths: string[] = [];
  let batchNextIndex = 0;

  const batchWorker = async () => {
    while (batchNextIndex < batches.length) {
      const bi = batchNextIndex++;
      const batch = batches[bi];
      logger.info(
        `[AudioUtils] Processing sub-mix batch ${bi + 1}/${batches.length} (${batch.files.length} files)`,
      );

      // Sub-mixes output WAV (lossless intermediate)
      const subMixBuffer = await overlayAudioFiles(
        batch.files,
        batch.offsets,
        "wav",
        true, // skip failures
      );

      // Write sub-mix to temp file
      const subMixPath = makeTempPath(`submix_${bi}`, ".wav");
      fs.writeFileSync(subMixPath, new Uint8Array(subMixBuffer));
      subMixPaths[bi] = subMixPath;
    }
  };

  const workers = Array.from(
    { length: Math.min(batchConcurrency, batches.length) },
    () => batchWorker(),
  );
  await Promise.all(workers);

  logger.info(
    `[AudioUtils] All ${subMixPaths.length} sub-mixes complete. Doing final merge...`,
  );

  // Final merge of sub-mixes (still WAV — MP3 encoding happens in mixVocalsWithBacking)
  try {
    return await overlayAudioFiles(subMixPaths, undefined, "wav");
  } finally {
    cleanupTempFiles(subMixPaths);
  }
};

// ---------------------------------------------------------------------------
// Mix vocals with backing track + loudness normalization
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Voice Effects
// ---------------------------------------------------------------------------

export type VoiceEffect =
  | "CLEAN"
  | "STUDIO"
  | "KTV"
  | "CONCERT"
  | "RADIO"
  | "CHIPMUNK";

function getVocalFilterChain(effect: VoiceEffect = "STUDIO"): any[] {
  const chain: any[] = [];

  // 1. Basic cleanup for all presets (Highpass)
  chain.push({
    filter: "highpass",
    options: { f: 80 },
    inputs: "1:a",
    outputs: "v_clean",
  });

  const lastOutput = "v_clean";

  // 2. Normalize levels BEFORE effects (Auto-Leveling)
  // This ensures quiet mics are boosted and loud mics are tamed
  chain.push({
    filter: "dynaudnorm",
    options: { f: 50, g: 31, p: 0.95, m: 10.0, r: 0.9, s: 0 },
    inputs: "v_clean",
    outputs: "v_norm",
  });

  const effectInput = "v_norm";

  // 3. Effect-specific processing
  switch (effect) {
    case "CLEAN":
      // Minimal processing: just light compression
      chain.push({
        filter: "acompressor",
        options: { threshold: 0.1, ratio: 2, attack: 20, release: 100 },
        inputs: effectInput,
        outputs: "v_processed",
      });
      break;

    case "STUDIO":
      // Standard polished sound: Compression + Slight Echo
      // (Volume boost removed in favor of dynaudnorm)
      chain.push(
        {
          filter: "acompressor",
          options: { threshold: 0.25, ratio: 4, attack: 50, release: 100 },
          inputs: effectInput,
          outputs: "v_comp",
        },
        {
          filter: "aecho",
          options: { in_gain: 0.8, out_gain: 0.88, delays: 60, decays: 0.4 },
          inputs: "v_comp",
          outputs: "v_processed",
        },
      );
      break;

    case "KTV":
      // Karaoke: Heavier Reverb/Echo
      chain.push(
        {
          filter: "acompressor",
          options: { threshold: 0.25, ratio: 4, attack: 50, release: 100 },
          inputs: effectInput,
          outputs: "v_comp",
        },
        {
          filter: "aecho",
          options: { in_gain: 0.6, out_gain: 0.3, delays: 250, decays: 0.4 },
          inputs: "v_comp",
          outputs: "v_processed",
        },
      );
      break;

    case "CONCERT":
      // Large Hall Reverb
      chain.push(
        {
          filter: "acompressor",
          options: { threshold: 0.25, ratio: 4 },
          inputs: effectInput,
          outputs: "v_comp",
        },
        {
          filter: "aecho",
          options: { in_gain: 0.6, out_gain: 0.4, delays: 500, decays: 0.5 },
          inputs: "v_comp",
          outputs: "v_processed",
        },
      );
      break;

    case "RADIO":
      // AM Radio: Bandpass + Distortion (using acrusher or distortion if available, here simple EQ+Comp)
      chain.push(
        {
          filter: "highpass",
          options: { f: 500 },
          inputs: effectInput,
          outputs: "v_hp",
        },
        {
          filter: "lowpass",
          options: { f: 3500 },
          inputs: "v_hp",
          outputs: "v_lp",
        },
        {
          filter: "acompressor", // Heavy compression
          options: { threshold: 0.05, ratio: 20, attack: 5, release: 50 },
          inputs: "v_lp",
          outputs: "v_processed",
        },
      );
      break;

    case "CHIPMUNK":
      // Pitch shift up
      chain.push(
        {
          filter: "asetrate",
          options: 44100 * 1.5, // 1.5x pitch
          inputs: effectInput,
          outputs: "v_pitched",
        },
        {
          filter: "atempo",
          options: 1 / 1.5, // Fix speed to match original duration
          inputs: "v_pitched",
          outputs: "v_processed",
        },
      );
      break;

    default:
      // Fallback to Studio
      return getVocalFilterChain("STUDIO");
  }

  return chain;
}

/**
 * Mixes a vocal buffer with a backing track.
 * Applies EBU R128 loudness normalization and injects ID3 metadata.
 * Returns the path to the final MP3 file instead of a Buffer to enable streaming.
 *
 * @param vocalsBuffer Buffer containing the vocal track (WAV preferred).
 * @param backingTrackUrl URL or path to the backing track audio.
 * @param options Metadata options (title, artist, maxDuration, effect).
 * @returns Path to the final MP3 file.
 */
export const mixVocalsWithBacking = async (
  vocalsBuffer: Buffer,
  backingTrackUrl: string,
  options: {
    maxDuration?: number;
    voiceEffect?: VoiceEffect;
    title?: string;
    artist?: string;
  } = {},
): Promise<string> => {
  const {
    maxDuration,
    voiceEffect = "STUDIO",
    title = "My Cover",
    artist = "Chumme User",
  } = options;
  const tempVocalsPath = makeTempPath("vocals", ".wav");
  const outputPath = makeTempPath("mixed", ".mp3");

  fs.writeFileSync(tempVocalsPath, new Uint8Array(vocalsBuffer));

  // Download backing track to temp file to avoid FFmpeg 403 errors with remote URLs
  let localBackingPath: string | null = null;

  try {
    localBackingPath = await downloadSingle(backingTrackUrl);

    await new Promise<void>((resolve, reject) => {
      const command = ffmpeg();
      command.input(localBackingPath!);
      command.input(tempVocalsPath);

      // Get effect chain
      const vocalChain = getVocalFilterChain(voiceEffect);

      const filterChain: any[] = [
        ...vocalChain,

        // Process Backing Track (Input 0) -> Lower volume slightly
        {
          filter: "volume",
          options: { volume: 0.5 },
          inputs: "0:a",
          outputs: "b_processed",
        },

        // Mix
        {
          filter: "amix",
          options: { inputs: 2, duration: "shortest" },
          inputs: ["b_processed", "v_processed"],
          outputs: "mixed",
        },

        // Final Mastering (Loudness Normalization)
        {
          filter: "loudnorm",
          options: { I: -11, TP: -1, LRA: 11 },
          inputs: "mixed",
          outputs: "mastered",
        },
      ];

      let finalOutput = "mastered";

      // Trim to duration if specified
      if (maxDuration && maxDuration > 0) {
        finalOutput = "trimmed";
        filterChain.push({
          filter: "atrim",
          options: { duration: maxDuration },
          inputs: "mastered",
          outputs: finalOutput,
        });
      }

      command.complexFilter(filterChain);
      command.map(finalOutput);

      // 5. Inject Metadata
      command.outputOptions("-metadata", `title="${title}"`);
      command.outputOptions("-metadata", `artist="${artist}"`);
      command.outputOptions("-metadata", 'comment="Powered by Chumme AI"');

      command
        .on("start", (cmd) =>
          logger.info(`[FFmpeg] Mix+Loudnorm (${voiceEffect}): ${cmd}`),
        )
        .on("error", (err) => {
          logger.error("[FFmpeg] Mix error:", err);
          reject(err);
        })
        .on("end", () => resolve())
        .format("mp3")
        .save(outputPath);
    });

    // DO NOT Read and Cleanup yet. Return the path so worker can stream it.
    cleanupTempFiles([tempVocalsPath]);
    if (localBackingPath && !isLocalPath(backingTrackUrl)) {
      cleanupTempFiles([localBackingPath]);
    }
    return outputPath;
  } catch (err) {
    // Cleanup if something failed
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    throw err;
  }
};

// ---------------------------------------------------------------------------
// Vocal removal (stereotools — better than pan trick)
// ---------------------------------------------------------------------------

/**
 * Removes vocals using FFmpeg's stereotools filter.
 * Mutes the mid (center) channel where vocals typically sit while
 * preserving stereo side signal for a fuller instrumental sound.
 */
export const removeVocals = (inputUrl: string): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    let errorOccurred = false;
    const command = ffmpeg(inputUrl);

    command.complexFilter([
      {
        filter: "stereotools",
        options: "mlev=0.0:slev=1.0",
        inputs: "0:a",
        outputs: "instrumental",
      },
      {
        filter: "dynaudnorm",
        inputs: "instrumental",
      },
    ]);

    const passThrough = new PassThrough();
    const chunks: Buffer[] = [];

    passThrough.on("data", (chunk) => chunks.push(chunk));

    passThrough.on("end", () => {
      if (errorOccurred) return;
      const buffer = Buffer.concat(chunks as Uint8Array[]);
      if (buffer.length === 0) {
        return reject(new Error("Vocal removal produced empty output"));
      }
      resolve(buffer);
    });

    passThrough.on("error", (err) => {
      errorOccurred = true;
      logger.error("Error in output stream:", err);
      reject(err);
    });

    command
      .on("error", (err) => {
        errorOccurred = true;
        logger.error("An error occurred during vocal removal:", err);
        reject(err);
      })
      .format("mp3")
      .pipe(passThrough, { end: true });
  });
};
