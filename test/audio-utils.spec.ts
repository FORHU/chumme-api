import { expect } from "chai";
import { describe, it } from "mocha";
import { mixVocalsWithBacking } from "../src/utils/audio.utils";
import logger from "../src/utils/logger";
import fs from "fs";

// Real remote audio files for testing (Crowdsinging simulation)
const VOCALS = [
  "https://d1lq91nbxprxl1.cloudfront.net/recordings/1770718991824-gu9lxxbu-recording-32594B62-17C4-4C3E-9174-C8C96820F542.m4a",
  "https://d1lq91nbxprxl1.cloudfront.net/recordings/1770718991824-gu9lxxbu-recording-32594B62-17C4-4C3E-9174-C8C96820F542.m4a", // Reusing for demo
];
const BACKING_TRACK =
  "https://d1lq91nbxprxl1.cloudfront.net/recordings/1770718423388-nrnmzkah-recording-91255E7E-28C1-4DFE-8D05-570C82101C4B.m4a";

describe("Audio Mix Test", function () {
  this.timeout(120000); // 2 mins for multiple downloads + mixing

  it("should mix MULTIPLE vocals + backing track (Crowdsinging Simulator)", async () => {
    // 1. Download all vocal files
    const axios = require("axios");
    logger.info(`📥 Downloading ${VOCALS.length} vocalists...`);

    // We pass the URLs directly to overlayAudioFiles or concatenateAudioFiles
    // But since they are remote, our audio.utils handles the downloading usually.
    // However, mixVocalsWithBacking expects a BUFFER for the vocals.

    // So for multiple users, we first OVERLAY them into one buffer:
    const { overlayAudioFiles } = require("../src/utils/audio.utils");

    logger.info("🎤 Merging vocalists into a single crowd buffer...");
    const crowdBuffer = await overlayAudioFiles(VOCALS);

    // 2. Mix the crowd buffer with the backing track
    logger.info("🎚️ Mixing crowd with backing track...");
    const outputPath = await mixVocalsWithBacking(crowdBuffer, BACKING_TRACK, {
      title: "Crowd Mix",
      artist: "Chumme Choir",
      voiceEffect: "STUDIO",
    });

    // 3. Verify
    expect(outputPath).to.be.a("string");
    expect(fs.existsSync(outputPath)).to.be.true;

    const stats = fs.statSync(outputPath);
    logger.info(
      `🔥 FINISHED CROWD MIX: ${outputPath} (${(stats.size / 1024).toFixed(0)} KB)`,
    );
  });
});
