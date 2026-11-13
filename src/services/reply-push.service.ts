import ReplyPushRepo from "../repositories/reply-push.repository";
import logger from "../utils/logger";
import PushSvc from "./push.service";

/** Longest message text shown in the alert; FCM itself allows far more. */
const PREVIEW_MAX = 120;

/** `data.type` the app routes on: opens the Circle chat. */
export const ROOM_REPLY_PUSH_TYPE = "room_reply";

export interface ReplyMessage {
  id: string;
  authorId: string;
  chummeSubCategoryId: string;
  parentMessageId?: string | null;
  content?: unknown;
  voiceMessageId?: string | null;
  videoMessageId?: string | null;
  attachment?: unknown;
}

/** What the alert says the reply was: its text, or the kind of media. */
export function replyPreview(message: ReplyMessage): string {
  if (typeof message.content === "string" && message.content.trim()) {
    const text = message.content.trim().replace(/\s+/g, " ");
    return text.length > PREVIEW_MAX
      ? `${text.slice(0, PREVIEW_MAX - 1)}…`
      : text;
  }
  if (message.voiceMessageId) return "Sent a voice message";
  if (message.videoMessageId) return "Sent a video";
  const kind = (message.attachment as { kind?: unknown } | null)?.kind;
  if (kind === "sticker") return "Sent a sticker";
  if (message.attachment) return "Sent a GIF";
  return "Replied to your message";
}

export default class ReplyPushSvc {
  /**
   * Tells a Circle message's author that someone replied to it. Skips
   * self-replies, muted Circles and blocked pairs. Never throws: call it
   * without awaiting, after the reply is saved.
   */
  static async notify(message: ReplyMessage): Promise<void> {
    if (!message.parentMessageId) return;
    try {
      const target = await ReplyPushRepo.findTarget(
        message.parentMessageId,
        message.authorId,
      );
      if (!target || target.muted || target.blocked) return;

      await PushSvc.sendToUsers([target.recipientId], {
        title: target.roomName,
        body: `${target.replierName} replied: ${replyPreview(message)}`,
        data: {
          type: ROOM_REPLY_PUSH_TYPE,
          roomId: message.chummeSubCategoryId,
          roomName: target.roomName,
          messageId: message.id,
        },
      });
    } catch (error) {
      logger.error("[ReplyPushSvc] notify failed:", error);
    }
  }
}
