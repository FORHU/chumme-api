import { expect } from "chai";
import { afterEach, describe, it } from "mocha";
import { ReportReason, ReportStatus, ReportTargetType } from "@prisma/client";
import ModerationRepo from "../src/repositories/moderation.repository";
import ModerationSvc from "../src/services/moderation.service";

// Offline: every ModerationRepo method the service touches is stubbed, so this
// never reaches the database.
describe("ModerationSvc", function () {
  const originals = new Map<string, any>();

  const stub = (name: keyof typeof ModerationRepo, impl: (...args: any[]) => any) => {
    if (!originals.has(name)) originals.set(name, (ModerationRepo as any)[name]);
    (ModerationRepo as any)[name] = impl;
  };

  afterEach(() => {
    originals.forEach((fn, name) => ((ModerationRepo as any)[name] = fn));
    originals.clear();
  });

  const expectRejects = async (p: Promise<unknown>, status: number) => {
    try {
      await p;
    } catch (e: any) {
      expect(e.statusCode).to.equal(status);
      return;
    }
    expect.fail("expected a rejection");
  };

  describe("blockUser", function () {
    it("refuses to block yourself", async function () {
      await expectRejects(ModerationSvc.blockUser("me", "me"), 400);
    });

    it("404s when the target does not exist", async function () {
      stub("findActiveUser", async () => null);
      await expectRejects(ModerationSvc.blockUser("me", "ghost"), 404);
    });

    it("upserts the block for a real user", async function () {
      const calls: string[][] = [];
      stub("findActiveUser", async (id: string) => ({ id }));
      stub("upsertBlock", async (a: string, b: string) => calls.push([a, b]));
      await ModerationSvc.blockUser("me", "them");
      expect(calls).to.deep.equal([["me", "them"]]);
    });
  });

  describe("submitReport", function () {
    const base = {
      reporterId: "reporter",
      targetId: "target",
      reason: ReportReason.SPAM,
    };

    it("resolves a message's author server-side and stores it", async function () {
      let created: any;
      stub("findMessageAuthorId", async () => "author");
      stub("findOpenReport", async () => null);
      stub("createReport", async (data: any) => (created = { id: "r1", status: ReportStatus.OPEN, ...data }));

      const result = await ModerationSvc.submitReport({
        ...base,
        targetType: ReportTargetType.MESSAGE,
        details: "  buy followers  ",
      });

      expect(result.created).to.equal(true);
      expect(created.reportedUserId).to.equal("author");
      expect(created.details).to.equal("buy followers");
    });

    it("returns the open report instead of filing a duplicate", async function () {
      let createCalled = false;
      stub("findActiveUser", async (id: string) => ({ id }));
      stub("findOpenReport", async () => ({ id: "existing", status: ReportStatus.OPEN }));
      stub("createReport", async () => (createCalled = true));

      const result = await ModerationSvc.submitReport({ ...base, targetType: ReportTargetType.USER });

      expect(result.created).to.equal(false);
      expect(result.report.id).to.equal("existing");
      expect(createCalled).to.equal(false);
    });

    it("404s for a message that does not exist", async function () {
      stub("findMessageAuthorId", async () => null);
      await expectRejects(
        ModerationSvc.submitReport({ ...base, targetType: ReportTargetType.MESSAGE }),
        404,
      );
    });

    it("refuses to report your own message", async function () {
      stub("findMessageAuthorId", async () => "reporter");
      await expectRejects(
        ModerationSvc.submitReport({ ...base, targetType: ReportTargetType.MESSAGE }),
        400,
      );
    });
  });
});
