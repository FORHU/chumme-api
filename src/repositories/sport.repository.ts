import { prisma } from "../utils/prisma";
import { Prisma, SportEventStatus } from "@prisma/client";

/**
 * Everything the fixture list and the room header need to render a team:
 * name, crest and the two brand colours that paint the pick-a-side buttons.
 */
const TEAM_SELECT = {
  id: true,
  espnId: true,
  name: true,
  displayName: true,
  abbreviation: true,
  logoUrl: true,
  color: true,
  alternateColor: true,
} satisfies Prisma.SportTeamSelect;

const LEAGUE_SELECT = {
  id: true,
  name: true,
  abbreviation: true,
  logoUrl: true,
  espnSlug: true,
  espnSport: true,
  chummeSubCategoryId: true,
} satisfies Prisma.SportLeagueSelect;

export default class SportRepo {
  /** Active leagues only — an inactive league should vanish from the tab. */
  static async findLeagues() {
    return prisma.sportLeague.findMany({
      where: { isActive: true },
      select: LEAGUE_SELECT,
      orderBy: { name: "asc" },
    });
  }

  /**
   * Fixtures inside an explicit instant window.
   *
   * The window is passed as instants rather than a calendar date on purpose:
   * "today" is a client-side question. A user in Manila and one in London
   * disagree about which day a 23:00 UTC kickoff belongs to, and the server has
   * no reliable way to know which of them is asking.
   */
  static async findFixtures(params: {
    from: Date;
    to: Date;
    leagueId?: string;
    teamId?: string;
    limit: number;
  }) {
    const where: Prisma.SportEventWhereInput = {
      gameDate: { gte: params.from, lte: params.to },
      ...(params.leagueId && { leagueId: params.leagueId }),
      ...(params.teamId && {
        OR: [{ homeTeamId: params.teamId }, { awayTeamId: params.teamId }],
      }),
    };

    return prisma.sportEvent.findMany({
      where,
      take: params.limit,
      orderBy: { gameDate: "asc" },
      include: {
        league: { select: LEAGUE_SELECT },
        homeTeam: { select: TEAM_SELECT },
        awayTeam: { select: TEAM_SELECT },
      },
    });
  }

  static async findFixtureById(id: string) {
    return prisma.sportEvent.findUnique({
      where: { id },
      include: {
        league: { select: LEAGUE_SELECT },
        homeTeam: { select: TEAM_SELECT },
        awayTeam: { select: TEAM_SELECT },
      },
    });
  }

  /** Teams in a league — the follow list and the Circles cross-link use this. */
  static async findTeamsByLeague(leagueId: string) {
    return prisma.sportTeam.findMany({
      where: { leagueId, isActive: true },
      select: TEAM_SELECT,
      orderBy: { displayName: "asc" },
    });
  }

  // ── Match room messages ───────────────────────────────────────────────────

  /**
   * System message into a match room.
   *
   * `sportTeamId` stays NULL: a kickoff or full-time announcement belongs to
   * neither side, and the UI centres those between the two columns. The table's
   * CHECK allows that only for `isSystem` rows.
   */
  static async createSystemMessage(params: {
    sportEventId: string;
    authorId: string;
    content: string;
  }) {
    return prisma.sportRoomMessage.create({
      data: {
        sportEventId: params.sportEventId,
        authorId: params.authorId,
        isSystem: true,
        content: params.content,
      },
      select: { id: true },
    });
  }

  // ── Enrichment for the live proxy ─────────────────────────────────────────

  /**
   * Local rows for a set of ESPN team ids.
   *
   * The live proxy returns ESPN's payload, which carries ESPN's ids and not
   * ours. Tapping a crest has to name a local SportTeam — that is the side the
   * message is stored against — so a proxied fixture is useless without this
   * lookup. Teams we have never ingested simply come back absent.
   */
  static async findTeamsByEspnIds(espnIds: string[]) {
    if (espnIds.length === 0) return [];
    return prisma.sportTeam.findMany({
      where: { espnId: { in: espnIds } },
      select: TEAM_SELECT,
    });
  }

  /** Our own ids for a set of ESPN event ids, so proxied rows keep stable keys. */
  static async findEventIdsByEspnIds(espnIds: string[]) {
    if (espnIds.length === 0) return [];
    return prisma.sportEvent.findMany({
      where: { espnId: { in: espnIds } },
      select: { id: true, espnId: true },
    });
  }

  // ── Ingestion writes ──────────────────────────────────────────────────────

  /**
   * Prior state of a fixture, read before an upsert so a score or status
   * transition can be detected. Deliberately narrow — the poller runs this for
   * every fixture on every tick.
   */
  static async findFixtureByEspnId(espnId: string) {
    return prisma.sportEvent.findUnique({
      where: { espnId },
      select: {
        id: true,
        status: true,
        homeScore: true,
        awayScore: true,
        homeTeamId: true,
        awayTeamId: true,
      },
    });
  }

  /**
   * Active leagues, for the poller and the live proxy.
   *
   * Carries the full `LEAGUE_SELECT` on top of `pollIntervalSeconds` because
   * the proxy dresses ESPN's payload with it — without `abbreviation` and
   * `chummeSubCategoryId` here, a proxied fixture would show the long league
   * name and lose its Circle link, differing from the database path for no
   * visible reason.
   */
  static async findLeaguesForPolling() {
    return prisma.sportLeague.findMany({
      where: { isActive: true },
      select: { ...LEAGUE_SELECT, pollIntervalSeconds: true },
    });
  }

  /**
   * Upserted on `espnId`, which is unique — so a team ESPN renames or recolours
   * updates in place instead of duplicating.
   */
  static async upsertTeam(data: {
    espnId: string;
    leagueId: string;
    name: string;
    displayName: string;
    abbreviation: string;
    logoUrl?: string | null;
    color?: string | null;
    alternateColor?: string | null;
    venue?: string | null;
  }) {
    const writable = {
      name: data.name,
      displayName: data.displayName,
      abbreviation: data.abbreviation,
      logoUrl: data.logoUrl ?? null,
      color: data.color ?? null,
      alternateColor: data.alternateColor ?? null,
      venue: data.venue ?? null,
    };

    return prisma.sportTeam.upsert({
      where: { espnId: data.espnId },
      // leagueId is deliberately not in the update: re-parenting a team to a
      // different league on a routine poll would be a data-corrupting surprise.
      update: writable,
      create: { espnId: data.espnId, leagueId: data.leagueId, ...writable },
      // displayName comes back so a match message can name the teams without a
      // second read on every score change.
      select: { id: true, espnId: true, displayName: true },
    });
  }

  static async upsertEvent(data: {
    espnId: string;
    leagueId: string;
    homeTeamId: string;
    awayTeamId: string;
    homeScore: number;
    awayScore: number;
    status: SportEventStatus;
    statusDetail?: string | null;
    period?: number | null;
    clock?: string | null;
    gameDate: Date;
    venue?: string | null;
    broadcast?: string | null;
    spread?: string | null;
    overUnder?: string | null;
    metaData?: Prisma.InputJsonValue;
  }) {
    const writable = {
      homeScore: data.homeScore,
      awayScore: data.awayScore,
      status: data.status,
      statusDetail: data.statusDetail ?? null,
      period: data.period ?? null,
      clock: data.clock ?? null,
      gameDate: data.gameDate,
      venue: data.venue ?? null,
      broadcast: data.broadcast ?? null,
      spread: data.spread ?? null,
      overUnder: data.overUnder ?? null,
      lastPolledAt: new Date(),
      ...(data.metaData !== undefined && { metaData: data.metaData }),
    };

    return prisma.sportEvent.upsert({
      where: { espnId: data.espnId },
      update: writable,
      create: {
        espnId: data.espnId,
        leagueId: data.leagueId,
        homeTeamId: data.homeTeamId,
        awayTeamId: data.awayTeamId,
        ...writable,
      },
      select: {
        id: true,
        status: true,
        homeScore: true,
        awayScore: true,
        homeTeamId: true,
        awayTeamId: true,
      },
    });
  }

  /**
   * Does this league have anything worth polling every 30 seconds?
   *
   * True while a match is running, or while one kicks off inside the lead-in
   * window. Everything else can refresh on a slow cadence.
   */
  static async hasActiveWindow(leagueId: string, leadInMinutes: number) {
    const now = new Date();
    const soon = new Date(now.getTime() + leadInMinutes * 60 * 1000);

    const found = await prisma.sportEvent.findFirst({
      where: {
        leagueId,
        OR: [
          {
            status: {
              in: [SportEventStatus.IN_PROGRESS, SportEventStatus.HALFTIME],
            },
          },
          { gameDate: { gte: now, lte: soon } },
        ],
      },
      select: { id: true },
    });

    return found !== null;
  }
}
