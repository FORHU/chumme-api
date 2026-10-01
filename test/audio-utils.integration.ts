import { expect } from "chai";
import { describe, it } from "mocha";
import { mixVocalsWithBacking } from "../src/utils/audio.utils";
import logger from "../src/utils/logger";
import fs from "fs";
import { overlayAudioFiles } from "../src/utils/audio.utils";

// Real remote audio files for testing (Crowdsinging simulation)
const VOCALS = [
  "https://d1lq91nbxprxl1.cloudfront.net/uploads/1772503334142-c7f9b7d15dc1c695.mp3",
  "https://d1lq91nbxprxl1.cloudfront.net/uploads/1772438793646-53cdd8541c12f668.mp3",
  "https://d1lq91nbxprxl1.cloudfront.net/uploads/1772438247934-c1bfe480b6be6f10.mp3",
  "https://d1lq91nbxprxl1.cloudfront.net/uploads/1772173170538-0d574005d0be05c2.mp3",
];
const BACKING_TRACK =
  "https://d1lq91nbxprxl1.cloudfront.net/uploads/1771475412374-410bd4cc27f3cbfe.mp3";

describe("Audio Mix Test", function () {
  this.timeout(120000); // 2 mins for multiple downloads + mixing

  it("should mix MULTIPLE vocals + backing track (Crowdsinging Simulator)", async () => {
    // 1. Download all vocal files
    logger.info(`📥 Downloading ${VOCALS.length} vocalists...`);

    // We pass the URLs directly to overlayAudioFiles or concatenateAudioFiles
    // But since they are remote, our audio.utils handles the downloading usually.
    // However, mixVocalsWithBacking expects a BUFFER for the vocals.

    // So for multiple users, we first OVERLAY them into one buffer:

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
