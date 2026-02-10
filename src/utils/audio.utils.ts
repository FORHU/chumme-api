import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import ffprobePath from 'ffprobe-static';
import path from 'path';
import fs from 'fs';

// Set the ffmpeg and ffprobe paths
if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath);
if (ffprobePath.path) ffmpeg.setFfprobePath(ffprobePath.path);

/**
 * Overlays multiple audio files into a single file.
 * @param inputFiles Array of paths or URLs to the input audio files.
 * @param outputPath Path where the merged file should be saved.
 * @returns Promise that resolves when the merging is complete.
 */
import { PassThrough } from 'stream';

/**
 * Overlays multiple audio files into a single buffer.
 * @param inputFiles Array of paths or URLs to the input audio files.
 * @returns Promise that resolves with the merged audio buffer.
 */
export const overlayAudioFiles = (inputFiles: string[]): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    if (inputFiles.length === 0) {
      return reject(new Error('No input files provided'));
    }

    const command = ffmpeg();

    // Add all inputs
    inputFiles.forEach((file) => {
      command.input(file);
    });

    // If more than one file, use amix filter
    if (inputFiles.length > 1) {
      command.complexFilter([
        {
          filter: 'amix',
          options: {
            inputs: inputFiles.length,
            duration: 'longest'
          }
        }
      ]);
    }

    // Create a PassThrough stream to capture the output
    const passThrough = new PassThrough();
    const chunks: Buffer[] = [];

    passThrough.on('data', (chunk) => {
      chunks.push(chunk);
    });

    passThrough.on('end', () => {
      const buffer = Buffer.concat(chunks as Uint8Array[]);
      console.log('Audio overlay finished successfully');
      resolve(buffer);
    });

    passThrough.on('error', (err) => {
      console.error('Error in output stream:', err);
      reject(err);
    });

    command
      .on('error', (err) => {
        console.error('An error occurred during audio overlay:', err);
        reject(err);
      })
      .format('mp3') // Explicitly set format since we are outputting to stream
      .pipe(passThrough, { end: true });
  });
};
