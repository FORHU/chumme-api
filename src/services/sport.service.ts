import SportRepo from "../repositories/sport.repository";
import SportIngestionSvc, { extractFixture } from "./sport-ingestion.service";
import { fetchScoreboard, toEspnDateRange } from "../utils/espn.util";
import CacheUtil from "../utils/cache.util";
import logger from "../utils/logger";

/** A fixture list is a screen, not a report — no one pages past a week of games. */
const MAX_FIXTURES = 200;
const DEFAULT_FIXTURES = 100;

/** Default window when the client sends no bounds: a week ahead. */
const DEFAULT_WINDOW_DAYS = 7;

/**
 * How far back the default window reaches. Kickoff is in the past for a match
 * that is currently being played, so a window starting at `now` would hide
 * exactly the fixtures people most want to talk about.
 */
const DEFAULT_LOOKBACK_HOURS = 4;

/**
 * Short by design. Long enough that a thousand users opening the tab at kickoff
 * is one ESPN request rather than a thousand, short enough that a goal shows up
 * quickly.
 */
const LIVE_CACHE_SECONDS = 25;

/** Leagues change roughly never; re-reading them per request is waste. */
const LEAGUE_CACHE_SECONDS = 300;

type Fixture = Awaited<ReturnType<typeof SportRepo.findFixtures>>[number];

export default class SportSvc {
  static async getLeagues() {
    const cached = await CacheUtil.get<any[]>("sports:leagues");
    if (cached) return cached;

    const leagues = await SportRepo.findLeagues();
    await CacheUtil.set("sports:leagues", leagues, LEAGUE_CACHE_SECONDS);
    return leagues;
  }

  static async getFixtures(params: {
    from?: Date;
    to?: Date;
    leagueId?: string;
    teamId?: string;
    limit?: number;
  }) {
    const now = new Date();

    const from =
      params.from ??
      new Date(now.getTime() - DEFAULT_LOOKBACK_HOURS * 60 * 60 * 1000);
    const to =
      params.to ??
      new Date(from.getTime() + DEFAULT_WINDOW_DAYS * 24 * 60 * 60 * 1000);

    const limit = Math.min(params.limit ?? DEFAULT_FIXTURES, MAX_FIXTURES);

    // Live first: ESPN is the source of truth for scores, and the poller can be
    // up to `pollIntervalSeconds` behind it. `teamId` filtering needs our own
    // ids, which only the database has, so that query stays on the DB path.
    let items: Fixture[] | null = null;
    let source: "live" | "database" = "database";

    if (!params.teamId) {
      items = await this.fixturesFromEspn({ from, to, leagueId: params.leagueId });
      if (items) source = "live";
    }

    if (!items) {
      items = await SportRepo.findFixtures({
        from,
        to,
        leagueId: params.leagueId,
        teamId: params.teamId,
        limit,
      });
    }

    return {
      // Echoed back so the client can tell an empty day from a window it got wrong.
      window: { from: from.toISOString(), to: to.toISOString() },
      // Surfaced deliberately: "database" during an ESPN outage is a degraded
      // state worth being able to see from the outside.
      source,
      count: items.length,
      items: items.slice(0, limit),
    };
  }

  /**
   * Proxies ESPN and dresses the result in our own ids.
   *
   * Returns null — not an empty list — when ESPN is unusable, so the caller can
   * tell "no matches" apart from "could not ask" and fall back to the database.
   */
  private static async fixturesFromEspn(params: {
    from: Date;
    to: Date;
    leagueId?: string;
  }): Promise<Fixture[] | null> {
    try {
      const allLeagues = await SportRepo.findLeaguesForPolling();
      const leagues = params.leagueId
        ? allLeagues.filter((l) => l.id === params.leagueId)
        : allLeagues;

      // No seeded leagues means nothing to ask ESPN about. Fall through to the
      // database rather than reporting an empty live result.
      if (leagues.length === 0) return null;

      const dates = toEspnDateRange(params.from, params.to);
      const boards = await Promise.all(
        leagues.map(async (league) => {
          const key = `sports:board:${league.id}:${dates}`;
          const cached = await CacheUtil.get<any>(key);
          if (cached) return { league, board: cached };

          const board = await fetchScoreboard({
            espnSport: league.espnSport,
            espnSlug: league.espnSlug,
            dates,
          });
          if (board) await CacheUtil.set(key, board, LIVE_CACHE_SECONDS);
          return { league, board };
        }),
      );

      // Every league failing is an ESPN problem, not an empty schedule.
      if (boards.every((b) => !b.board)) return null;

      const extracted: { league: (typeof leagues)[number]; fixture: NonNullable<ReturnType<typeof extractFixture>> }[] = [];
      for (const { league, board } of boards) {
        for (const event of board?.events ?? []) {
          const fixture = extractFixture(event);
          if (fixture) extracted.push({ league, fixture });
        }
      }

      if (extracted.length === 0) return [];

      // Two lookups total, regardless of fixture count — this is what carries
      // `chummeTopicCategoryId` (the room link) onto a proxied payload.
      const [teams, events] = await Promise.all([
        SportRepo.findTeamsByEspnIds([
          ...new Set(
            extracted.flatMap(({ fixture }) => [
              fixture.home.team!.id!,
              fixture.away.team!.id!,
            ]),
          ),
        ]),
        SportRepo.findEventIdsByEspnIds(extracted.map(({ fixture }) => fixture.espnId)),
      ]);

      const teamByEspnId = new Map(teams.map((t) => [t.espnId, t]));
      const eventIdByEspnId = new Map(events.map((e) => [e.espnId, e.id]));

      const rows = extracted
        .map(({ league, fixture }) =>
          this.toFixtureRow(league, fixture, teamByEspnId, eventIdByEspnId),
        )
        .filter((row) => {
          const t = row.gameDate.getTime();
          return t >= params.from.getTime() && t <= params.to.getTime();
        })
        .sort((a, b) => a.gameDate.getTime() - b.gameDate.getTime());

      return rows as unknown as Fixture[];
    } catch (error: any) {
      logger.warn(`[SportSvc] Live fixtures unavailable, using database: ${error?.message ?? error}`);
      return null;
    }
  }

  private static toFixtureRow(
    league: Awaited<ReturnType<typeof SportRepo.findLeaguesForPolling>>[number],
    fixture: NonNullable<ReturnType<typeof extractFixture>>,
    teamByEspnId: Map<string, any>,
    eventIdByEspnId: Map<string, string>,
  ) {
    const dress = (competitor: typeof fixture.home) => {
      const espn = competitor.team!;
      const local = teamByEspnId.get(espn.id!);

      // A team we have never ingested still renders — it just has no room to
      // tap into yet, which the app already treats as an ordinary state.
      return {
        id: local?.id ?? null,
        espnId: espn.id!,
        name: espn.name ?? espn.displayName ?? "",
        displayName: espn.displayName ?? espn.name ?? "",
        abbreviation: espn.abbreviation ?? "",
        logoUrl: espn.logo ?? local?.logoUrl ?? null,
        color: espn.color ?? local?.color ?? null,
        alternateColor: espn.alternateColor ?? local?.alternateColor ?? null,
        chummeTopicCategoryId: local?.chummeTopicCategoryId ?? null,
      };
    };

    return {
      // `espn:` prefix marks a fixture we have not ingested yet, so a stable
      // list key exists without pretending we hold a local row for it.
      id: eventIdByEspnId.get(fixture.espnId) ?? `espn:${fixture.espnId}`,
      espnId: fixture.espnId,
      gameDate: fixture.gameDate,
      status: fixture.status,
      statusDetail: fixture.statusDetail,
      period: fixture.period,
      clock: fixture.clock,
      homeScore: fixture.homeScore,
      awayScore: fixture.awayScore,
      venue: fixture.venue,
      broadcast: fixture.broadcast,
      spread: fixture.spread,
      overUnder: fixture.overUnder,
      league: {
        id: league.id,
        name: league.name,
        abbreviation: league.abbreviation,
        logoUrl: league.logoUrl,
        espnSlug: league.espnSlug,
        espnSport: league.espnSport,
        chummeSubCategoryId: league.chummeSubCategoryId,
      },
      homeTeam: dress(fixture.home),
      awayTeam: dress(fixture.away),
    };
  }

  static async getFixtureById(id: string) {
    return SportRepo.findFixtureById(id);
  }

  static async getTeamsByLeague(leagueId: string) {
    return SportRepo.findTeamsByLeague(leagueId);
  }

  /** Manual ingest trigger, kept here so controllers do not reach into the poller. */
  static async backfill(days = 14) {
    return SportIngestionSvc.backfillUpcoming(days);
  }
}
