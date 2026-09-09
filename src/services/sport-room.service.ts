import { SportEventStatus } from "@prisma/client";
import SportRepo from "../repositories/sport.repository";
import logger from "../utils/logger";

/**
 * Auto-posted match announcements.
 *
 * A match room needs no provisioning: it is identified by its fixture, so every
 * ingested SportEvent is already addressable. Sports chat lives in
 * `SportRoomMessage`, entirely separate from Circle chat — there is no
 * sub-category or topic-category involved anywhere in this file.
 */

/**
 * Author for auto-posted messages. `SportRoomMessage.authorId` is a required FK
 * to User, so system messages still need a real row — there is no null author.
 * Set SPORT_BOT_USER_ID to a dedicated account; without it, auto-posting is
 * skipped rather than attributed to whoever happens to be first in the table.
 */
const SYSTEM_AUTHOR_ID = process.env.SPORT_BOT_USER_ID;

/**
 * Sports where a score change is rare enough to be worth interrupting a room
 * for. Basketball scores every few seconds — announcing each one would make the
 * chat unusable, so score messages are limited to these and everything else
 * gets status changes only.
 */
const SCORE_MESSAGE_SPORTS = new Set(["soccer", "hockey"]);

export default class SportRoomSvc {
  /**
   * Posts a match update into the fixture's match room.
   *
   * One write, not two: both fanbases share a single room per fixture, so a
   * goal is announced once and everyone sees it. (The earlier team-room design
   * posted the same text into two rooms — that duplicated every announcement
   * for anyone following both clubs.)
   *
   * Silently does nothing without a bot account — an unconfigured deployment
   * should not fill the logs on every poll.
   */
  static async postMatchUpdate(params: {
    eventId: string;
    espnSport: string;
    from: SportEventStatus;
    to: SportEventStatus;
    homeTeam: string;
    awayTeam: string;
    score: string;
    clock: string | null;
  }): Promise<number> {
    if (!SYSTEM_AUTHOR_ID) return 0;

    const text = this.composeMessage(params);
    if (!text) return 0;

    try {
      await SportRepo.createSystemMessage({
        sportEventId: params.eventId,
        authorId: SYSTEM_AUTHOR_ID,
        content: text,
      });
      return 1;
    } catch (error: any) {
      logger.warn(
        `[SportRoom] Failed to post match update for ${params.eventId}: ${error?.message ?? error}`,
      );
      return 0;
    }
  }

  /**
   * The message text, or null when this transition is not worth announcing.
   *
   * Deliberately conservative: a room that pings constantly gets muted, and a
   * muted room is worth nothing. Only kickoff, half time, full time and — in
   * low-scoring sports — goals.
   */
  private static composeMessage(params: {
    espnSport: string;
    from: SportEventStatus;
    to: SportEventStatus;
    homeTeam: string;
    awayTeam: string;
    score: string;
    clock: string | null;
  }): string | null {
    const { from, to, score, clock, homeTeam, awayTeam } = params;
    const minute = clock?.trim() ? ` ${clock.trim()}` : "";

    if (to !== from) {
      switch (to) {
        case SportEventStatus.IN_PROGRESS:
          // Second-half restart reuses IN_PROGRESS; only the true kickoff comes
          // from a scheduled state.
          if (from === SportEventStatus.SCHEDULED) {
            return `Kick off — ${homeTeam} vs ${awayTeam}`;
          }
          if (from === SportEventStatus.HALFTIME)
            return "Second half under way";
          return null;
        case SportEventStatus.HALFTIME:
          return `Half time — ${score}`;
        case SportEventStatus.FINAL:
          return `Full time — ${homeTeam} ${score} ${awayTeam}`;
        case SportEventStatus.POSTPONED:
          return "Match postponed";
        case SportEventStatus.CANCELLED:
          return "Match cancelled";
        case SportEventStatus.DELAYED:
          return "Match delayed";
        default:
          return null;
      }
    }

    // Same status, so the caller only reached here because the score moved.
    if (!SCORE_MESSAGE_SPORTS.has(params.espnSport)) return null;
    return `GOAL — ${score}${minute}`;
  }
}
