import { expect } from "chai";
import { describe, it } from "mocha";
import { createHandler, SqsRecord } from "../src/lambda/audio-merge";
import type { AudioMergeResult } from "../src/services/audio-render";

// Offline: the render and the results queue are both stubbed.

const job = {
  jobId: "save_studio-1_1",
  studioId: "studio-1",
  musicId: "music-1",
  studioType: "CROWDSINGING",
  audioUrls: ["https://cdn.example/c1.m4a"],
  offsets: [0],
  backingTrackUrl: "https://cdn.example/backing.mp3",
  jobType: "save",
};

const record = (attempt: number, body = JSON.stringify(job)): SqsRecord => ({
  messageId: `m-${attempt}`,
  body,
  attributes: { ApproximateReceiveCount: String(attempt) },
});

function setup(opts: { renderFails?: boolean; sendFails?: boolean } = {}) {
  const sent: AudioMergeResult[] = [];
  const attempts: number[] = [];
  const handler = createHandler({
    maxReceives: 2,
    renderMix: async (_job, attempt = 1) => {
      attempts.push(attempt);
      if (opts.renderFails) throw new Error("ffmpeg exited 1");
      return {
        outputKey: `renders/x_a${attempt}.mp3`,
        size: 10,
        mergeTimeMs: 5,
      };
    },
    sendResult: async (result) => {
      if (opts.sendFails) throw new Error("SQS unavailable");
      sent.push(result);
    },
  });
  return { handler, sent, attempts };
}

describe("audio-merge Lambda handler", function () {
  it("renders with the receive count as the attempt and sends the result", async function () {
    const { handler, sent, attempts } = setup();

    const res = await handler({ Records: [record(1)] });

    expect(res.batchItemFailures).to.be.empty;
    expect(attempts).to.deep.equal([1]);
    expect(sent).to.have.length(1);
    expect(sent[0]).to.deep.include({
      status: "done",
      outputKey: "renders/x_a1.mp3",
      size: 10,
    });
    expect(sent[0].job.jobId).to.equal("save_studio-1_1");
  });

  it("reports a failure before the last attempt as a batch item failure, so SQS retries", async function () {
    const { handler, sent } = setup({ renderFails: true });

    const res = await handler({ Records: [record(1)] });

    expect(res.batchItemFailures).to.deep.equal([{ itemIdentifier: "m-1" }]);
    expect(sent).to.be.empty;
  });

  it("sends status failed on the last attempt and consumes the message", async function () {
    const { handler, sent } = setup({ renderFails: true });

    const res = await handler({ Records: [record(2)] });

    expect(res.batchItemFailures).to.be.empty;
    expect(sent).to.have.length(1);
    expect(sent[0]).to.deep.include({
      status: "failed",
      error: "ffmpeg exited 1",
    });
  });

  it("lets the message go to the DLQ when even the failure report can't be sent", async function () {
    const { handler } = setup({ renderFails: true, sendFails: true });

    const res = await handler({ Records: [record(2)] });

    expect(res.batchItemFailures).to.deep.equal([{ itemIdentifier: "m-2" }]);
  });

  it("retries when the render worked but the result could not be sent", async function () {
    const { handler } = setup({ sendFails: true });

    const res = await handler({ Records: [record(1)] });

    expect(res.batchItemFailures).to.deep.equal([{ itemIdentifier: "m-1" }]);
  });

  it("drops a malformed message instead of retrying it", async function () {
    const { handler, sent, attempts } = setup();

    const res = await handler({ Records: [record(1, "{not json")] });

    expect(res.batchItemFailures).to.be.empty;
    expect(attempts).to.be.empty;
    expect(sent).to.be.empty;
  });
});
