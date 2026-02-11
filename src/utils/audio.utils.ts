import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import ffprobePath from "ffprobe-static";
import path from "path";
import fs from "fs";

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
 * @returns Promise that resolves with the concatenated audio buffer.
 */
export const concatenateAudioFiles = (
  inputFiles: string[],
): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    if (inputFiles.length === 0) {
      return reject(new Error("No input files provided"));
    }

    // If only one file, just return it as a buffer
    if (inputFiles.length === 1) {
      return overlayAudioFiles(inputFiles).then(resolve).catch(reject);
    }

    const command = ffmpeg();

    // Add all inputs
    inputFiles.forEach((file) => {
      command.input(file);
    });

    // Use concat filter: n=number of inputs, v=video (0), a=audio (1)
    command.complexFilter([
      {
        filter: "concat",
        options: {
          n: inputFiles.length,
          v: 0,
          a: 1,
        },
      },
    ]);

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
