import { SportEventStatus } from "@prisma/client";
import SportRepo from "../repositories/sport.repository";
import logger from "../utils/logger";
import {
  EspnCompetitor,
  EspnEvent,
  fetchScoreboard,
  toEspnDateRange,
} from "../utils/espn.util";

/**
 * Pulls fixtures and live scores from ESPN into SportTeam / SportEvent.
 *
 * One scoreboard request per league per sync — see the host note in
 * `espn.util.ts` for why that is possible at all.
 */

/**
 * ESPN's status strings are per-sport and open-ended: soccer emits
 * STATUS_FULL_TIME where basketball emits STATUS_FINAL, and new values appear
 * without notice. Unknown values must degrade, never throw — a poller that
 * crashes on an unrecognised string takes the whole matchday down.
 */
const STATUS_MAP: Record<string, SportEventStatus> = {
  STATUS_SCHEDULED: SportEventStatus.SCHEDULED,
  STATUS_PRE: SportEventStatus.SCHEDULED,

  STATUS_IN_PROGRESS: SportEventStatus.IN_PROGRESS,
  STATUS_FIRST_HALF: SportEventStatus.IN_PROGRESS,
  STATUS_SECOND_HALF: SportEventStatus.IN_PROGRESS,
  STATUS_EXTRA_TIME: SportEventStatus.IN_PROGRESS,
  STATUS_SHOOTOUT: SportEventStatus.IN_PROGRESS,
  STATUS_END_PERIOD: SportEventStatus.IN_PROGRESS,

  STATUS_HALFTIME: SportEventStatus.HALFTIME,

  STATUS_FINAL: SportEventStatus.FINAL,
  STATUS_FULL_TIME: SportEventStatus.FINAL,
  STATUS_FINAL_PEN: SportEventStatus.FINAL,
  STATUS_FINAL_AET: SportEventStatus.FINAL,

  STATUS_POSTPONED: SportEventStatus.POSTPONED,
  STATUS_CANCELED: SportEventStatus.CANCELLED,
  STATUS_CANCELLED: SportEventStatus.CANCELLED,
  STATUS_ABANDONED: SportEventStatus.CANCELLED,
  STATUS_DELAYED: SportEventStatus.DELAYED,
  STATUS_RAIN_DELAY: SportEventStatus.DELAYED,
  STATUS_SUSPENDED: SportEventStatus.DELAYED,
};

/** Values already reported unknown, so the log warns once rather than per poll. */
const warnedStatuses = new Set<string>();

export function mapEspnStatus(raw?: string): SportEventStatus {
  if (!raw) return SportEventStatus.SCHEDULED;

  const mapped = STATUS_MAP[raw.toUpperCase()];
  if (mapped) return mapped;

  if (!warnedStatuses.has(raw)) {
    warnedStatuses.add(raw);
    logger.warn(`[SportIngestion] Unmapped ESPN status "${raw}" — treating as SCHEDULED`);
  }
  return SportEventStatus.SCHEDULED;
}

function toScore(value: EspnCompetitor["score"]): number {
  const n = typeof value === "string" ? parseInt(value, 10) : value;
  return Number.isFinite(n) ? Number(n) : 0;
}

/** Normalised ESPN event — the shape both the ingester and the live proxy consume. */
export interface ExtractedFixture {
  espnId: string;
  gameDate: Date;
  status: SportEventStatus;
  statusDetail: string | null;
  period: number | null;
  clock: string | null;
  homeScore: number;
  awayScore: number;
  venue: string | null;
  broadcast: string | null;
  spread: string | null;
  overUnder: string | null;
  name: string | null;
  home: EspnCompetitor;
  away: EspnCompetitor;
}

/**
 * Pulls the fields we persist out of one ESPN event.
 *
 * Single source of truth for ESPN's response shape, which is the volatile part
 * of this integration — the ingester and the live proxy must never drift in how
 * they read it. Returns null for a fixture missing anything required, so a
 * caller can skip it rather than invent placeholder data that later reads as
 * real.
 */
export function extractFixture(event: EspnEvent): ExtractedFixture | null {
  const competition = event.competitions?.[0];
  const competitors = competition?.competitors ?? [];

  const home = competitors.find((c) => c.homeAway === "home");
  const away = competitors.find((c) => c.homeAway === "away");

  if (!event.id || !event.date || !home?.team?.id || !away?.team?.id) return null;

  const gameDate = new Date(event.date);
  if (Number.isNaN(gameDate.getTime())) return null;

  const status = event.status ?? competition?.status;

  return {
    espnId: event.id,
    gameDate,
    status: mapEspnStatus(status?.type?.name),
    statusDetail: status?.type?.detail ?? status?.type?.shortDetail ?? null,
    period: status?.period ?? null,
    clock: status?.displayClock ?? null,
    homeScore: toScore(home.score),
    awayScore: toScore(away.score),
    venue: competition?.venue?.fullName ?? null,
    broadcast: competition?.broadcasts?.[0]?.names?.join(", ") || null,
    spread: competition?.odds?.[0]?.details ?? null,
    overUnder:
      competition?.odds?.[0]?.overUnder != null
        ? String(competition.odds[0].overUnder)
        : null,
    name: event.name ?? null,
    home,
    away,
  };
}

export interface LeagueSyncResult {
  league: string;
  events: number;
  skipped: number;
  /** Fixtures whose score or status moved — what a system message reacts to. */
  changed: {
    eventId: string;
    espnId: string;
    from: SportEventStatus;
    to: SportEventStatus;
    score: string;
    homeTeam: string;
    awayTeam: string;
    clock: string | null;
  }[];
}

export default class SportIngestionSvc {
  /**
   * Syncs one league's scoreboard.
   *
   * `dates` is optional: omit it for a live poll (ESPN returns its current
   * window), pass a range to backfill or to warm the fixtures screen.
   */
  static async syncLeague(
    league: {
      id: string;
      name: string;
      espnSlug: string;
      espnSport: string;
    },
    dates?: string,
  ): Promise<LeagueSyncResult> {
    const result: LeagueSyncResult = {
      league: league.name,
      events: 0,
      skipped: 0,
      changed: [],
    };

    const board = await fetchScoreboard({
      espnSport: league.espnSport,
      espnSlug: league.espnSlug,
      dates,
    });

    if (!board?.events?.length) return result;

    for (const event of board.events) {
      try {
        const synced = await this.syncEvent(league.id, event);
        if (synced === null) {
          result.skipped++;
        } else {
          result.events++;
          if (synced.changed) result.changed.push(synced.changed);
        }
      } catch (error: any) {
        // One malformed fixture must not abort the rest of the league.
        result.skipped++;
        logger.warn(
          `[SportIngestion] ${league.name} event ${event?.id}: ${error?.message ?? error}`,
        );
      }
    }

    return result;
  }

  private static async syncEvent(leagueId: string, event: EspnEvent) {
    const fixture = extractFixture(event);
    if (!fixture) return null;

    const [homeTeam, awayTeam] = await Promise.all([
      this.upsertTeamFrom(leagueId, fixture.home),
      this.upsertTeamFrom(leagueId, fixture.away),
    ]);

    // Read before write, so a score or status transition can be detected and
    // handed to whatever posts "GOAL — 1-0, 34'" into the team rooms.
    const existing = await SportRepo.findFixtureByEspnId(fixture.espnId);

    const saved = await SportRepo.upsertEvent({
      espnId: fixture.espnId,
      leagueId,
      homeTeamId: homeTeam.id,
      awayTeamId: awayTeam.id,
      homeScore: fixture.homeScore,
      awayScore: fixture.awayScore,
      status: fixture.status,
      statusDetail: fixture.statusDetail,
      period: fixture.period,
      clock: fixture.clock,
      gameDate: fixture.gameDate,
      venue: fixture.venue,
      broadcast: fixture.broadcast,
      spread: fixture.spread,
      overUnder: fixture.overUnder,
      metaData: { name: fixture.name, shortName: event.shortName ?? null },
    });

    const moved =
      existing &&
      (existing.status !== fixture.status ||
        existing.homeScore !== fixture.homeScore ||
        existing.awayScore !== fixture.awayScore);

    return {
      changed: moved
        ? {
            eventId: saved.id,
            espnId: fixture.espnId,
            from: existing.status,
            to: fixture.status,
            score: `${fixture.homeScore}-${fixture.awayScore}`,
            homeTeam: homeTeam.displayName,
            awayTeam: awayTeam.displayName,
            clock: fixture.clock,
          }
        : undefined,
    };
  }

  private static upsertTeamFrom(leagueId: string, competitor: EspnCompetitor) {
    const team = competitor.team!;
    // ESPN is inconsistent about which name fields it populates per sport, so
    // each falls back to the next rather than writing an empty string.
    const displayName =
      team.displayName || team.name || team.shortDisplayName || `Team ${team.id}`;

    return SportRepo.upsertTeam({
      espnId: team.id!,
      leagueId,
      name: team.name || displayName,
      displayName,
      abbreviation: team.abbreviation || displayName.slice(0, 3).toUpperCase(),
      logoUrl: team.logo ?? null,
      color: team.color ?? null,
      alternateColor: team.alternateColor ?? null,
      venue: team.venue?.fullName ?? null,
    });
  }

  /** Every active league, one scoreboard call each. Used by the poller. */
  static async syncAllActiveLeagues(dates?: string): Promise<LeagueSyncResult[]> {
    const leagues = await SportRepo.findLeaguesForPolling();
    const results: LeagueSyncResult[] = [];

    for (const league of leagues) {
      results.push(await this.syncLeague(league, dates));
    }

    return results;
  }

  /**
   * Pulls a forward window so the fixtures screen has something to show before
   * any match goes live. `days` is capped by ESPN's own range handling.
   */
  static async backfillUpcoming(days = 14): Promise<LeagueSyncResult[]> {
    const from = new Date();
    const to = new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
    return this.syncAllActiveLeagues(toEspnDateRange(from, to));
  }
}
