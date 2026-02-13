import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import ffprobePath from "ffprobe-static";
import path from "path";
import fs from "fs";
import os from "os";

// Set the ffmpeg and ffprobe paths
if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath);
if (ffprobePath.path) ffmpeg.setFfprobePath(ffprobePath.path);

/**
 * Overlays multiple audio files into a single file.
 * @param inputFiles Array of paths or URLs to the input audio files.
 * @param outputPath Path where the merged file should be saved.
 * @returns Promise that resolves when the merging is complete.
 */
import { PassThrough } from "stream";

/**
 * Overlays multiple audio files into a single buffer.
 * @param inputFiles Array of paths or URLs to the input audio files.
 * @returns Promise that resolves with the merged audio buffer.
 */
export const overlayAudioFiles = (
  inputFiles: string[],
  startTimeOffsets?: number[],
): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    if (inputFiles.length === 0) {
      return reject(new Error("No input files provided"));
    }

    const command = ffmpeg();

    // Add all inputs
    inputFiles.forEach((file) => {
      command.input(file);
    });

    // If more than one file, use complex filter for delays and mixing
    if (inputFiles.length > 1) {
      const filterChain: any[] = [];
      const mixInputs: string[] = [];

      inputFiles.forEach((_, index) => {
        const offset = startTimeOffsets?.[index] || 0;
        const delayMs = Math.round(offset * 1000);
        const outputLabel = `a${index}`;

        if (delayMs > 0) {
          // adelay=delay_ms|delay_ms (for stereo)
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

      // Mix all processed streams
      filterChain.push({
        filter: "amix",
        options: {
          inputs: mixInputs.length,
          duration: "longest",
        },
        inputs: mixInputs,
      });

      command.complexFilter(filterChain);
    } else if (startTimeOffsets?.[0]) {
      // Single file with offset
      const delayMs = Math.round(startTimeOffsets[0] * 1000);
      command.complexFilter([
        {
          filter: "adelay",
          options: `${delayMs}|${delayMs}`,
          inputs: "0:a",
        },
      ]);
    }

    // Create a PassThrough stream to capture the output
    const passThrough = new PassThrough();
    const chunks: Buffer[] = [];

    passThrough.on("data", (chunk) => {
      chunks.push(chunk);
    });

    passThrough.on("end", () => {
      const buffer = Buffer.concat(chunks as Uint8Array[]);
      console.log("Audio overlay finished successfully");
      resolve(buffer);
    });

    passThrough.on("error", (err) => {
      console.error("Error in output stream:", err);
      reject(err);
    });

    command
      .on("error", (err) => {
        console.error("An error occurred during audio overlay:", err);
        reject(err);
      })
      .format("mp3") // Explicitly set format since we are outputting to stream
      .pipe(passThrough, { end: true });
  });
};

/**
 * Concatenates multiple audio files into a single sequential buffer.
 * @param inputFiles Array of paths or URLs to the input audio files.
 * @param initialOffset Optional delay (in seconds) to apply before the first file.
 * @returns Promise that resolves with the concatenated audio buffer.
 */
export const concatenateAudioFiles = (
  inputFiles: string[],
  initialOffset?: number,
): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    if (inputFiles.length === 0) {
      return reject(new Error("No input files provided"));
    }

    const command = ffmpeg();

    // Add all inputs
    inputFiles.forEach((file) => {
      command.input(file);
    });

    // We use a complex filter to handle potential initial offset
    const filterChain: any[] = [];
    const inputs: string[] = [];

    // 1. Process the first input with adelay if offset exists
    const delayMs = Math.round((initialOffset || 0) * 1000);
    if (delayMs > 0) {
      filterChain.push({
        filter: "adelay",
        options: `${delayMs}|${delayMs}`,
        inputs: "0:a",
        outputs: "delayed0",
      });
      inputs.push("delayed0");
    } else {
      inputs.push("0:a");
    }

    // 2. Add remaining inputs
    for (let i = 1; i < inputFiles.length; i++) {
      inputs.push(`${i}:a`);
    }

    // 3. Concat all
    filterChain.push({
      filter: "concat",
      options: {
        n: inputFiles.length,
        v: 0,
        a: 1,
      },
      inputs: inputs,
    });

    command.complexFilter(filterChain);

    const passThrough = new PassThrough();
    const chunks: Buffer[] = [];

    passThrough.on("data", (chunk) => {
      chunks.push(chunk);
    });

    passThrough.on("end", () => {
      const buffer = Buffer.concat(chunks as Uint8Array[]);
      console.log("Audio concatenation finished successfully");
      resolve(buffer);
    });

    passThrough.on("error", (err) => {
      console.error("Error in output stream:", err);
      reject(err);
    });

    command
      .on("error", (err) => {
        console.error("An error occurred during audio concatenation:", err);
        reject(err);
      })
      .format("mp3")
      .pipe(passThrough, { end: true });
  });
};

/**
 * Mixes a vocal buffer with a backing track (URL or path).
 * @param vocalsBuffer Buffer containing the vocal track.
 * @param backingTrackUrl URL or path to the backing track audio.
 * @returns Promise that resolves with the mixed audio buffer.
 */
export const mixVocalsWithBacking = (
  vocalsBuffer: Buffer,
  backingTrackUrl: string,
): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const tempVocalsPath = path.join(
      os.tmpdir(),
      `vocals_${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`,
    );

    fs.writeFileSync(tempVocalsPath, new Uint8Array(vocalsBuffer));

    const command = ffmpeg();
    command.input(backingTrackUrl);
    command.input(tempVocalsPath);

    /**
     * Balanced Mix:
     * Combines vocals and backing track with default amix behavior.
     */
    command.complexFilter([
      {
        filter: "amix",
        options: { inputs: 2, duration: "first" },
        inputs: ["0:a", "1:a"],
      },
    ]);

    const passThrough = new PassThrough();
    const chunks: Buffer[] = [];

    passThrough.on("data", (chunk) => {
      chunks.push(chunk);
    });

    passThrough.on("end", () => {
      const buffer = Buffer.concat(chunks as Uint8Array[]);
      try {
        fs.unlinkSync(tempVocalsPath);
      } catch (err) {
        console.warn("Failed to delete temp vocals file:", err);
      }
      resolve(buffer);
    });

    passThrough.on("error", (err) => {
      console.error("Error in output stream:", err);
      try {
        fs.unlinkSync(tempVocalsPath);
      } catch (e) {}
      reject(err);
    });

    command
      .on("error", (err) => {
        console.error("An error occurred during audio mixing:", err);
        try {
          fs.unlinkSync(tempVocalsPath);
        } catch (e) {}
        reject(err);
      })
      .format("mp3")
      .pipe(passThrough, { end: true });
  });
};

/**
 * Removes vocals from an audio track using center-channel cancellation.
 * This is a fallback and does not produce perfect instrumental quality.
 * @param inputUrl URL or path to the input audio file.
 * @returns Promise that resolves with the processed audio buffer.
 */
export const removeVocals = (inputUrl: string): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    let errorOccurred = false;
    const command = ffmpeg(inputUrl);

    /**
     * Vocal Removal Filter:
     * pan=stereo|c0=c0-c1|c1=c1-c0
     * This subtracts the right channel from the left and vice versa.
     * Since vocals are usually panned to center (identical in L/R), they cancel out.
     */
    command.complexFilter([
      {
        filter: "pan",
        options: "stereo|c0=c0-c1|c1=c1-c0",
        inputs: "0:a",
        outputs: "panned",
      },
      {
        filter: "dynaudnorm",
        inputs: "panned",
      },
    ]);

    const passThrough = new PassThrough();
    const chunks: Buffer[] = [];

    passThrough.on("data", (chunk) => {
      chunks.push(chunk);
    });

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
      console.error("Error in output stream:", err);
      reject(err);
    });

    command
      .on("error", (err) => {
        errorOccurred = true;
        console.error("An error occurred during vocal removal:", err);
        reject(err);
      })
      .format("mp3")
      .pipe(passThrough, { end: true });
  });
};
