import { expect } from "chai";
import { afterEach, describe, it } from "mocha";
import RoomMediaPolicySvc from "../src/services/room-media-policy.service";

// Offline: the admin lookup and ffprobe are stubbed, so this never reaches
// the database or S3.
describe("RoomMediaPolicySvc", function () {
  const originals: Array<[any, string, any]> = [];

  const stub = (target: any, name: string, impl: (...args: any[]) => any) => {
    originals.push([target, name, target[name]]);
    target[name] = impl;
  };

  afterEach(() => {
    while (originals.length) {
      const [target, name, fn] = originals.pop()!;
      target[name] = fn;
    }
  });

  const given = (
    isAdmin: boolean,
    media: { duration: number; hasVideo?: boolean; hasAudio?: boolean },
  ) => {
    stub(RoomMediaPolicySvc, "isCommunityAdmin", async () => isAdmin);
    stub(RoomMediaPolicySvc, "probeFile", async () => ({
      format: "mp4",
      bitrate: 0,
      hasVideo: false,
      hasAudio: true,
      ...media,
    }));
  };

  const send = (kind: "voice" | "video", reportedDuration?: number) =>
    RoomMediaPolicySvc.assertAllowed({
      roomId: "r1",
      userId: "u1",
      kind,
      fileId: "f1",
      reportedDuration,
    });

  /** ffprobe unavailable, e.g. no binary for the box's architecture */
  const givenProbeDown = (isAdmin: boolean) => {
    stub(RoomMediaPolicySvc, "isCommunityAdmin", async () => isAdmin);
    stub(RoomMediaPolicySvc, "probeFile", async () => {
      throw new Error("spawn ffprobe ENOENT");
    });
  };

  const rejection = async (p: Promise<unknown>) => {
    try {
      await p;
    } catch (e: any) {
      return e;
    }
    return expect.fail("expected the call to be rejected");
  };

  it("gives admins 30s voice and 30s video, members 7s voice and no video", function () {
    expect(RoomMediaPolicySvc.limitsFor(true)).to.deep.equal({
      isAdmin: true,
      maxVoiceSeconds: 30,
      maxVideoSeconds: 30,
    });
    expect(RoomMediaPolicySvc.limitsFor(false)).to.deep.equal({
      isAdmin: false,
      maxVoiceSeconds: 7,
      maxVideoSeconds: 0,
    });
  });

  it("lets an admin send a 30s video", async function () {
    given(true, { duration: 30.2, hasVideo: true });
    expect(await send("video")).to.equal(30.2);
  });

  it("rejects an admin video over 30s", async function () {
    given(true, { duration: 31, hasVideo: true });
    const err = await rejection(send("video"));
    expect(err.statusCode).to.equal(400);
  });

  it("lets an admin send a 30s voice message", async function () {
    given(true, { duration: 29.9 });
    expect(await send("voice")).to.equal(29.9);
  });

  it("forbids video for members", async function () {
    given(false, { duration: 3, hasVideo: true });
    const err = await rejection(send("video"));
    expect(err.statusCode).to.equal(403);
  });

  it("lets a member send a 7s voice message", async function () {
    given(false, { duration: 7.3 });
    expect(await send("voice")).to.equal(7.3);
  });

  it("rejects a member voice message over 7s", async function () {
    given(false, { duration: 8 });
    const err = await rejection(send("voice"));
    expect(err.statusCode).to.equal(400);
  });

  it("falls back to the reported duration when ffprobe is down", async function () {
    givenProbeDown(false);
    expect(await send("voice", 5)).to.equal(5);
  });

  it("still holds the reported duration to the limit", async function () {
    givenProbeDown(false);
    const err = await rejection(send("voice", 12));
    expect(err.statusCode).to.equal(400);
  });

  it("rejects when ffprobe is down and nothing was reported", async function () {
    givenProbeDown(true);
    const err = await rejection(send("voice"));
    expect(err.statusCode).to.equal(400);
  });

  it("measured duration beats a lower reported one", async function () {
    given(false, { duration: 20 });
    const err = await rejection(send("voice", 3));
    expect(err.statusCode).to.equal(400);
  });

  it("fails closed when the duration can't be read", async function () {
    given(true, { duration: 0 });
    const err = await rejection(send("voice"));
    expect(err.statusCode).to.equal(400);
  });

  it("rejects a video message that has no video stream", async function () {
    given(true, { duration: 5, hasVideo: false });
    const err = await rejection(send("video"));
    expect(err.statusCode).to.equal(400);
  });
});
