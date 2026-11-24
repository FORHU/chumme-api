import { expect } from "chai";
import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, it } from "mocha";
import {
  handleMergeResult,
  SocketEmitter,
} from "../src/listeners/audio-result.listener";
import {
  AudioMergeJob,
  previewPrefix,
  renderKey,
} from "../src/services/audio-render";
import MusicLibraryRepo from "../src/repositories/music-library.repository";
import MusicRecordRepo from "../src/repositories/music-record.repository";
import MusicTempRecordRepo from "../src/repositories/music-temp-record.repository";
import S3Util from "../src/utils/s3.util";
import { prisma } from "../src/utils/prisma";
import { cleanupTempFiles } from "../src/utils/media.utils";
import { receiveCount } from "../src/utils/sqs";

// Offline: every repository, Prisma and S3 call is stubbed.

const job = (over: Partial<AudioMergeJob> = {}): AudioMergeJob => ({
  jobId: "save_studio-1_1700000000000",
  studioId: "studio-1",
  musicId: "music-1",
  studioType: "CROWDSINGING",
  audioUrls: ["https://cdn.example/c1.m4a", "https://cdn.example/c2.m4a"],
  offsets: [0, 1.5],
  backingTrackUrl: "https://cdn.example/backing.mp3",
  jobType: "save",
  singerIds: ["user-1"],
  metaData: { lookupMusicId: "music-input-1" },
  maxDuration: 120,
  ...over,
});

function fakeIo() {
  const emitted: { room: string; event: string; payload: any }[] = [];
  const io: SocketEmitter = {
    to: (room) => ({
      emit: (event, payload) => emitted.push({ room, event, payload }),
    }),
  };
  return { io, emitted };
}

// Stubs, restored after each test.
const p = prisma as any;
const saved = {
  musicLibrary: p.musicLibrary,
  musicSingerPart: p.musicSingerPart,
  $transaction: p.$transaction,
  libCreate: MusicLibraryRepo.create,
  recCreate: MusicRecordRepo.create,
  recFind: MusicRecordRepo.findByJobId,
  tempDelete: MusicTempRecordRepo.deleteByMusicIdAndStudioId,
  publicUrl: S3Util.publicUrl,
  deleteFile: S3Util.deleteFile,
  deleteFileByKey: S3Util.deleteFileByKey,
  deleteByPrefix: S3Util.deleteByPrefix,
};

let calls: Record<string, any[][]>;
const record =
  (name: string) =>
  (...args: any[]) => {
    (calls[name] ||= []).push(args);
  };

function setModel(name: string, value: unknown) {
  Object.defineProperty(prisma, name, {
    value,
    configurable: true,
    writable: true,
  });
}

beforeEach(() => {
  calls = {};
  S3Util.publicUrl = (key: string) => `https://cdn.test/${key}`;
  S3Util.deleteFile = (async (...a: any[]) =>
    record("deleteFile")(...a)) as any;
  S3Util.deleteFileByKey = (async (...a: any[]) =>
    record("deleteFileByKey")(...a)) as any;
  S3Util.deleteByPrefix = (async (...a: any[]) => {
    record("deleteByPrefix")(...a);
    return 0;
  }) as any;
  MusicTempRecordRepo.deleteByMusicIdAndStudioId = (async (...a: any[]) => {
    record("tempDelete")(...a);
    return { count: 1 };
  }) as any;
  setModel("musicLibrary", {
    findFirst: async () => null,
    deleteMany: async (...a: any[]) => {
      record("libDeleteMany")(...a);
      return { count: 0 };
    },
  });
  setModel("musicSingerPart", {
    createMany: async (...a: any[]) => record("partsCreateMany")(...a),
  });
  // An interactive transaction just runs its callback with a fake client.
  setModel("$transaction", async (fn: any) =>
    fn({ musicSingerPart: p.musicSingerPart }),
  );
});

afterEach(() => {
  setModel("musicLibrary", saved.musicLibrary);
  setModel("musicSingerPart", saved.musicSingerPart);
  setModel("$transaction", saved.$transaction);
  MusicLibraryRepo.create = saved.libCreate;
  MusicRecordRepo.create = saved.recCreate;
  MusicRecordRepo.findByJobId = saved.recFind;
  MusicTempRecordRepo.deleteByMusicIdAndStudioId = saved.tempDelete;
  S3Util.publicUrl = saved.publicUrl;
  S3Util.deleteFile = saved.deleteFile;
  S3Util.deleteFileByKey = saved.deleteFileByKey;
  S3Util.deleteByPrefix = saved.deleteByPrefix;
});

describe("renderKey", function () {
  it("gives each attempt of a save its own key under renders/", function () {
    expect(renderKey(job(), 1)).to.equal(
      "renders/save_studio-1_1700000000000_a1.mp3",
    );
    expect(renderKey(job(), 2)).to.not.equal(renderKey(job(), 1));
  });

  it("keeps previews under their session prefix", function () {
    const preview = job({ jobType: "preview", jobId: "preview_studio-1_1" });
    expect(renderKey(preview, 1).startsWith(`${previewPrefix(preview)}_`)).to.be
      .true;
  });
});

describe("handleMergeResult: save", function () {
  const done = (j = job()) => ({
    status: "done" as const,
    job: j,
    outputKey: renderKey(j, 1),
    size: 1234,
    mergeTimeMs: 900,
  });

  it("writes the rows with the job id in one transaction, cleans up, then emits", async function () {
    const { io, emitted } = fakeIo();
    const txUsed: any[] = [];
    MusicLibraryRepo.create = (async (data: any, tx: any) => {
      txUsed.push(tx);
      return { id: "file-1", ...data };
    }) as any;
    MusicRecordRepo.create = (async (data: any, tx: any) => {
      txUsed.push(tx);
      expect(data.jobId).to.equal("save_studio-1_1700000000000");
      return {
        id: "rec-1",
        singers: [{ id: "user-1" }],
        file: { fileUrl: `https://cdn.test/${renderKey(job(), 1)}` },
      };
    }) as any;

    await handleMergeResult(
      done(
        job({
          performanceMapping: [
            { startLine: 0, endLine: 4, singerId: "user-1" },
          ],
        }),
      ),
      io,
    );

    expect(txUsed).to.have.length(2);
    expect(txUsed.every(Boolean), "both writes ran inside the transaction").to
      .be.true;
    expect(calls.partsCreateMany).to.have.length(1);
    expect(calls.tempDelete[0]).to.deep.equal(["music-input-1", "studio-1"]);
    expect(calls.deleteFile.map((c) => c[0])).to.deep.equal(job().audioUrls);
    expect(calls.deleteFileByKey, "no duplicate to delete").to.be.undefined;
    expect(emitted).to.deep.equal([
      {
        room: "studio-1",
        event: "recording_saved",
        payload: {
          studioId: "studio-1",
          musicId: "music-1",
          recordId: "rec-1",
          fileUrl: `https://cdn.test/${renderKey(job(), 1)}`,
          mergeTimeMs: 900,
        },
      },
    ]);
  });

  it("treats P2002 on jobId as already saved and deletes the duplicate render", async function () {
    const { io, emitted } = fakeIo();
    MusicLibraryRepo.create = (async () => ({ id: "file-2" })) as any;
    MusicRecordRepo.create = (async () => {
      throw Object.assign(new Error("Unique constraint failed"), {
        code: "P2002",
      });
    }) as any;
    MusicRecordRepo.findByJobId = (async () => ({
      id: "rec-first",
      singers: [{ id: "user-1" }],
      file: { fileUrl: "https://cdn.test/renders/first_a1.mp3" },
    })) as any;

    const second = { ...done(), outputKey: renderKey(job(), 2) };
    await handleMergeResult(second, io);

    expect(calls.deleteFileByKey).to.deep.equal([[renderKey(job(), 2)]]);
    expect(emitted).to.have.length(1);
    expect(emitted[0].event).to.equal("recording_saved");
    expect(emitted[0].payload.recordId).to.equal("rec-first");
    expect(emitted[0].payload.fileUrl).to.equal(
      "https://cdn.test/renders/first_a1.mp3",
    );
  });

  it("rethrows other database errors so SQS retries", async function () {
    const { io, emitted } = fakeIo();
    MusicLibraryRepo.create = (async () => {
      throw Object.assign(new Error("connection lost"), { code: "P1001" });
    }) as any;

    let caught: any;
    await handleMergeResult(done(), io).catch((e) => (caught = e));

    expect(caught?.message).to.equal("connection lost");
    expect(emitted).to.be.empty;
    expect(calls.tempDelete, "nothing cleaned up before a save").to.be
      .undefined;
  });
});

describe("handleMergeResult: preview", function () {
  const preview = job({ jobType: "preview", jobId: "preview_studio-1_1" });
  const done = {
    status: "done" as const,
    job: preview,
    outputKey: renderKey(preview, 1),
    size: 500,
    mergeTimeMs: 300,
  };

  it("creates the PREVIEW row, deletes older previews and their rows, then emits", async function () {
    const { io, emitted } = fakeIo();
    MusicLibraryRepo.create = (async (data: any) => ({
      id: "prev-new",
      ...data,
    })) as any;

    await handleMergeResult(done, io);

    expect(calls.deleteByPrefix).to.deep.equal([
      [`${previewPrefix(preview)}_`, [done.outputKey]],
    ]);
    expect(calls.libDeleteMany[0][0].where).to.deep.equal({
      fileType: "PREVIEW",
      filename: { startsWith: "preview_studio-1_music-1_" },
      id: { not: "prev-new" },
    });
    expect(emitted).to.have.length(1);
    expect(emitted[0].event).to.equal("preview_ready");
    expect(emitted[0].payload).to.include({
      previewUrl: `https://cdn.test/${done.outputKey}`,
      fileId: "prev-new",
      chunkCount: 2,
    });
  });

  it("reuses the row on a redelivered result", async function () {
    const { io, emitted } = fakeIo();
    setModel("musicLibrary", {
      findFirst: async () => ({ id: "prev-existing" }),
      deleteMany: async () => ({ count: 0 }),
    });
    MusicLibraryRepo.create = (async () => {
      throw new Error("should not create a second row");
    }) as any;

    await handleMergeResult(done, io);

    expect(emitted[0].payload.fileId).to.equal("prev-existing");
  });
});

describe("handleMergeResult: failed", function () {
  it("emits save_failed when nothing was saved", async function () {
    const { io, emitted } = fakeIo();
    MusicRecordRepo.findByJobId = (async () => null) as any;

    await handleMergeResult(
      { status: "failed", job: job(), error: "ffmpeg exited 1" },
      io,
    );

    expect(emitted).to.deep.equal([
      {
        room: "studio-1",
        event: "save_failed",
        payload: {
          studioId: "studio-1",
          musicId: "music-1",
          jobId: "save_studio-1_1700000000000",
        },
      },
    ]);
  });

  it("emits recording_saved when an earlier attempt already saved", async function () {
    const { io, emitted } = fakeIo();
    MusicRecordRepo.findByJobId = (async () => ({
      id: "rec-1",
      file: { fileUrl: "https://cdn.test/renders/x.mp3" },
    })) as any;

    await handleMergeResult(
      { status: "failed", job: job(), error: "chunk download failed" },
      io,
    );

    expect(emitted).to.have.length(1);
    expect(emitted[0].event).to.equal("recording_saved");
    expect(emitted[0].payload.recordId).to.equal("rec-1");
  });

  it("emits preview_failed for a preview", async function () {
    const { io, emitted } = fakeIo();

    await handleMergeResult(
      {
        status: "failed",
        job: job({ jobType: "preview" }),
        error: "ffmpeg exited 1",
      },
      io,
    );

    expect(emitted.map((e) => e.event)).to.deep.equal(["preview_failed"]);
  });

  it("refuses to run without socket.io instead of dropping the event", async function () {
    let caught: any;
    await handleMergeResult(
      { status: "failed", job: job({ jobType: "preview" }), error: "x" },
      null,
    ).catch((e) => (caught = e));

    expect(caught?.message).to.match(/socket\.io/);
  });
});

describe("cleanupTempFiles", function () {
  it("deletes files in the temp dir and leaves others alone", function () {
    const tmp = path.join(os.tmpdir(), `cleanup-spec-${process.pid}.wav`);
    const outside = path.join(__dirname, `cleanup-spec-${process.pid}.wav`);
    fs.writeFileSync(tmp, "x");
    fs.writeFileSync(outside, "x");
    try {
      cleanupTempFiles([tmp, outside, path.join(os.tmpdir(), "missing.wav")]);
      expect(fs.existsSync(tmp)).to.be.false;
      expect(fs.existsSync(outside)).to.be.true;
    } finally {
      fs.rmSync(outside, { force: true });
      fs.rmSync(tmp, { force: true });
    }
  });
});

describe("receiveCount", function () {
  it("reads ApproximateReceiveCount, defaulting to the first attempt", function () {
    expect(
      receiveCount({ Attributes: { ApproximateReceiveCount: "2" } }),
    ).to.equal(2);
    expect(receiveCount({})).to.equal(1);
  });
});
