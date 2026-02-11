import { expect } from "chai";
import { describe, it, before, after } from "mocha";
import MusicStudioSvc from "../src/services/music-studio.service";
import MusicStudioRepo from "../src/repositories/music-studio.repository";
import TempMusicRecordRepo from "../src/repositories/temp-music-record.repository";
import FileRepo from "../src/repositories/file.repository";
import { StudioType } from "@prisma/client";

describe("Recording Integration Flow", function () {
  this.timeout(60000); // High timeout for S3/FFmpeg ops

  let testStudioId: string;
  let testFileId: string;
  const VALID_USER_ID = "1a9d0ebb-a78c-4b5a-81fe-725cfa16b8c6"; // Found in earlier check
  const TEST_MUSIC_ID = "spec-test-music-" + Date.now();

  before(async () => {
    // 1. Create a test studio
    const result = await MusicStudioSvc.createStudio({
      name: "Spec Integration Studio",
      studioType: StudioType.CROWDSINGING,
      ownerId: VALID_USER_ID,
    });
    testStudioId = result.data.id;
  });

  after(async () => {
    // Cleanup
    if (testStudioId) {
      await TempMusicRecordRepo.deleteByStudioId(testStudioId);
      await MusicStudioRepo.delete(testStudioId);
    }
  });

  it("should persist a chunk with startTimeOffset and retrieve it", async () => {
    // 1. Create a dummy file
    const file = await FileRepo.createFile({
      filename: "test_offset_chunk.m4a",
      fileUrl: "https://example.com/test.m4a",
      metaData: { mimetype: "audio/mp4" },
    });
    testFileId = file.id;

    // 2. Persist Temp record with offset
    const offset = 4.25;
    const record = await TempMusicRecordRepo.create({
      fileId: file.id,
      studioId: testStudioId,
      musicId: TEST_MUSIC_ID,
      order: 1,
      startTimeOffset: offset,
      metaData: { userId: VALID_USER_ID },
    });

    expect(record.startTimeOffset).to.equal(offset);

    // 3. Fetch back
    const chunks = await TempMusicRecordRepo.findByMusicIdAndStudioId(
      TEST_MUSIC_ID,
      testStudioId,
    );
    expect(chunks).to.have.lengthOf(1);
    expect(chunks[0].startTimeOffset).to.equal(offset);
  });

  it("should generate a preview with mixed offsets", async function () {
    // This test actually calls the S3 merging logic
    // We'll use a real file URL to ensure FFmpeg can read it
    const realUrl =
      "https://d1lq91nbxprxl1.cloudfront.net/recordings/1770718991824-gu9lxxbu-recording-32594B62-17C4-4C3E-9174-C8C96820F542.m4a";

    // Add another chunk
    const file2 = await FileRepo.createFile({
      filename: "test_offset_chunk_2.m4a",
      fileUrl: realUrl,
      metaData: { mimetype: "audio/mp4" },
    });

    await TempMusicRecordRepo.create({
      fileId: file2.id,
      studioId: testStudioId,
      musicId: TEST_MUSIC_ID,
      order: 2,
      startTimeOffset: 1.5,
      metaData: { userId: VALID_USER_ID },
    });

    // Generate Preview
    const previewResult = await MusicStudioSvc.previewRecording({
      studioId: testStudioId,
      musicId: TEST_MUSIC_ID,
    });

    expect(previewResult.message).to.equal("Preview generated successfully");
    expect(previewResult.data.previewUrl).to.include("cloudfront.net");
    expect(previewResult.data.chunkCount).to.be.at.least(2);
  });
});
