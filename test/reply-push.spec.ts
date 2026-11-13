import { expect } from "chai";
import { afterEach, describe, it } from "mocha";
import ReplyPushRepo from "../src/repositories/reply-push.repository";
import PushSvc from "../src/services/push.service";
import ReplyPushSvc, {
  ROOM_REPLY_PUSH_TYPE,
  replyPreview,
} from "../src/services/reply-push.service";

// Offline: the repo lookup and the sender are both stubbed.
const originalFind = ReplyPushRepo.findTarget;
const originalSend = PushSvc.sendToUsers;

afterEach(() => {
  ReplyPushRepo.findTarget = originalFind;
  PushSvc.sendToUsers = originalSend;
});

const reply = {
  id: "m2",
  authorId: "replier",
  chummeSubCategoryId: "room-1",
  parentMessageId: "m1",
  content: "see you there",
};

const target = {
  recipientId: "author",
  roomName: "BTS Army",
  replierName: "Mina",
  muted: false,
  blocked: false,
};

function capture() {
  const sent: any[] = [];
  PushSvc.sendToUsers = (async (ids: string[], msg: any) => {
    sent.push({ ids, msg });
    return { sent: 1, failed: 0, pruned: 0, skipped: 0 };
  }) as any;
  return sent;
}

describe("ReplyPushSvc.notify", function () {
  it("pushes the parent's author with a link back to the Circle", async function () {
    ReplyPushRepo.findTarget = async () => target;
    const sent = capture();

    await ReplyPushSvc.notify(reply);

    expect(sent).to.have.length(1);
    expect(sent[0].ids).to.deep.equal(["author"]);
    expect(sent[0].msg).to.deep.equal({
      title: "BTS Army",
      body: "Mina replied: see you there",
      data: {
        type: ROOM_REPLY_PUSH_TYPE,
        roomId: "room-1",
        roomName: "BTS Army",
        messageId: "m2",
      },
    });
  });

  for (const [label, override] of [
    ["muted the Circle", { muted: true }],
    ["blocked", { blocked: true }],
  ] as const) {
    it(`stays quiet when the author ${label}`, async function () {
      ReplyPushRepo.findTarget = async () => ({ ...target, ...override });
      const sent = capture();
      await ReplyPushSvc.notify(reply);
      expect(sent).to.have.length(0);
    });
  }

  it("stays quiet for self-replies and missing parents", async function () {
    ReplyPushRepo.findTarget = async () => null;
    const sent = capture();
    await ReplyPushSvc.notify(reply);
    expect(sent).to.have.length(0);
  });

  it("does nothing for a message that isn't a reply", async function () {
    let looked = false;
    ReplyPushRepo.findTarget = async () => {
      looked = true;
      return target;
    };
    await ReplyPushSvc.notify({ ...reply, parentMessageId: null });
    expect(looked).to.equal(false);
  });

  it("never throws", async function () {
    ReplyPushRepo.findTarget = async () => {
      throw new Error("db down");
    };
    await ReplyPushSvc.notify(reply);
  });
});

describe("replyPreview", function () {
  const base = { ...reply, content: undefined };

  it("collapses whitespace and trims long text", function () {
    expect(replyPreview({ ...base, content: "  hi \n\n there " })).to.equal(
      "hi there",
    );
    const long = replyPreview({ ...base, content: "a".repeat(300) });
    expect(long).to.have.length(120);
    expect(long.endsWith("…")).to.equal(true);
  });

  it("names the media when there is no text", function () {
    expect(replyPreview({ ...base, voiceMessageId: "f" })).to.equal(
      "Sent a voice message",
    );
    expect(replyPreview({ ...base, videoMessageId: "f" })).to.equal(
      "Sent a video",
    );
    expect(replyPreview({ ...base, attachment: { kind: "sticker" } })).to.equal(
      "Sent a sticker",
    );
    expect(replyPreview({ ...base, attachment: { kind: "gif" } })).to.equal(
      "Sent a GIF",
    );
    expect(replyPreview(base)).to.equal("Replied to your message");
  });
});
