import SportMessageRepo from "../repositories/sport-message.repository";

/**
 * Match-room chat.
 *
 * Deliberately thinner than `RoomMessageSvc`: a match room has no membership to
 * check, because it is open to anyone who can see the fixture. Picking a side
 * is not joining — it is a property of each message, so a user can watch a room
 * before committing to one.
 */

const MAX_PAGE = 100;
const DEFAULT_PAGE = 50;

/** Long enough for a chant, short enough not to be a monologue. */
const MAX_CONTENT_LENGTH = 1000;

export default class SportMessageSvc {
  static async getMessages(params: {
    sportEventId: string;
    limit?: number;
    before?: string;
  }) {
    const limit = Math.min(params.limit ?? DEFAULT_PAGE, MAX_PAGE);

    const items = await SportMessageRepo.findByEvent({
      sportEventId: params.sportEventId,
      limit: limit + 1, // one extra to detect a further page without a count query
      before: params.before,
    });

    const hasMore = items.length > limit;
    const page = hasMore ? items.slice(0, limit) : items;

    return {
      // Newest first, matching how the client renders an inverted list.
      items: page,
      hasMore,
      nextCursor: hasMore ? page[page.length - 1].id : null,
    };
  }

  /**
   * Posts a message, having verified the claimed side is actually playing.
   *
   * That check is the important one: `sportTeamId` arrives from the client, and
   * without validation someone could post to a fixture supporting a team not in
   * it — a message the two-column UI has no column for, and an obvious way to
   * impersonate the opposing end.
   */
  static async sendMessage(data: {
    sportEventId: string;
    sportTeamId: string;
    authorId: string;
    content?: string;
    voiceMessageId?: string;
    duration?: number;
    waveform?: number[];
  }) {
    const text = data.content?.trim();

    // A message is text or voice. Neither means an empty row nobody can read.
    if (!text && !data.voiceMessageId) {
      throw new Error("A message needs either text or a voice note");
    }
    if (text && text.length > MAX_CONTENT_LENGTH) {
      throw new Error(
        `Message is too long (max ${MAX_CONTENT_LENGTH} characters)`,
      );
    }

    const event = await SportMessageRepo.findEventSides(data.sportEventId);
    if (!event) throw new Error("Match not found");

    if (
      data.sportTeamId !== event.homeTeamId &&
      data.sportTeamId !== event.awayTeamId
    ) {
      throw new Error("That team is not playing in this match");
    }

    if (data.voiceMessageId && (data.duration || data.waveform?.length)) {
      await SportMessageRepo.attachVoiceMetadata(data.voiceMessageId, {
        duration: data.duration,
        waveform: data.waveform,
      });
    }

    return SportMessageRepo.create({
      sportEventId: data.sportEventId,
      sportTeamId: data.sportTeamId,
      authorId: data.authorId,
      // A voice note carries no text; storing an empty string instead of NULL
      // would make "has text" checks lie.
      content: text || null,
      voiceMessageId: data.voiceMessageId,
    });
  }

  /** Authors can remove their own messages. System messages have no author to match. */
  static async deleteMessage(id: string, authorId: string) {
    const deleted = await SportMessageRepo.deleteOwn(id, authorId);
    if (!deleted) {
      throw new Error("Message not found, or it is not yours to delete");
    }
    return { id };
  }
}
