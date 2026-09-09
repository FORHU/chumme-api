import { SportEventStatus } from "@prisma/client";
import SportRepo from "../repositories/sport.repository";
import logger from "../utils/logger";

/**
 * Team rooms and the match messages posted into them.
 *
 * A team room is an ordinary ChummeTopicCategory — the same thing Circles use —
 * so it inherits chat, voice notes, threading and reactions for free. Nothing
 * here is sports-specific except how the room gets created and what gets
 * auto-posted into it.
 */

/**
 * Author for auto-posted messages. `RoomMessage.authorId` is a required FK to
 * User, so system messages still need a real row — there is no null author.
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
   * Gives every eligible team a room. Idempotent — teams already linked are not
   * returned by the query, so re-running is safe and cheap.
   */
  static async provisionMissingRooms(): Promise<{
    created: number;
    skipped: number;
  }> {
    const teams = await SportRepo.findTeamsNeedingRooms();
    let created = 0;
    let skipped = 0;

    for (const team of teams) {
      const subCategoryId = team.league.chummeSubCategoryId;
      if (!subCategoryId) {
        skipped++;
        continue;
      }

      try {
        const room = await SportRepo.createTeamRoom({
          teamId: team.id,
          chummeSubCategoryId: subCategoryId,
          name: team.displayName,
          note: `${team.league.name} · fan room`,
          // What Circle search matches on, so people can find the room by any
          // of the names the club is known by.
          discoveryKeywords: [
            ...new Set([team.displayName, team.name, team.abbreviation]),
          ].filter(Boolean),
        });
        created++;
        logger.info(`[SportRoom] Provisioned room "${room.name}" for ${team.displayName}`);
      } catch (error: any) {
        skipped++;
        logger.error(
          `[SportRoom] Could not provision room for ${team.displayName}: ${error?.message ?? error}`,
        );
      }
    }

    if (teams.length > 0) {
      logger.info(`[SportRoom] Provisioning done — ${created} created, ${skipped} skipped`);
    }

    return { created, skipped };
  }

  /**
   * Posts a match update into both teams' rooms.
   *
   * Silently does nothing when there is no bot account or neither team has a
   * room yet — an unprovisioned league should not fill the logs on every tick.
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

    const rooms = await SportRepo.findRoomsForEvent(params.eventId);
    if (rooms.length === 0) return 0;

    let posted = 0;
    for (const room of rooms) {
      try {
        await SportRepo.createSystemMessage({
          chummeTopicCategoryId: room.chummeTopicCategoryId,
          sportEventId: params.eventId,
          authorId: SYSTEM_AUTHOR_ID,
          content: text,
        });
        posted++;
      } catch (error: any) {
        logger.warn(
          `[SportRoom] Failed to post to ${room.teamName}: ${error?.message ?? error}`,
        );
      }
    }

    return posted;
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
          if (from === SportEventStatus.HALFTIME) return "Second half under way";
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
