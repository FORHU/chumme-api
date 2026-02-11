import { expect } from "chai";
import { describe, it } from "mocha";
import {
  overlayAudioFiles,
  concatenateAudioFiles,
} from "../src/utils/audio.utils";
import fs from "fs";
import path from "path";

// Real remote files for deterministic integration-style unit testing
const FILE_1 =
  "https://d1lq91nbxprxl1.cloudfront.net/recordings/1770718991824-gu9lxxbu-recording-32594B62-17C4-4C3E-9174-C8C96820F542.m4a";
const FILE_2 =
  "https://d1lq91nbxprxl1.cloudfront.net/recordings/1770718423388-nrnmzkah-recording-91255E7E-28C1-4DFE-8D05-570C82101C4B.m4a";

describe("Audio Utils", function () {
  // Increase timeout for remote file fetching and processing
  this.timeout(30000);

  describe("concatenateAudioFiles", () => {
    it("should merge two audio files sequentially", async () => {
      const buffer = await concatenateAudioFiles([FILE_1, FILE_2]);

      expect(buffer).to.be.an.instanceOf(Buffer);
      expect(buffer.length).to.be.greaterThan(0);

      // Basic sanity check: output should be significant size
      // (Approx sum of parts, though transcoding affects this)
      expect(buffer.length).to.be.greaterThan(10000);
    });

    it("should throw error if no files provided", async () => {
      try {
        await concatenateAudioFiles([]);
        expect.fail("Should have thrown error");
      } catch (err: any) {
        expect(err.message).to.equal("No input files provided");
      }
    });
  });

  describe("overlayAudioFiles", () => {
    it("should mix audio files with startTimeOffsets (sync logic)", async () => {
      // 0s offset for first, 2s for second
      const buffer = await overlayAudioFiles([FILE_1, FILE_2], [0, 2]);

      expect(buffer).to.be.an.instanceOf(Buffer);
      expect(buffer.length).to.be.greaterThan(0);
    });

    it("should mix audio files without offsets", async () => {
      const buffer = await overlayAudioFiles([FILE_1, FILE_2]);
      expect(buffer).to.be.an.instanceOf(Buffer);
      expect(buffer.length).to.be.greaterThan(0);
    });

    it("should handle single file with offset", async () => {
      const buffer = await overlayAudioFiles([FILE_1], [3]);
      expect(buffer).to.be.an.instanceOf(Buffer);
      expect(buffer.length).to.be.greaterThan(0);
    });
  });
});
