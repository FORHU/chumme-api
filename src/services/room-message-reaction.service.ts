import { prisma } from "../utils/prisma";
import RoomUserChatRepo from "../repositories/room-user-chat.repository";
import CacheUtil from "../utils/cache.util";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "../utils/error.util";

/** One emoji on one message, as every client renders it. */
export type ReactionSummary = {
  emoji: string;
  count: number;
  userIds: string[];
};

/** Different emojis one person can leave on one message. */
export const MAX_REACTIONS_PER_USER = 3;

/** Different emojis one message can carry, across everyone. */
export const MAX_DISTINCT_REACTIONS = 20;

const PICTOGRAPHIC = /\p{Extended_Pictographic}/u;
const REGIONAL_INDICATOR = /\p{Regional_Indicator}/u;
// Pictographs plus what builds sequences out of them: skin tones, ZWJ, VS-16,
// keycaps, tag letters, regional indicators.
const EMOJI_ONLY =
  /^(?:\p{Extended_Pictographic}|\p{Emoji_Component}|‍|️|⃣|[\u{E0020}-\u{E007F}])+$/u;

/**
 * Whether [emoji] is a single emoji (sequences such as 👍🏽, 👨‍👩‍👧 or 🇰🇷 included)
 * and nothing else. Reactions are stored as free text, so this is what keeps
 * words and markup out of them.
 */
export const isReactionEmoji = (emoji: unknown): emoji is string => {
  if (typeof emoji !== "string") return false;
  // The longest real sequences (family ZWJ, subdivision flags) fit in 16.
  if (emoji.length === 0 || emoji.length > 16) return false;
  if (!EMOJI_ONLY.test(emoji)) return false;
  return (
    PICTOGRAPHIC.test(emoji) ||
    REGIONAL_INDICATOR.test(emoji) ||
    emoji.includes("⃣") // keycaps: 1️⃣ #️⃣
  );
};

/** Rows → one entry per emoji, in the order each emoji first appeared. */
export const summarizeReactions = (
  rows: Array<{ emoji: string; userId: string; createdAt?: Date }>,
): ReactionSummary[] => {
  const sorted = [...rows].sort(
    (a, b) => (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0),
  );
  const byEmoji = new Map<string, ReactionSummary>();
  for (const row of sorted) {
    const entry = byEmoji.get(row.emoji) ?? {
      emoji: row.emoji,
      count: 0,
      userIds: [],
    };
    if (!entry.userIds.includes(row.userId)) {
      entry.userIds.push(row.userId);
      entry.count++;
    }
    byEmoji.set(row.emoji, entry);
  }
  return [...byEmoji.values()];
};

export default class RoomMessageReactionSvc {
  /**
   * Adds [emoji] from [userId] to a Circle message, or takes it off if it was
   * already there. Returns the message's reactions afterwards.
   */
  static async toggle(data: {
    roomId: string;
    messageId: string;
    userId: string;
    emoji: unknown;
  }): Promise<{ added: boolean; reactions: ReactionSummary[] }> {
    const { roomId, messageId, userId, emoji } = data;
    if (!isReactionEmoji(emoji)) {
      throw new BadRequestError("Reactions must be a single emoji");
    }

    const message = await prisma.roomMessage.findUnique({
      where: { id: messageId },
      select: { chummeSubCategoryId: true },
    });
    if (!message || message.chummeSubCategoryId !== roomId) {
      throw new NotFoundError("Message not found in this room");
    }
    if (!(await RoomUserChatRepo.isMember(userId, roomId))) {
      throw new ForbiddenError(
        "Access denied: You must be a member of this room to react",
      );
    }

    // Removing first makes a double tap from two devices settle on "off"
    // instead of failing on the unique index.
    const removed = await prisma.roomMessageReaction.deleteMany({
      where: { messageId, userId, emoji },
    });

    let added = false;
    if (removed.count === 0) {
      const existing = await prisma.roomMessageReaction.findMany({
        where: { messageId },
        select: { emoji: true, userId: true },
      });
      const mine = existing.filter((r) => r.userId === userId).length;
      if (mine >= MAX_REACTIONS_PER_USER) {
        throw new BadRequestError(
          `You can add up to ${MAX_REACTIONS_PER_USER} reactions to a message`,
        );
      }
      const distinct = new Set(existing.map((r) => r.emoji));
      if (!distinct.has(emoji) && distinct.size >= MAX_DISTINCT_REACTIONS) {
        throw new BadRequestError("This message has too many reactions");
      }
      try {
        await prisma.roomMessageReaction.create({
          data: { messageId, userId, emoji },
        });
        added = true;
      } catch (err: any) {
        // P2002: the same reaction landed from another request meanwhile.
        if (err?.code !== "P2002") throw err;
        added = true;
      }
    }

    await CacheUtil.delByPattern(`messages:room:${roomId}:*`);
    return { added, reactions: await this.summaryFor(messageId) };
  }

  static async summaryFor(messageId: string): Promise<ReactionSummary[]> {
    const rows = await prisma.roomMessageReaction.findMany({
      where: { messageId },
      select: { emoji: true, userId: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    return summarizeReactions(rows);
  }
}
