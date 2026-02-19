import fs from "fs";
import logger from "./logger";
import { PassThrough } from "stream";
import {
  ffmpeg,
  makeTempPath,
  readAndCleanup,
  cleanupTempFiles,
  downloadToTemp,
  downloadSingle,
  isLocalPath,
} from "./media.utils";

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
        .audioBitrate("320k")
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
          options: { threshold: 0.3, ratio: 3, attack: 50, release: 100 },
          inputs: effectInput,
          outputs: "v_comp",
        },
        {
          filter: "aecho",
          options: { in_gain: 0.6, out_gain: 0.3, delays: 250, decays: 0.3 },
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

      // No filters — simple direct mix of backing track + raw vocals
      // const filterChain: any[] = [
      //   // Boost vocals so they sit above the backing track
      /**
       * 1.0 = original volume (no boost)
       * 1.5 = 50% louder
       * 1.8 = 80% louder ← current
       * 2.0 = double volume
       */
      //   {
      //     filter: "volume",
      //     options: { volume: 1.8 },
      //     inputs: "1:a",
      //     outputs: "v_loud",
      //   },
      /**
       * inputs: 2 = mix 2 streams
       * duration: "shortest" = mix until the shorter stream ends
       */
      //   {
      //     filter: "amix",
      //     options: { inputs: 2, duration: "shortest" },
      //     inputs: ["0:a", "v_loud"],
      //     outputs: "mixed",
      //   },
      // ];

      const filterChain: any[] = [
        {
          filter: "highpass",
          options: { f: 80 },
          inputs: "1:a",
          outputs: "v_hp",
        },
        // Bass boost — adds warmth to vocals
        {
          filter: "equalizer",
          options: { f: 150, width_type: "h", width: 100, g: 4 },
          inputs: "v_hp",
          outputs: "v_clean",
        },
        {
          filter: "acompressor",
          options: {
            threshold: 0.125,
            ratio: 3,
            attack: 15,
            release: 200,
            makeup: 3,
          },
          inputs: "v_clean",
          outputs: "v_comp",
        },
        {
          filter: "volume",
          options: { volume: 1.4 },
          inputs: "v_comp",
          outputs: "v_loud",
        },
        {
          filter: "amix",
          options: {
            inputs: 2,
            weights: "3 1",
            duration: "shortest",
          },
          inputs: ["v_loud", "0:a"],
          outputs: "mixed",
        },
        {
          filter: "alimiter",
          options: { limit: 0.95 },
          inputs: "mixed",
          outputs: "final",
        },
      ];

      let finalOutput = "final";

      // Trim to duration if specified
      if (maxDuration && maxDuration > 0) {
        finalOutput = "trimmed";
        filterChain.push({
          filter: "atrim",
          options: { duration: maxDuration },
          inputs: "final",
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
        .audioBitrate("320k")
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
