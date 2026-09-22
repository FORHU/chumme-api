import RoomUserChatRepo from "../repositories/room-user-chat.repository";
import CacheUtil from "../utils/cache.util";
import { prisma } from "../utils/prisma";
import {
  languageName,
  translateText,
} from "../utils/translation/translate-text.util";

/**
 * "Translate" under a chat message, for Circle rooms and sports match rooms.
 *
 * Text messages only for now — voice notes are refused, not transcribed.
 * On demand, per viewer: nothing is translated until someone taps the button,
 * so a busy match room costs nothing for messages no one asks about.
 */

export type TranslatableRoom = "circle" | "sport";

export class MessageTranslationError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export interface MessageTranslation {
  messageId: string;
  /** Normalised target code, e.g. "en", "ko", "zh-Hant". */
  targetLanguage: string;
  translation: string;
  /** English name of the detected source language, e.g. "Korean". */
  sourceLanguage: string | null;
  /** The message was already in the target language; `translation` is then just the original. */
  sameLanguage: boolean;
}

interface LoadedMessage {
  id: string;
  roomId: string;
  text: string | null;
  isVoice: boolean;
}

/** Messages are never edited, so a translation stays valid; the TTL only bounds Redis. */
const CACHE_TTL_SECONDS = 7 * 24 * 60 * 60;

// Two viewers tapping Translate on the same message at once should make one
// upstream call, not two. Per process — good enough for a single API box.
const inFlight = new Map<string, Promise<MessageTranslation>>();

/** Circle `content` is JSON; in practice a plain string. */
const textFromContent = (content: unknown): string | null => {
  if (typeof content === "string") return content;
  if (content && typeof content === "object" && !Array.isArray(content)) {
    const text = (content as Record<string, unknown>).text;
    return typeof text === "string" ? text : null;
  }
  return null;
};

export default class MessageTranslationSvc {
  static async translate(params: {
    room: TranslatableRoom;
    messageId: string;
    userId: string;
    targetLanguage: string;
  }): Promise<MessageTranslation> {
    const message = await this.loadMessage(params.room, params.messageId);
    if (!message) throw new MessageTranslationError("Message not found", 404);

    // Before the cache read: a cached translation must not become a way for a
    // non-member to read a Circle room. Match rooms are open to everyone.
    if (params.room === "circle") {
      const isMember = await RoomUserChatRepo.isMember(
        params.userId,
        message.roomId,
      );
      if (!isMember) {
        throw new MessageTranslationError(
          "You must be a member of this room to translate its messages",
          403,
        );
      }
    }

    // A Circle voice note's `content` is the placeholder "Voice Message" —
    // translating that would look like it worked while saying nothing.
    if (message.isVoice) {
      throw new MessageTranslationError(
        "Voice notes can't be translated yet",
        422,
      );
    }

    const cacheKey = `translation:${params.room}:${message.id}:${params.targetLanguage}`;
    const cached = await CacheUtil.get<MessageTranslation>(cacheKey);
    if (cached) return cached;

    const pending = inFlight.get(cacheKey);
    if (pending) return pending;

    const work = this.produce(message, params.targetLanguage)
      .then(async (result) => {
        await CacheUtil.set(cacheKey, result, CACHE_TTL_SECONDS);
        return result;
      })
      .finally(() => inFlight.delete(cacheKey));

    inFlight.set(cacheKey, work);
    return work;
  }

  private static async loadMessage(
    room: TranslatableRoom,
    id: string,
  ): Promise<LoadedMessage | null> {
    if (room === "circle") {
      const row = await prisma.roomMessage.findUnique({
        where: { id },
        select: {
          id: true,
          chummeSubCategoryId: true,
          content: true,
          voiceMessageId: true,
        },
      });
      return row
        ? {
            id: row.id,
            roomId: row.chummeSubCategoryId,
            text: textFromContent(row.content),
            isVoice: !!row.voiceMessageId,
          }
        : null;
    }

    const row = await prisma.sportRoomMessage.findUnique({
      where: { id },
      select: {
        id: true,
        sportEventId: true,
        content: true,
        voiceMessageId: true,
      },
    });
    return row
      ? {
          id: row.id,
          roomId: row.sportEventId,
          text: row.content,
          isVoice: !!row.voiceMessageId,
        }
      : null;
  }

  private static async produce(
    message: LoadedMessage,
    targetLanguage: string,
  ): Promise<MessageTranslation> {
    const source = (message.text ?? "").trim();
    if (!source) {
      throw new MessageTranslationError(
        "This message has no text to translate",
        422,
      );
    }

    let result;
    try {
      result = await translateText(source, targetLanguage);
    } catch (error: any) {
      throw new MessageTranslationError(error.message, 502);
    }

    const targetName = languageName(targetLanguage)?.toLowerCase();
    const sameLanguage =
      result.text.trim() === source ||
      (!!targetName && result.sourceLanguage?.toLowerCase() === targetName);

    return {
      messageId: message.id,
      targetLanguage,
      translation: result.text,
      sourceLanguage: result.sourceLanguage,
      sameLanguage,
    };
  }
}
