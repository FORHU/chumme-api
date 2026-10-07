import { expect } from "chai";
import { afterEach, describe, it } from "mocha";
import YouTubeService, {
  uploadsPlaylistFor,
} from "../src/services/net-communities/youtube.service";
import { QuotaService } from "../src/services/net-communities/ingestion/quota.service";

const CHANNEL_A = "UCaaaaaaaaaaaaaaaaaaaaaa"; // 24 chars, UC + 22
const CHANNEL_B = "UCbbbbbbbbbbbbbbbbbbbbbb";

describe("uploadsPlaylistFor", function () {
  it("swaps the UC prefix for UU", function () {
    expect(uploadsPlaylistFor(CHANNEL_A)).to.equal(`UU${CHANNEL_A.slice(2)}`);
  });

  it("rejects anything that is not a channel id", function () {
    expect(uploadsPlaylistFor("not-a-channel")).to.equal(null);
    expect(uploadsPlaylistFor("PL1234567890123456789012")).to.equal(null);
  });
});

// Offline: the YouTube client and the quota counter are stubbed.
describe("YouTubeService.checkLiveStatus", function () {
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

  /**
   * A fake client: `uploads` maps playlist id → video ids, `videos` maps
   * video id → the videos.list item. Records quota spent and calls made.
   */
  const givenYouTube = (
    uploads: Record<string, string[] | Error>,
    videos: Record<string, any>,
  ) => {
    const spent: number[] = [];
    const calls: string[] = [];
    stub(QuotaService, "increment", async (units: number) => {
      spent.push(units);
    });
    stub(YouTubeService as any, "getYouTubeClient", () => ({
      search: {
        list: async () => {
          calls.push("search.list");
          throw new Error("search.list must not be used for the live check");
        },
      },
      playlistItems: {
        list: async ({ playlistId }: any) => {
          calls.push("playlistItems.list");
          const ids = uploads[playlistId];
          if (ids instanceof Error) throw ids;
          return {
            data: {
              items: (ids || []).map((videoId) => ({
                contentDetails: { videoId },
              })),
            },
          };
        },
      },
      videos: {
        list: async ({ id }: any) => {
          calls.push("videos.list");
          return {
            data: {
              items: (id as string[]).map((v) => videos[v]).filter(Boolean),
            },
          };
        },
      },
    }));
    return { spent, calls };
  };

  const live = (id: string, extra: Record<string, any> = {}) => ({
    id,
    snippet: { liveBroadcastContent: "live" },
    status: { embeddable: true },
    liveStreamingDetails: {
      actualStartTime: "2026-10-07T01:00:00Z",
      concurrentViewers: "1234",
    },
    ...extra,
  });

  const vod = (id: string) => ({
    id,
    snippet: { liveBroadcastContent: "none" },
    status: { embeddable: true },
  });

  it("finds the live broadcast among recent uploads", async function () {
    const { calls } = givenYouTube(
      { [uploadsPlaylistFor(CHANNEL_A)!]: ["old1", "live1", "old2"] },
      { old1: vod("old1"), live1: live("live1"), old2: vod("old2") },
    );
    const result = await YouTubeService.checkLiveStatus([CHANNEL_A]);
    expect(result.get(CHANNEL_A)).to.deep.equal({
      videoId: "live1",
      concurrentViewers: 1234,
      actualStartTime: "2026-10-07T01:00:00Z",
    });
    expect(calls).to.not.include("search.list");
  });

  it("costs 1 unit per channel plus 1 per videos.list batch, not 100 per channel", async function () {
    const { spent } = givenYouTube(
      {
        [uploadsPlaylistFor(CHANNEL_A)!]: ["a1"],
        [uploadsPlaylistFor(CHANNEL_B)!]: ["b1"],
      },
      { a1: vod("a1"), b1: live("b1") },
    );
    await YouTubeService.checkLiveStatus([CHANNEL_A, CHANNEL_B]);
    expect(spent.reduce((a, b) => a + b, 0)).to.equal(3);
  });

  it("skips upcoming, ended and non-embeddable streams", async function () {
    givenYouTube(
      { [uploadsPlaylistFor(CHANNEL_A)!]: ["up", "ended", "blocked"] },
      {
        up: {
          id: "up",
          snippet: { liveBroadcastContent: "upcoming" },
          status: { embeddable: true },
          liveStreamingDetails: { scheduledStartTime: "2026-10-08T00:00:00Z" },
        },
        ended: live("ended", {
          liveStreamingDetails: {
            actualStartTime: "2026-10-07T00:00:00Z",
            actualEndTime: "2026-10-07T01:00:00Z",
          },
        }),
        blocked: live("blocked", { status: { embeddable: false } }),
      },
    );
    const result = await YouTubeService.checkLiveStatus([CHANNEL_A]);
    expect(result.size).to.equal(0);
  });

  it("keeps going when one channel's uploads cannot be read", async function () {
    givenYouTube(
      {
        [uploadsPlaylistFor(CHANNEL_A)!]: new Error("playlistNotFound"),
        [uploadsPlaylistFor(CHANNEL_B)!]: ["b1"],
      },
      { b1: live("b1") },
    );
    const result = await YouTubeService.checkLiveStatus([CHANNEL_A, CHANNEL_B]);
    expect(result.has(CHANNEL_A)).to.equal(false);
    expect(result.get(CHANNEL_B)?.videoId).to.equal("b1");
  });

  it("returns an empty map for no channels without calling YouTube", async function () {
    const { calls } = givenYouTube({}, {});
    const result = await YouTubeService.checkLiveStatus([]);
    expect(result.size).to.equal(0);
    expect(calls).to.be.empty;
  });
});
