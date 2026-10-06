import { SportEventStatus } from "@prisma/client";

/**
 * Demo fixtures — invented matches for showing the Sports tab when ESPN has
 * nothing on (international breaks, off-season, a demo at 3am).
 *
 * They are ordinary SportEvent rows, told apart only by this `espnId` prefix.
 * No real ESPN id starts with a letter, so the prefix can never collide with
 * an ingested fixture, and the poller's upserts never touch these rows.
 *
 * Nothing about a demo match's progress is stored. The row holds a kickoff
 * time and a script (goals, final score) in `metaData.demo`; status, clock and
 * score are worked out from the current time on every read. So a match seeded
 * to kick off in ten minutes really does go live, score, reach half-time and
 * finish while the app is open — no worker, no cron, nothing to drift.
 */
export const DEMO_ESPN_ID_PREFIX = "demo-";

export function isDemoEspnId(espnId: string | null | undefined): boolean {
  return !!espnId && espnId.startsWith(DEMO_ESPN_ID_PREFIX);
}

export type DemoScript =
  | {
      sport: "soccer";
      /** Match minute (1–90, stoppage as 45+/90+ not needed) and scoring side. */
      goals: { minute: number; side: "home" | "away" }[];
    }
  | {
      sport: "basketball";
      finalHome: number;
      finalAway: number;
    };

export interface DemoState {
  status: SportEventStatus;
  statusDetail: string | null;
  period: number | null;
  clock: string | null;
  homeScore: number;
  awayScore: number;
}

/**
 * Wall-clock pacing, in real minutes after kickoff.
 *
 * Soccer: 45' first half + 2' stoppage, 15' break, 45' second half + 3'.
 * Basketball: four 30-minute quarters with a 15-minute half-time — roughly how
 * long an NBA broadcast actually runs.
 */
const SOCCER = {
  firstHalfEnd: 47,
  secondHalfStart: 62,
  fullTime: 110,
} as const;

const NBA = {
  quarterRealMinutes: 30,
  halftimeRealMinutes: 15,
  quarterGameMinutes: 12,
} as const;

export function simulateDemo(
  script: DemoScript,
  kickoff: Date,
  now: Date = new Date(),
): DemoState {
  const elapsed = (now.getTime() - kickoff.getTime()) / 60_000;

  if (elapsed < 0) {
    return {
      status: SportEventStatus.SCHEDULED,
      statusDetail: "Scheduled",
      period: null,
      clock: null,
      homeScore: 0,
      awayScore: 0,
    };
  }

  return script.sport === "soccer"
    ? simulateSoccer(script.goals, elapsed)
    : simulateBasketball(script, elapsed);
}

function simulateSoccer(
  goals: { minute: number; side: "home" | "away" }[],
  elapsed: number,
): DemoState {
  const score = (upTo: number) => ({
    homeScore: goals.filter((g) => g.side === "home" && g.minute <= upTo)
      .length,
    awayScore: goals.filter((g) => g.side === "away" && g.minute <= upTo)
      .length,
  });

  if (elapsed < SOCCER.firstHalfEnd) {
    const minute = Math.floor(elapsed) + 1;
    const clock = minute > 45 ? `45'+${minute - 45}` : `${minute}'`;
    return {
      status: SportEventStatus.IN_PROGRESS,
      statusDetail: clock,
      period: 1,
      clock,
      ...score(Math.min(minute, 45)),
    };
  }

  if (elapsed < SOCCER.secondHalfStart) {
    return {
      status: SportEventStatus.HALFTIME,
      statusDetail: "Halftime",
      period: 1,
      clock: "45'",
      ...score(45),
    };
  }

  if (elapsed < SOCCER.fullTime) {
    const minute = Math.floor(elapsed - SOCCER.secondHalfStart) + 46;
    const clock = minute > 90 ? `90'+${minute - 90}` : `${minute}'`;
    return {
      status: SportEventStatus.IN_PROGRESS,
      statusDetail: clock,
      period: 2,
      clock,
      ...score(Math.min(minute, 90)),
    };
  }

  return {
    status: SportEventStatus.FINAL,
    statusDetail: "FT",
    period: 2,
    clock: "90'",
    ...score(90),
  };
}

function simulateBasketball(
  script: { finalHome: number; finalAway: number },
  elapsed: number,
): DemoState {
  const q = NBA.quarterRealMinutes;
  const totalGameMinutes = NBA.quarterGameMinutes * 4;

  // Real minutes → [quarter, game minutes played in it], with the half-time
  // break carved out after the second quarter.
  let realIntoGame = elapsed;
  if (elapsed >= 2 * q && elapsed < 2 * q + NBA.halftimeRealMinutes) {
    return {
      status: SportEventStatus.HALFTIME,
      statusDetail: "Halftime",
      period: 2,
      clock: "0:00",
      homeScore: Math.round(script.finalHome * 0.5),
      awayScore: Math.round(script.finalAway * 0.5),
    };
  }
  if (elapsed >= 2 * q + NBA.halftimeRealMinutes) {
    realIntoGame -= NBA.halftimeRealMinutes;
  }

  if (realIntoGame >= 4 * q) {
    return {
      status: SportEventStatus.FINAL,
      statusDetail: "Final",
      period: 4,
      clock: "0:00",
      homeScore: script.finalHome,
      awayScore: script.finalAway,
    };
  }

  const period = Math.floor(realIntoGame / q) + 1;
  const gameMinutesIntoQuarter =
    ((realIntoGame % q) / q) * NBA.quarterGameMinutes;
  const remainingSeconds = Math.max(
    0,
    Math.round((NBA.quarterGameMinutes - gameMinutesIntoQuarter) * 60),
  );
  const clock = `${Math.floor(remainingSeconds / 60)}:${String(remainingSeconds % 60).padStart(2, "0")}`;

  const played =
    ((period - 1) * NBA.quarterGameMinutes + gameMinutesIntoQuarter) /
    totalGameMinutes;

  return {
    status: SportEventStatus.IN_PROGRESS,
    statusDetail: `${clock} - ${ordinal(period)} Quarter`,
    period,
    clock,
    homeScore: Math.round(script.finalHome * played),
    awayScore: Math.round(script.finalAway * played),
  };
}

function ordinal(n: number): string {
  return ["1st", "2nd", "3rd", "4th"][n - 1] ?? `${n}th`;
}

/**
 * Applies the simulation to a fixture row from the repository, leaving
 * anything that is not a demo fixture exactly as it came in.
 */
export function withDemoState<
  T extends { espnId: string; gameDate: Date; metaData?: unknown },
>(row: T, now: Date = new Date()): T {
  if (!isDemoEspnId(row.espnId)) return row;

  const script = (row.metaData as { demo?: DemoScript } | null)?.demo;
  if (!script) return row;

  return { ...row, ...simulateDemo(script, row.gameDate, now) };
}
