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

/** A single FFmpeg filter in a vocal chain, before input/output labels are threaded on. */
type VocalFilter = { filter: string; options?: Record<string, unknown> };

/**
 * What each voice effect actually does to the vocal track before it meets the
 * backing track.
 *
 * The vocals arrive dry, so every preset starts by clearing rumble below the
 * voice and ends leaving enough headroom for the mix bus limiter. `mixWeights`
 * is the `amix` balance as "vocals backing" — wetter, more reverberant presets
 * carry a little more level because the reverb tail spreads their energy out.
 *
 * Kept as data rather than branches so adding an effect is one entry here and
 * one pill in the client's VoiceEffectSelector.
 */
const VOICE_EFFECT_PRESETS: Record<
  VoiceEffect,
  { filters: VocalFilter[]; mixWeights: string }
> = {
  /** Straight through: rumble filter and gentle levelling, no colour. */
  CLEAN: {
    filters: [
      { filter: "highpass", options: { f: 80 } },
      {
        filter: "acompressor",
        options: { threshold: 0.2, ratio: 2, attack: 20, release: 250, makeup: 2 },
      },
      { filter: "volume", options: { volume: 1.3 } },
    ],
    mixWeights: "3 1",
  },

  /** Polished pop vocal: low-mid warmth, firm compression, a hint of room. */
  STUDIO: {
    filters: [
      { filter: "highpass", options: { f: 80 } },
      { filter: "equalizer", options: { f: 150, width_type: "h", width: 100, g: 4 } },
      { filter: "equalizer", options: { f: 6000, width_type: "h", width: 2000, g: 2 } },
      {
        filter: "acompressor",
        options: { threshold: 0.125, ratio: 3, attack: 15, release: 200, makeup: 3 },
      },
      // Very short single tap — reads as a tight vocal booth, not an effect.
      { filter: "aecho", options: { in_gain: 0.8, out_gain: 0.9, delays: "40", decays: "0.25" } },
      { filter: "volume", options: { volume: 1.4 } },
    ],
    mixWeights: "3 1",
  },

  /** Karaoke box: the classic heavy, obvious sing-along reverb. */
  KTV: {
    filters: [
      { filter: "highpass", options: { f: 90 } },
      { filter: "equalizer", options: { f: 200, width_type: "h", width: 120, g: 3 } },
      {
        filter: "acompressor",
        options: { threshold: 0.1, ratio: 4, attack: 10, release: 250, makeup: 4 },
      },
      // Multi-tap: the closely spaced repeats smear into reverb rather than
      // reading as distinct echoes.
      {
        filter: "aecho",
        options: {
          in_gain: 0.8,
          out_gain: 0.85,
          delays: "60|120|200",
          decays: "0.45|0.3|0.2",
        },
      },
      { filter: "volume", options: { volume: 1.45 } },
    ],
    mixWeights: "7 2",
  },

  /** Big hall: long, wide tail with the pre-delay a real room would have. */
  CONCERT: {
    filters: [
      { filter: "highpass", options: { f: 90 } },
      { filter: "equalizer", options: { f: 3000, width_type: "h", width: 1500, g: 2 } },
      {
        filter: "acompressor",
        options: { threshold: 0.125, ratio: 3.5, attack: 12, release: 300, makeup: 3 },
      },
      {
        filter: "aecho",
        options: {
          in_gain: 0.8,
          out_gain: 0.8,
          delays: "150|300|500|700",
          decays: "0.5|0.35|0.25|0.15",
        },
      },
      { filter: "volume", options: { volume: 1.5 } },
    ],
    mixWeights: "7 2",
  },

  /** AM broadcast: band-limited and squashed flat, the telephone/radio voice. */
  RADIO: {
    filters: [
      { filter: "highpass", options: { f: 300 } },
      { filter: "lowpass", options: { f: 3400 } },
      { filter: "equalizer", options: { f: 1500, width_type: "h", width: 800, g: 5 } },
      {
        filter: "acompressor",
        options: { threshold: 0.05, ratio: 8, attack: 5, release: 120, makeup: 6 },
      },
      { filter: "volume", options: { volume: 1.5 } },
    ],
    mixWeights: "3 1",
  },

  /**
   * Pitched up without getting shorter. `asetrate` speeds the vocal up (which
   * raises pitch), and `atempo` slows it back down by the reciprocal so the take
   * still lines up with the backing track. The leading `aresample` pins the rate
   * `asetrate` is multiplying, since the recorder's output rate varies by device.
   */
  CHIPMUNK: {
    filters: [
      { filter: "highpass", options: { f: 80 } },
      { filter: "aresample", options: { osr: 44100 } },
      { filter: "asetrate", options: { r: Math.round(44100 * 1.35) } },
      { filter: "aresample", options: { osr: 44100 } },
      { filter: "atempo", options: { tempo: Number((1 / 1.35).toFixed(6)) } },
      {
        filter: "acompressor",
        options: { threshold: 0.15, ratio: 3, attack: 10, release: 200, makeup: 3 },
      },
      { filter: "volume", options: { volume: 1.35 } },
    ],
    mixWeights: "3 1",
  },
};

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

  localBackingPath = await downloadSingle(backingTrackUrl);

  await new Promise<void>((resolve, reject) => {
    const command = ffmpeg();
    command.input(localBackingPath!);
    command.input(tempVocalsPath);

    // Build the vocal chain for the selected effect, threading each filter's
    // output into the next one's input (v_0 -> v_1 -> ...). An unknown effect
    // falls back to STUDIO rather than dropping the chain, so a client sending a
    // preset this build doesn't know still gets a mixed, processed vocal.
    const preset =
      VOICE_EFFECT_PRESETS[voiceEffect] ?? VOICE_EFFECT_PRESETS.STUDIO;

    const filterChain: any[] = [];
    let vocalLabel = "1:a";

    preset.filters.forEach((step, index) => {
      const outputs = `v_${index}`;
      filterChain.push({
        filter: step.filter,
        options: step.options,
        inputs: vocalLabel,
        outputs,
      });
      vocalLabel = outputs;
    });

    filterChain.push(
      {
        filter: "amix",
        options: {
          inputs: 2,
          weights: preset.mixWeights,
          duration: "shortest",
        },
        inputs: [vocalLabel, "0:a"],
        outputs: "mixed",
      },
      {
        filter: "alimiter",
        options: { limit: 0.95 },
        inputs: "mixed",
        outputs: "final",
      },
    );

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
