import { expect } from "chai";
import { afterEach, describe, it } from "mocha";
import MusicStudioRepo from "../src/repositories/music-studio.repository";
import MusicStudioSvc, {
  MAX_STUDIO_KEY_ATTEMPTS,
  STUDIO_KEY_LOCK_SECONDS,
  TOO_MANY_STUDIO_KEY_ATTEMPTS,
} from "../src/services/music-studio.service";
import RedisUtil from "../src/utils/redis.util";

// Offline: the repository and Redis are stubbed, so this never reaches the
// database or a Redis server.
describe("Private studio codes", function () {
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

  /** In-memory stand-in for the INCR / EXPIRE / DEL calls the limiter makes. */
  const givenRedis = () => {
    const counts = new Map<string, number>();
    const ttls = new Map<string, number>();
    stub(RedisUtil, "useConnection", () => ({
      incr: async (k: string) => {
        const n = (counts.get(k) ?? 0) + 1;
        counts.set(k, n);
        return n;
      },
      expire: async (k: string, s: number) => {
        ttls.set(k, s);
        return true;
      },
      del: async (k: string) => {
        counts.delete(k);
        ttls.delete(k);
        return 1;
      },
    }));
    return { counts, ttls };
  };

  /** A private studio "s-1" with code ABC123; returns the users added. */
  const givenStudio = () => {
    const joined: string[] = [];
    const studio = {
      id: "s-1",
      ownerId: "owner",
      keyPassword: "ABC123",
      deletedAt: null,
    };
    stub(MusicStudioRepo, "findById", async () => studio);
    stub(MusicStudioRepo, "isUserInStudio", async () => false);
    stub(MusicStudioRepo, "addUser", async (_s: string, userId: string) => {
      joined.push(userId);
      return { userId };
    });
    return joined;
  };

  const rejection = async (p: Promise<unknown>): Promise<string> => {
    try {
      await p;
    } catch (e: any) {
      return e.message;
    }
    return expect.fail("expected the join to be rejected");
  };

  it("lets two rooms share a code", async () => {
    const created: any[] = [];
    stub(MusicStudioRepo, "create", async (data: any) => {
      created.push(data);
      return { id: `s-${created.length}`, ...data };
    });
    const input = {
      name: "Room",
      keyPassword: "ABC123",
      studioType: "RELAYSINGING" as any,
      ownerId: "owner",
    };
    await MusicStudioSvc.createStudio(input);
    await MusicStudioSvc.createStudio({ ...input, ownerId: "someone-else" });
    expect(created).to.have.length(2);
  });

  it("joins with the right code and clears the counter", async () => {
    const { counts } = givenRedis();
    const joined = givenStudio();
    await rejection(MusicStudioSvc.joinStudio("s-1", "u-1", "WRONG1"));
    await MusicStudioSvc.joinStudio("s-1", "u-1", "ABC123");
    expect(joined).to.deep.equal(["u-1"]);
    expect(counts.size).to.equal(0);
  });

  it("rejects a wrong, missing or different-length code", async () => {
    givenRedis();
    const joined = givenStudio();
    for (const code of ["ABC124", undefined, "", "ABC1234", "abc123"]) {
      expect(
        await rejection(MusicStudioSvc.joinStudio("s-1", "u-1", code)),
      ).to.equal("Invalid studio key");
    }
    expect(joined).to.be.empty;
  });

  it("locks a user out of a room after too many wrong codes", async () => {
    const { ttls } = givenRedis();
    const joined = givenStudio();
    for (let i = 0; i < MAX_STUDIO_KEY_ATTEMPTS; i++) {
      await rejection(MusicStudioSvc.joinStudio("s-1", "u-1", "WRONG1"));
    }
    // Even the right code is refused while locked, so the lock is no oracle.
    expect(
      await rejection(MusicStudioSvc.joinStudio("s-1", "u-1", "ABC123")),
    ).to.equal(TOO_MANY_STUDIO_KEY_ATTEMPTS);
    expect(joined).to.be.empty;
    expect([...ttls.values()]).to.deep.equal([STUDIO_KEY_LOCK_SECONDS]);
  });

  it("keeps the lock to that user and room", async () => {
    givenRedis();
    const joined = givenStudio();
    for (let i = 0; i < MAX_STUDIO_KEY_ATTEMPTS; i++) {
      await rejection(MusicStudioSvc.joinStudio("s-1", "u-1", "WRONG1"));
    }
    await MusicStudioSvc.joinStudio("s-1", "u-2", "ABC123");
    expect(joined).to.deep.equal(["u-2"]);
  });

  it("does not count joins to public rooms", async () => {
    const { counts } = givenRedis();
    stub(MusicStudioRepo, "findById", async () => ({
      id: "s-2",
      keyPassword: null,
      deletedAt: null,
    }));
    stub(MusicStudioRepo, "isUserInStudio", async () => false);
    stub(MusicStudioRepo, "addUser", async () => ({}));
    await MusicStudioSvc.joinStudio("s-2", "u-1");
    expect(counts.size).to.equal(0);
  });
});
