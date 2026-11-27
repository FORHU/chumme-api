import { expect } from "chai";
import { afterEach, describe, it } from "mocha";
import MusicLibraryRepo from "../src/repositories/music-library.repository";
import MusicRecordRepo from "../src/repositories/music-record.repository";
import MusicStudioRepo from "../src/repositories/music-studio.repository";
import MusicTempRecordRepo from "../src/repositories/music-temp-record.repository";
import { isUploaderKey } from "../src/services/music-access.service";
import MusicLibrarySvc from "../src/services/music-library.service";
import MusicRecordSvc from "../src/services/music-record.service";
import MusicStudioSvc from "../src/services/music-studio.service";
import S3PresignedUtil from "../src/utils/s3-presigned.util";
import S3Util from "../src/utils/s3.util";

// Offline: repositories, S3 and presigning are stubbed, so this never reaches
// the database, Redis or AWS. Covers e2e COL-X-02..05 (findings COL-B-02..06).
describe("Music library, recordings and save-recording ownership", function () {
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

  const rejection = async (p: Promise<unknown>) => {
    try {
      await p;
    } catch (e: any) {
      return e;
    }
    return expect.fail("expected the call to be rejected");
  };

  const alice = { id: "alice", role: "USER" };
  const bob = { id: "bob", role: "USER" };
  const admin = { id: "root", role: "ADMIN" };
  const cdn = (key: string) => `https://cdn.example.net/${key}`;

  describe("isUploaderKey", function () {
    it("accepts a key under the user's own prefix", function () {
      expect(isUploaderKey("uploads/alice/1-ab.m4a", "alice")).to.equal(true);
      expect(isUploaderKey("recordings/alice/song/1.m4a", "alice")).to.equal(
        true,
      );
    });

    it("refuses another user's key, a bare key and dot segments", function () {
      expect(isUploaderKey("uploads/bob/1-ab.m4a", "alice")).to.equal(false);
      expect(isUploaderKey("uploads/1-ab.m4a", "alice")).to.equal(false);
      expect(isUploaderKey("uploads/alice/../bob/x.m4a", "alice")).to.equal(
        false,
      );
      expect(isUploaderKey("/uploads/alice/x.m4a", "alice")).to.equal(false);
      expect(isUploaderKey(undefined, "alice")).to.equal(false);
    });
  });

  describe("DELETE /music-library/:id", function () {
    const givenFile = (row: Record<string, unknown> | null) => {
      const writes: string[] = [];
      stub(MusicLibraryRepo, "findById", async () => row);
      stub(MusicLibraryRepo, "delete", async () => {
        writes.push("row");
        return row;
      });
      stub(S3Util, "deleteFileByKey", async (key: string) => {
        writes.push(`s3:${key}`);
      });
      return writes;
    };

    it("refuses a stranger with 403 and deletes nothing", async function () {
      const writes = givenFile({
        id: "f1",
        fileUrl: cdn("uploads/alice/1-ab.m4a"),
      });
      const error = await rejection(MusicLibrarySvc.deleteMusicFile("f1", bob));
      expect(error.statusCode).to.equal(403);
      expect(writes).to.be.empty;
    });

    it("treats a file with no uploader in its key as staff-only", async function () {
      const writes = givenFile({ id: "f1", fileUrl: cdn("uploads/1-ab.m4a") });
      const error = await rejection(
        MusicLibrarySvc.deleteMusicFile("f1", alice),
      );
      expect(error.statusCode).to.equal(403);
      expect(writes).to.be.empty;
    });

    it("lets the uploader delete: row first, then the same key in S3", async function () {
      const writes = givenFile({
        id: "f1",
        fileUrl: cdn("uploads/alice/1-ab.m4a"),
      });
      await MusicLibrarySvc.deleteMusicFile("f1", alice);
      expect(writes).to.deep.equal(["row", "s3:uploads/alice/1-ab.m4a"]);
    });

    it("lets an admin delete any file", async function () {
      const writes = givenFile({ id: "f1", fileUrl: cdn("uploads/1-ab.m4a") });
      await MusicLibrarySvc.deleteMusicFile("f1", admin);
      expect(writes).to.deep.equal(["row", "s3:uploads/1-ab.m4a"]);
    });

    it("404s for a file that does not exist", async function () {
      const writes = givenFile(null);
      const error = await rejection(
        MusicLibrarySvc.deleteMusicFile("nope", alice),
      );
      expect(error.statusCode).to.equal(404);
      expect(writes).to.be.empty;
    });
  });

  describe("GET /music-library/get-download-url", function () {
    const givenSigner = () => {
      const signed: string[] = [];
      stub(S3PresignedUtil, "getDownloadUrl", async (key: string) => {
        signed.push(key);
        return `https://signed/${key}`;
      });
      return signed;
    };

    it("refuses another user's key and signs nothing", async function () {
      const signed = givenSigner();
      const error = await rejection(
        MusicLibrarySvc.getDownloadUrl("uploads/alice/1-ab.m4a", bob),
      );
      expect(error.statusCode).to.equal(403);
      expect(signed).to.be.empty;
    });

    it("refuses an arbitrary key outside any user prefix", async function () {
      const signed = givenSigner();
      const error = await rejection(
        MusicLibrarySvc.getDownloadUrl("private/backup.sql", alice),
      );
      expect(error.statusCode).to.equal(403);
      expect(signed).to.be.empty;
    });

    it("signs the caller's own key", async function () {
      const signed = givenSigner();
      await MusicLibrarySvc.getDownloadUrl("uploads/alice/1-ab.m4a", alice);
      expect(signed).to.deep.equal(["uploads/alice/1-ab.m4a"]);
    });
  });

  describe("recordings", function () {
    // Sung by alice, in a room bob owns.
    const record = {
      id: "r1",
      deletedAt: null,
      singers: [{ id: "alice" }],
      studio: { ownerId: "bob" },
    };
    const carol = { id: "carol", role: "USER" };

    const givenRecord = (row: Record<string, unknown> | null) => {
      const writes: string[] = [];
      stub(MusicRecordRepo, "findById", async () => row);
      stub(MusicRecordRepo, "delete", async () => {
        writes.push("delete");
        return row;
      });
      return writes;
    };

    it("lets a singer delete their recording", async function () {
      const writes = givenRecord(record);
      await MusicRecordSvc.delete("r1", alice);
      expect(writes).to.deep.equal(["delete"]);
    });

    it("refuses a stranger's delete with 403", async function () {
      const writes = givenRecord(record);
      const error = await rejection(MusicRecordSvc.delete("r1", carol));
      expect(error.statusCode).to.equal(403);
      expect(writes).to.be.empty;
    });

    it("does not let the room owner delete a take they did not sing", async function () {
      const writes = givenRecord(record);
      const error = await rejection(MusicRecordSvc.delete("r1", bob));
      expect(error.statusCode).to.equal(403);
      expect(writes).to.be.empty;
    });

    it("lets an admin delete any recording", async function () {
      const writes = givenRecord(record);
      await MusicRecordSvc.delete("r1", admin);
      expect(writes).to.deep.equal(["delete"]);
    });

    it("404s for an already deleted recording", async function () {
      const writes = givenRecord({ ...record, deletedAt: new Date() });
      const error = await rejection(MusicRecordSvc.delete("r1", alice));
      expect(error.statusCode).to.equal(404);
      expect(writes).to.be.empty;
    });

    it("shows a recording to its singer and its room owner, not to others", async function () {
      givenRecord(record);
      expect((await MusicRecordSvc.getById("r1", alice)).data.id).to.equal(
        "r1",
      );
      expect((await MusicRecordSvc.getById("r1", bob)).data.id).to.equal("r1");
      const error = await rejection(MusicRecordSvc.getById("r1", carol));
      expect(error.statusCode).to.equal(403);
    });

    it("refuses to list another user's album", async function () {
      let queried = false;
      stub(MusicRecordRepo, "findByUserId", async () => {
        queried = true;
        return { data: [], pagination: {} };
      });
      const error = await rejection(MusicRecordSvc.getByUserId("alice", carol));
      expect(error.statusCode).to.equal(403);
      expect(queried).to.equal(false);

      await MusicRecordSvc.getByUserId("alice", alice);
      expect(queried).to.equal(true);
    });

    it("scopes every list to the caller, and only staff see everything", async function () {
      const seen: any[] = [];
      const capture = async (...args: any[]) => {
        seen.push(args[args.length - 1].visibleTo);
        return { data: [], pagination: {} };
      };
      stub(MusicRecordRepo, "findAll", capture);
      stub(MusicRecordRepo, "findByStudioId", capture);
      stub(MusicRecordRepo, "findByMusicId", capture);

      await MusicRecordSvc.getAll(carol);
      await MusicRecordSvc.getByStudioId("s1", carol);
      await MusicRecordSvc.getByMusicId("m1", carol);
      const own = {
        OR: [
          { singers: { some: { id: "carol" } } },
          { studio: { ownerId: "carol" } },
        ],
      };
      expect(seen).to.deep.equal([own, own, own]);

      seen.length = 0;
      await MusicRecordSvc.getAll(admin);
      expect(seen).to.deep.equal([undefined]);
    });
  });

  describe("filing a recording in a room", function () {
    // Room s1 belongs to bob; alice is only a listener there.
    const givenRoom = (exists = true) => {
      stub(MusicStudioRepo, "findById", async () =>
        exists ? { id: "s1", ownerId: "bob" } : null,
      );
      stub(MusicStudioRepo, "getMembership", async (_s: string, u: string) =>
        u === "alice" ? { isActive: true, role: "LISTENER" } : null,
      );
      const merged: string[] = [];
      stub(MusicTempRecordRepo, "findByMusicIdAndStudioId", async () => {
        merged.push("merge");
        return [];
      });
      return merged;
    };

    it("save-recording refuses a non-host with 403 before touching any audio", async function () {
      const merged = givenRoom();
      const error = await rejection(
        MusicStudioSvc.saveRecording({
          studioId: "s1",
          musicId: "m1",
          userId: "alice",
        } as any),
      );
      expect(error.statusCode).to.equal(403);
      expect(merged).to.be.empty;
    });

    it("save-recording 404s for a room that does not exist", async function () {
      givenRoom(false);
      const error = await rejection(
        MusicStudioSvc.saveRecording({
          studioId: "nope",
          musicId: "m1",
          userId: "bob",
        } as any),
      );
      expect(error.statusCode).to.equal(404);
    });

    it("POST /music-records refuses a non-host", async function () {
      givenRoom();
      let created = false;
      stub(MusicRecordRepo, "create", async () => {
        created = true;
        return {};
      });
      const error = await rejection(
        MusicRecordSvc.create(
          { studioId: "s1", musicId: "m1", fileId: "f1" },
          alice,
        ),
      );
      expect(error.statusCode).to.equal(403);
      expect(created).to.equal(false);
    });

    it("POST /music-records refuses the host wrapping someone else's file", async function () {
      givenRoom();
      stub(MusicLibraryRepo, "findById", async () => ({
        id: "f1",
        fileUrl: cdn("uploads/alice/1-ab.m4a"),
      }));
      let created = false;
      stub(MusicRecordRepo, "create", async () => {
        created = true;
        return {};
      });
      const error = await rejection(
        MusicRecordSvc.create(
          { studioId: "s1", musicId: "m1", fileId: "f1" },
          bob,
        ),
      );
      expect(error.statusCode).to.equal(403);
      expect(created).to.equal(false);
    });
  });
});
