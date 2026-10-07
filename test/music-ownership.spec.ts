import { expect } from "chai";
import { afterEach, describe, it } from "mocha";
import MusicRepo from "../src/repositories/music.repository";
import MusicSvc from "../src/services/music.service";
import CacheUtil from "../src/utils/cache.util";

// Offline: the repository and cache calls are stubbed, so this never reaches
// the database or Redis.
describe("MusicSvc ownership", function () {
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

  /** Stubs the song lookup and records whether a write happened. */
  const givenSong = (song: Record<string, unknown> | null) => {
    const writes: string[] = [];
    stub(MusicRepo, "findOwnership", async () => song);
    stub(MusicRepo, "update", async (id: string, data: any) => {
      writes.push("update");
      return { id, ...data };
    });
    stub(MusicRepo, "delete", async (id: string) => {
      writes.push("delete");
      return { id };
    });
    stub(CacheUtil, "del", async () => undefined);
    stub(CacheUtil, "delByPattern", async () => undefined);
    return writes;
  };

  const rejection = async (p: Promise<unknown>) => {
    try {
      await p;
    } catch (e: any) {
      return e;
    }
    return expect.fail("expected the call to be rejected");
  };

  it("lets the uploader update their own song", async function () {
    const writes = givenSong({ id: "m1", ownerId: "u1", deletedAt: null });
    const result: any = await MusicSvc.updateMusic("m1", "u1", {
      title: "New title",
    });
    expect(writes).to.deep.equal(["update"]);
    expect(result.title).to.equal("New title");
  });

  it("lets the uploader delete their own song", async function () {
    const writes = givenSong({ id: "m1", ownerId: "u1", deletedAt: null });
    await MusicSvc.deleteMusic("m1", "u1");
    expect(writes).to.deep.equal(["delete"]);
  });

  it("refuses another user's update with 403 and writes nothing", async function () {
    const writes = givenSong({ id: "m1", ownerId: "u1", deletedAt: null });
    const error = await rejection(
      MusicSvc.updateMusic("m1", "intruder", { title: "x" }),
    );
    expect(error.statusCode).to.equal(403);
    expect(writes).to.be.empty;
  });

  it("refuses another user's delete with 403 and writes nothing", async function () {
    const writes = givenSong({ id: "m1", ownerId: "u1", deletedAt: null });
    const error = await rejection(MusicSvc.deleteMusic("m1", "intruder"));
    expect(error.statusCode).to.equal(403);
    expect(writes).to.be.empty;
  });

  it("treats a song with no owner (seeded catalogue) as read-only", async function () {
    const writes = givenSong({ id: "m1", ownerId: null, deletedAt: null });
    const error = await rejection(MusicSvc.deleteMusic("m1", "u1"));
    expect(error.statusCode).to.equal(403);
    expect(writes).to.be.empty;
  });

  it("404s for a song that does not exist", async function () {
    const writes = givenSong(null);
    const error = await rejection(MusicSvc.updateMusic("nope", "u1", {}));
    expect(error.statusCode).to.equal(404);
    expect(writes).to.be.empty;
  });

  it("404s for a soft-deleted song, even for its owner", async function () {
    const writes = givenSong({
      id: "m1",
      ownerId: "u1",
      deletedAt: new Date(),
    });
    const error = await rejection(MusicSvc.deleteMusic("m1", "u1"));
    expect(error.statusCode).to.equal(404);
    expect(writes).to.be.empty;
  });
});
