import { expect } from "chai";
import { afterEach, describe, it } from "mocha";
import express from "express";
import request from "supertest";
import { DevicePlatform, PushProvider } from "@prisma/client";
import DeviceTokenRepo from "../src/repositories/device-token.repository";
import DeviceTokenSvc, {
  MAX_DEVICES_PER_USER,
} from "../src/services/device-token.service";
import PushSvc, { ANDROID_CHANNEL_ID } from "../src/services/push.service";
import deviceRoute from "../src/routes/device.route";

// Offline: every DeviceTokenRepo method is stubbed and FCM is a fake, so this
// never reaches the database or Google.
const originals = new Map<string, any>();
const stub = (
  name: keyof typeof DeviceTokenRepo,
  impl: (...args: any[]) => any,
) => {
  if (!originals.has(name)) originals.set(name, (DeviceTokenRepo as any)[name]);
  (DeviceTokenRepo as any)[name] = impl;
};

afterEach(() => {
  originals.forEach((fn, name) => ((DeviceTokenRepo as any)[name] = fn));
  originals.clear();
  PushSvc.setMessagingForTests(undefined);
});

describe("DeviceTokenSvc", function () {
  it("stores the token as FCM by default and trims old devices", async function () {
    let saved: any;
    let deleted: string[] = [];
    let keep = -1;
    stub("upsert", async (input: any) => (saved = input));
    stub("findStaleIdsForUser", async (_u: string, k: number) => {
      keep = k;
      return ["old-1"];
    });
    stub("deleteByIds", async (ids: string[]) => (deleted = ids));

    await DeviceTokenSvc.register("me", {
      token: "tok",
      platform: DevicePlatform.ANDROID,
    });

    expect(saved).to.deep.equal({
      userId: "me",
      token: "tok",
      platform: DevicePlatform.ANDROID,
      provider: PushProvider.FCM,
      appVersion: null,
    });
    expect(keep).to.equal(MAX_DEVICES_PER_USER);
    expect(deleted).to.deep.equal(["old-1"]);
  });

  it("only removes the caller's own token", async function () {
    let args: string[] = [];
    stub("deleteForUser", async (u: string, t: string) => (args = [u, t]));
    await DeviceTokenSvc.unregister("me", "tok");
    expect(args).to.deep.equal(["me", "tok"]);
  });
});

describe("PushSvc.sendToUsers", function () {
  const fakeMessaging = (codes: (string | null)[]) => {
    const calls: any[] = [];
    const fake = {
      sendEachForMulticast: async (msg: any) => {
        calls.push(msg);
        const responses = msg.tokens.map((_: string, i: number) =>
          codes[i]
            ? { success: false, error: { code: codes[i] } }
            : { success: true },
        );
        return {
          successCount: responses.filter((r: any) => r.success).length,
          failureCount: responses.filter((r: any) => !r.success).length,
          responses,
        };
      },
    };
    PushSvc.setMessagingForTests(fake as any);
    return calls;
  };

  it("sends to FCM tokens, skips Expo ones, and prunes dead tokens", async function () {
    stub("findByUserIds", async () => [
      { token: "a", provider: PushProvider.FCM, userId: "u1" },
      { token: "b", provider: PushProvider.FCM, userId: "u1" },
      { token: "c", provider: PushProvider.FCM, userId: "u2" },
      {
        token: "ExponentPushToken[x]",
        provider: PushProvider.EXPO,
        userId: "u2",
      },
    ]);
    let pruned: string[] = [];
    stub("deleteTokens", async (t: string[]) => {
      pruned = t;
      return { count: t.length };
    });
    const calls = fakeMessaging([
      null,
      "messaging/registration-token-not-registered",
      "messaging/internal-error",
    ]);

    const res = await PushSvc.sendToUsers(["u1", "u2", "u1"], {
      title: "Hi",
      body: "There",
      data: { type: "test" },
    });

    expect(calls).to.have.length(1);
    expect(calls[0].tokens).to.deep.equal(["a", "b", "c"]);
    expect(calls[0].android.notification.channelId).to.equal(
      ANDROID_CHANNEL_ID,
    );
    expect(calls[0].data).to.deep.equal({ type: "test" });
    // A server-side error is not a dead token, so "c" is kept.
    expect(pruned).to.deep.equal(["b"]);
    expect(res).to.deep.equal({ sent: 1, failed: 2, pruned: 1, skipped: 1 });
  });

  it("splits large sends into batches of 500", async function () {
    const tokens = Array.from({ length: 1201 }, (_, i) => ({
      token: `t${i}`,
      provider: PushProvider.FCM,
      userId: "u",
    }));
    stub("findByUserIds", async () => tokens);
    const calls = fakeMessaging([]);
    const res = await PushSvc.sendToUsers(["u"], { title: "x", body: "y" });
    expect(calls.map((c) => c.tokens.length)).to.deep.equal([500, 500, 201]);
    expect(res.sent).to.equal(1201);
  });

  it("skips quietly when push is not configured", async function () {
    stub("findByUserIds", async () => [
      { token: "a", provider: PushProvider.FCM, userId: "u" },
    ]);
    PushSvc.setMessagingForTests(null);
    const res = await PushSvc.sendToUsers(["u"], { title: "x", body: "y" });
    expect(res).to.deep.equal({ sent: 0, failed: 0, pruned: 0, skipped: 1 });
    expect(PushSvc.isEnabled()).to.equal(false);
  });

  it("never throws, even when the database fails", async function () {
    stub("findByUserIds", async () => {
      throw new Error("db down");
    });
    const res = await PushSvc.sendToUsers(["u"], { title: "x", body: "y" });
    expect(res.sent).to.equal(0);
  });

  it("does nothing for an empty audience", async function () {
    let called = false;
    stub("findByUserIds", async () => {
      called = true;
      return [];
    });
    await PushSvc.sendToUsers([], { title: "x", body: "y" });
    expect(called).to.equal(false);
  });
});

describe("Device routes need a signed-in user", function () {
  const app = express();
  app.use(express.json());
  app.use("/api/v1/devices", deviceRoute);

  for (const [method, path] of [
    ["post", "/api/v1/devices/push-token"],
    ["delete", "/api/v1/devices/push-token"],
    ["post", "/api/v1/devices/test-push"],
  ] as const) {
    it(`${method.toUpperCase()} ${path} → 401 without a token`, async function () {
      const res = await request(app)[method](path).send({ token: "x" });
      expect(res.status).to.equal(401);
    });
  }
});
