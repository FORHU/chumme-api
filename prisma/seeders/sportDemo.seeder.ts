import { PrismaClient, SportEventStatus } from "@prisma/client";
import {
  DEMO_ESPN_ID_PREFIX,
  DemoScript,
  simulateDemo,
} from "../../src/utils/sport-demo.util";

/**
 * Demo fixtures for the Sports tab.
 *
 * Teams are the real clubs with their real ESPN ids, crests and colours —
 * exactly the rows ingestion would create — so team rooms and crests behave
 * the same as they do with live data. Only the matches are invented, and
 * their kickoffs are set relative to the moment this runs: re-run it shortly
 * before a demo and there will be matches live, about to start, and finished.
 *
 * See src/utils/sport-demo.util.ts for how a demo match plays itself out.
 */

interface DemoTeam {
  espnId: string;
  name: string;
  displayName: string;
  abbreviation: string;
  color: string;
  alternateColor: string;
  logoUrl: string;
  venue?: string;
}

const soccerLogo = (id: string) =>
  `https://a.espncdn.com/i/teamlogos/soccer/500/${id}.png`;
const nbaLogo = (abbr: string) =>
  `https://a.espncdn.com/i/teamlogos/nba/500/${abbr}.png`;

/** Keyed by `${espnSport}/${espnSlug}` — the league each team belongs to. */
const TEAMS: Record<string, Record<string, DemoTeam>> = {
  "soccer/eng.1": {
    ARS: { espnId: "359", name: "Arsenal", displayName: "Arsenal", abbreviation: "ARS", color: "e20520", alternateColor: "003399", logoUrl: soccerLogo("359"), venue: "Emirates Stadium" },
    CHE: { espnId: "363", name: "Chelsea", displayName: "Chelsea", abbreviation: "CHE", color: "144992", alternateColor: "FFFFFF", logoUrl: soccerLogo("363"), venue: "Stamford Bridge" },
    LIV: { espnId: "364", name: "Liverpool", displayName: "Liverpool", abbreviation: "LIV", color: "d11317", alternateColor: "FFFFFF", logoUrl: soccerLogo("364"), venue: "Anfield" },
    MNC: { espnId: "382", name: "Manchester City", displayName: "Manchester City", abbreviation: "MNC", color: "99c5ea", alternateColor: "000000", logoUrl: soccerLogo("382"), venue: "Etihad Stadium" },
    MAN: { espnId: "360", name: "Manchester United", displayName: "Manchester United", abbreviation: "MAN", color: "da020e", alternateColor: "4169E1", logoUrl: soccerLogo("360"), venue: "Old Trafford" },
    TOT: { espnId: "367", name: "Tottenham Hotspur", displayName: "Tottenham Hotspur", abbreviation: "TOT", color: "ffffff", alternateColor: "0B1426", logoUrl: soccerLogo("367"), venue: "Tottenham Hotspur Stadium" },
    NEW: { espnId: "361", name: "Newcastle United", displayName: "Newcastle United", abbreviation: "NEW", color: "000000", alternateColor: "0B1B3D", logoUrl: soccerLogo("361"), venue: "St. James' Park" },
    AVL: { espnId: "362", name: "Aston Villa", displayName: "Aston Villa", abbreviation: "AVL", color: "660e36", alternateColor: "000000", logoUrl: soccerLogo("362"), venue: "Villa Park" },
  },
  "soccer/esp.1": {
    RMA: { espnId: "86", name: "Real Madrid", displayName: "Real Madrid", abbreviation: "RMA", color: "ffffff", alternateColor: "1B4D3E", logoUrl: soccerLogo("86"), venue: "Santiago Bernabéu" },
    BAR: { espnId: "83", name: "Barcelona", displayName: "Barcelona", abbreviation: "BAR", color: "990000", alternateColor: "FCE38A", logoUrl: soccerLogo("83"), venue: "Spotify Camp Nou" },
    ATM: { espnId: "1068", name: "Atlético Madrid", displayName: "Atlético Madrid", abbreviation: "ATM", color: "ca3624", alternateColor: "000000", logoUrl: soccerLogo("1068"), venue: "Riyadh Air Metropolitano" },
    SEV: { espnId: "243", name: "Sevilla", displayName: "Sevilla", abbreviation: "SEV", color: "ffffff", alternateColor: "d81022", logoUrl: soccerLogo("243"), venue: "Ramón Sánchez Pizjuán" },
  },
  "soccer/ita.1": {
    INT: { espnId: "110", name: "Internazionale", displayName: "Internazionale", abbreviation: "INT", color: "00239c", alternateColor: "ffffff", logoUrl: soccerLogo("110"), venue: "San Siro" },
    MIL: { espnId: "103", name: "AC Milan", displayName: "AC Milan", abbreviation: "MIL", color: "e4002b", alternateColor: "ffffff", logoUrl: soccerLogo("103"), venue: "San Siro" },
    JUV: { espnId: "111", name: "Juventus", displayName: "Juventus", abbreviation: "JUV", color: "000000", alternateColor: "E8A2B0", logoUrl: soccerLogo("111"), venue: "Allianz Stadium" },
    NAP: { espnId: "114", name: "Napoli", displayName: "Napoli", abbreviation: "NAP", color: "0677d2", alternateColor: "ffffff", logoUrl: soccerLogo("114"), venue: "Stadio Diego Armando Maradona" },
  },
  "soccer/ger.1": {
    MUN: { espnId: "132", name: "Bayern Munich", displayName: "Bayern Munich", abbreviation: "MUN", color: "dc052d", alternateColor: "1a1a1a", logoUrl: soccerLogo("132"), venue: "Allianz Arena" },
    DOR: { espnId: "124", name: "Borussia Dortmund", displayName: "Borussia Dortmund", abbreviation: "DOR", color: "ffee00", alternateColor: "272726", logoUrl: soccerLogo("124"), venue: "Signal Iduna Park" },
    B04: { espnId: "131", name: "Bayer Leverkusen", displayName: "Bayer Leverkusen", abbreviation: "B04", color: "DA0308", alternateColor: "f9fbfc", logoUrl: soccerLogo("131"), venue: "BayArena" },
    RBL: { espnId: "11420", name: "RB Leipzig", displayName: "RB Leipzig", abbreviation: "RBL", color: "ffffff", alternateColor: "740c14", logoUrl: soccerLogo("11420"), venue: "Red Bull Arena" },
  },
  "basketball/nba": {
    LAL: { espnId: "13", name: "Lakers", displayName: "Los Angeles Lakers", abbreviation: "LAL", color: "552583", alternateColor: "fdb927", logoUrl: nbaLogo("lal"), venue: "Crypto.com Arena" },
    BOS: { espnId: "2", name: "Celtics", displayName: "Boston Celtics", abbreviation: "BOS", color: "008348", alternateColor: "ffffff", logoUrl: nbaLogo("bos"), venue: "TD Garden" },
    GS: { espnId: "9", name: "Warriors", displayName: "Golden State Warriors", abbreviation: "GS", color: "fdb927", alternateColor: "1d428a", logoUrl: nbaLogo("gs"), venue: "Chase Center" },
    NY: { espnId: "18", name: "Knicks", displayName: "New York Knicks", abbreviation: "NY", color: "1d428a", alternateColor: "f58426", logoUrl: nbaLogo("ny"), venue: "Madison Square Garden" },
    DEN: { espnId: "7", name: "Nuggets", displayName: "Denver Nuggets", abbreviation: "DEN", color: "0e2240", alternateColor: "fec524", logoUrl: nbaLogo("den"), venue: "Ball Arena" },
    MIA: { espnId: "14", name: "Heat", displayName: "Miami Heat", abbreviation: "MIA", color: "98002e", alternateColor: "000000", logoUrl: nbaLogo("mia"), venue: "Kaseya Center" },
  },
};

interface DemoMatch {
  /** Stable suffix, so a re-seed moves the match instead of duplicating it. */
  key: string;
  /** League the fixture is played in — `${espnSport}/${espnSlug}`. */
  league: string;
  home: [league: string, abbr: string];
  away: [league: string, abbr: string];
  /** Kickoff relative to now, in minutes. Negative = already started. */
  kickoffInMinutes: number;
  script: DemoScript;
}

const H = 60;
const D = 24 * H;
const goals = (...g: [number, "home" | "away"][]) =>
  g.map(([minute, side]) => ({ minute, side }));

const MATCHES: DemoMatch[] = [
  // ── Live now ──────────────────────────────────────────────────────────
  // Second half, 1-1, with two goals still to come during the demo.
  {
    key: "epl-ars-che", league: "soccer/eng.1",
    home: ["soccer/eng.1", "ARS"], away: ["soccer/eng.1", "CHE"],
    kickoffInMinutes: -68,
    script: { sport: "soccer", goals: goals([23, "home"], [38, "away"], [74, "home"], [88, "home"]) },
  },
  // Late first half — reaches half-time a few minutes in.
  {
    key: "liga-rma-bar", league: "soccer/esp.1",
    home: ["soccer/esp.1", "RMA"], away: ["soccer/esp.1", "BAR"],
    kickoffInMinutes: -40,
    script: { sport: "soccer", goals: goals([12, "away"], [31, "home"], [44, "home"], [67, "away"], [81, "away"]) },
  },
  // Third quarter.
  {
    key: "nba-lal-bos", league: "basketball/nba",
    home: ["basketball/nba", "LAL"], away: ["basketball/nba", "BOS"],
    kickoffInMinutes: -85,
    script: { sport: "basketball", finalHome: 114, finalAway: 109 },
  },

  // ── Kicking off during the demo ───────────────────────────────────────
  {
    key: "epl-liv-mnc", league: "soccer/eng.1",
    home: ["soccer/eng.1", "LIV"], away: ["soccer/eng.1", "MNC"],
    kickoffInMinutes: 10,
    script: { sport: "soccer", goals: goals([6, "home"], [27, "away"], [58, "home"], [90, "away"]) },
  },
  {
    key: "seriea-int-mil", league: "soccer/ita.1",
    home: ["soccer/ita.1", "INT"], away: ["soccer/ita.1", "MIL"],
    kickoffInMinutes: 45,
    script: { sport: "soccer", goals: goals([19, "home"], [63, "home"]) },
  },
  {
    key: "bund-mun-dor", league: "soccer/ger.1",
    home: ["soccer/ger.1", "MUN"], away: ["soccer/ger.1", "DOR"],
    kickoffInMinutes: 2 * H,
    script: { sport: "soccer", goals: goals([9, "home"], [33, "away"], [52, "home"], [77, "home"]) },
  },

  // ── Finished today ────────────────────────────────────────────────────
  {
    key: "bund-b04-rbl", league: "soccer/ger.1",
    home: ["soccer/ger.1", "B04"], away: ["soccer/ger.1", "RBL"],
    kickoffInMinutes: -3 * H - 20,
    script: { sport: "soccer", goals: goals([15, "away"], [55, "home"], [70, "home"]) },
  },
  {
    key: "nba-den-mia", league: "basketball/nba",
    home: ["basketball/nba", "DEN"], away: ["basketball/nba", "MIA"],
    kickoffInMinutes: -3 * H - 30,
    script: { sport: "basketball", finalHome: 121, finalAway: 117 },
  },

  // ── Coming up this week ───────────────────────────────────────────────
  {
    key: "epl-man-tot", league: "soccer/eng.1",
    home: ["soccer/eng.1", "MAN"], away: ["soccer/eng.1", "TOT"],
    kickoffInMinutes: 1 * D,
    script: { sport: "soccer", goals: goals([41, "away"], [66, "home"]) },
  },
  {
    key: "epl-new-avl", league: "soccer/eng.1",
    home: ["soccer/eng.1", "NEW"], away: ["soccer/eng.1", "AVL"],
    kickoffInMinutes: 1 * D + 3 * H,
    script: { sport: "soccer", goals: goals([30, "home"]) },
  },
  {
    key: "nba-gs-ny", league: "basketball/nba",
    home: ["basketball/nba", "GS"], away: ["basketball/nba", "NY"],
    kickoffInMinutes: 1 * D + 5 * H,
    script: { sport: "basketball", finalHome: 108, finalAway: 112 },
  },
  {
    key: "liga-atm-sev", league: "soccer/esp.1",
    home: ["soccer/esp.1", "ATM"], away: ["soccer/esp.1", "SEV"],
    kickoffInMinutes: 2 * D,
    script: { sport: "soccer", goals: goals([22, "home"], [49, "home"]) },
  },
  {
    key: "seriea-juv-nap", league: "soccer/ita.1",
    home: ["soccer/ita.1", "JUV"], away: ["soccer/ita.1", "NAP"],
    kickoffInMinutes: 2 * D + 2 * H,
    script: { sport: "soccer", goals: goals([57, "away"]) },
  },
  {
    key: "ucl-mnc-rma", league: "soccer/uefa.champions",
    home: ["soccer/eng.1", "MNC"], away: ["soccer/esp.1", "RMA"],
    kickoffInMinutes: 4 * D,
    script: { sport: "soccer", goals: goals([14, "away"], [38, "home"], [71, "home"]) },
  },
  {
    key: "ucl-int-ars", league: "soccer/uefa.champions",
    home: ["soccer/ita.1", "INT"], away: ["soccer/eng.1", "ARS"],
    kickoffInMinutes: 4 * D + 1,
    script: { sport: "soccer", goals: goals([62, "away"]) },
  },
];

export async function seedSportDemo(prisma: PrismaClient) {
  const leagues = await prisma.sportLeague.findMany({
    select: { id: true, espnSport: true, espnSlug: true },
  });
  const leagueId = new Map(
    leagues.map((l) => [`${l.espnSport}/${l.espnSlug}`, l.id]),
  );

  // Teams first — a fixture needs both ids.
  const teamId = new Map<string, string>();
  for (const [league, teams] of Object.entries(TEAMS)) {
    const id = leagueId.get(league);
    if (!id) {
      console.log(`  Skipping ${league} teams — league not seeded`);
      continue;
    }
    for (const [abbr, team] of Object.entries(teams)) {
      const { espnId, ...writable } = team;
      const row = await prisma.sportTeam.upsert({
        where: { espnId },
        // Same rule as ingestion: never re-parent an existing team.
        update: writable,
        create: { espnId, leagueId: id, ...writable },
        select: { id: true },
      });
      teamId.set(`${league}:${abbr}`, row.id);
    }
  }

  const now = new Date();
  let seeded = 0;

  for (const match of MATCHES) {
    const lid = leagueId.get(match.league);
    const homeTeamId = teamId.get(match.home.join(":"));
    const awayTeamId = teamId.get(match.away.join(":"));
    if (!lid || !homeTeamId || !awayTeamId) {
      console.log(`  Skipping ${match.key} — league or team missing`);
      continue;
    }

    const gameDate = new Date(now.getTime() + match.kickoffInMinutes * 60_000);
    // Stored state is only a snapshot for anything reading the row directly;
    // the API recomputes it on every read.
    const state = simulateDemo(match.script, gameDate, now);
    const homeTeam = TEAMS[match.home[0]][match.home[1]];
    const awayTeam = TEAMS[match.away[0]][match.away[1]];

    const writable = {
      ...state,
      gameDate,
      venue: homeTeam.venue ?? null,
      metaData: {
        name: `${awayTeam.displayName} at ${homeTeam.displayName}`,
        shortName: `${awayTeam.abbreviation} @ ${homeTeam.abbreviation}`,
        demo: match.script,
      },
      lastPolledAt: now,
    };

    await prisma.sportEvent.upsert({
      where: { espnId: `${DEMO_ESPN_ID_PREFIX}${match.key}` },
      update: writable,
      create: {
        espnId: `${DEMO_ESPN_ID_PREFIX}${match.key}`,
        leagueId: lid,
        homeTeamId,
        awayTeamId,
        ...writable,
      },
    });

    seeded++;
    console.log(
      `  ${label(state.status).padEnd(9)} ${homeTeam.displayName} v ${awayTeam.displayName}`,
    );
  }

  return { seeded };
}

/** Removes every demo fixture and the chat posted in their rooms. */
export async function clearSportDemo(prisma: PrismaClient) {
  const where = { espnId: { startsWith: DEMO_ESPN_ID_PREFIX } };
  const events = await prisma.sportEvent.findMany({
    where,
    select: { id: true },
  });
  const ids = events.map((e) => e.id);

  const [messages, , removed] = await prisma.$transaction([
    prisma.sportRoomMessage.deleteMany({ where: { sportEventId: { in: ids } } }),
    prisma.sportPlayerStat.deleteMany({ where: { eventId: { in: ids } } }),
    prisma.sportEvent.deleteMany({ where }),
  ]);

  return { events: removed.count, messages: messages.count };
}

function label(status: SportEventStatus): string {
  switch (status) {
    case SportEventStatus.IN_PROGRESS:
      return "LIVE";
    case SportEventStatus.HALFTIME:
      return "HT";
    case SportEventStatus.FINAL:
      return "FT";
    default:
      return "upcoming";
  }
}
