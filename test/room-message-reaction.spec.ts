import { expect } from "chai";
import { describe, it } from "mocha";
import RoomMessageReactionSvc, {
  isReactionEmoji,
  summarizeReactions,
} from "../src/services/room-message-reaction.service";

// Offline: only the parts that never reach the database.
describe("RoomMessageReactionSvc", function () {
  describe("isReactionEmoji", function () {
    it("accepts single emojis and emoji sequences", function () {
      for (const emoji of [
        "❤️",
        "😂",
        "🔥",
        "👍🏽",
        "👨‍👩‍👧",
        "🇰🇷",
        "1️⃣",
        "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
      ]) {
        expect(isReactionEmoji(emoji), emoji).to.equal(true);
      }
    });

    it("rejects text, markup, empty and over-long values", function () {
      for (const value of [
        "",
        "lol",
        "❤️ nice",
        "<b>😂</b>",
        "1",
        "#",
        "🔥".repeat(9),
        null,
        42,
        { emoji: "🔥" },
      ]) {
        expect(isReactionEmoji(value), String(value)).to.equal(false);
      }
    });
  });

  describe("summarizeReactions", function () {
    it("groups by emoji in first-seen order and counts each user once", function () {
      const at = (s: number) => new Date(2026, 0, 1, 0, 0, s);
      const summary = summarizeReactions([
        { emoji: "🔥", userId: "b", createdAt: at(3) },
        { emoji: "❤️", userId: "a", createdAt: at(1) },
        { emoji: "🔥", userId: "a", createdAt: at(2) },
        { emoji: "❤️", userId: "a", createdAt: at(4) },
      ]);
      expect(summary).to.deep.equal([
        { emoji: "❤️", count: 1, userIds: ["a"] },
        { emoji: "🔥", count: 2, userIds: ["a", "b"] },
      ]);
    });

    it("is empty for no rows", function () {
      expect(summarizeReactions([])).to.deep.equal([]);
    });
  });

  it("refuses a non-emoji before touching the database", async function () {
    let error: any;
    try {
      await RoomMessageReactionSvc.toggle({
        roomId: "r1",
        messageId: "m1",
        userId: "u1",
        emoji: "hello",
      });
    } catch (err) {
      error = err;
    }
    expect(error?.statusCode).to.equal(400);
  });
});
