import { expect } from "chai";
import { describe, it } from "mocha";
import { SportEventStatus } from "@prisma/client";
import {
  DemoScript,
  isDemoEspnId,
  simulateDemo,
  withDemoState,
} from "../src/utils/sport-demo.util";

const KICKOFF = new Date("2026-10-06T12:00:00Z");
const at = (minutes: number) => new Date(KICKOFF.getTime() + minutes * 60_000);

const soccer: DemoScript = {
  sport: "soccer",
  goals: [
    { minute: 23, side: "home" },
    { minute: 38, side: "away" },
    { minute: 74, side: "home" },
    { minute: 88, side: "home" },
  ],
};

const nba: DemoScript = { sport: "basketball", finalHome: 114, finalAway: 109 };

describe("simulateDemo — soccer", function () {
  const cases: [number, SportEventStatus, string | null, string][] = [
    [-5, SportEventStatus.SCHEDULED, null, "0-0"],
    [0, SportEventStatus.IN_PROGRESS, "1'", "0-0"],
    [22.5, SportEventStatus.IN_PROGRESS, "23'", "1-0"],
    [45.5, SportEventStatus.IN_PROGRESS, "45'+1", "1-1"],
    [50, SportEventStatus.HALFTIME, "45'", "1-1"],
    [62, SportEventStatus.IN_PROGRESS, "46'", "1-1"],
    [105, SportEventStatus.IN_PROGRESS, "89'", "3-1"],
    [109, SportEventStatus.IN_PROGRESS, "90'+3", "3-1"],
    [120, SportEventStatus.FINAL, "90'", "3-1"],
  ];

  for (const [minute, status, clock, score] of cases) {
    it(`${minute} min after kickoff → ${status} ${clock ?? ""} ${score}`, function () {
      const s = simulateDemo(soccer, KICKOFF, at(minute));
      expect(s.status).to.equal(status);
      expect(s.clock).to.equal(clock);
      expect(`${s.homeScore}-${s.awayScore}`).to.equal(score);
    });
  }
});

describe("simulateDemo — basketball", function () {
  it("counts the quarter clock down", function () {
    const s = simulateDemo(nba, KICKOFF, at(15));
    expect(s.status).to.equal(SportEventStatus.IN_PROGRESS);
    expect(s.statusDetail).to.equal("6:00 - 1st Quarter");
  });

  it("has a half-time break after the 2nd quarter", function () {
    const s = simulateDemo(nba, KICKOFF, at(65));
    expect(s.status).to.equal(SportEventStatus.HALFTIME);
    expect(s.period).to.equal(2);
  });

  it("finishes on the scripted final score", function () {
    const s = simulateDemo(nba, KICKOFF, at(200));
    expect(s.status).to.equal(SportEventStatus.FINAL);
    expect([s.homeScore, s.awayScore]).to.deep.equal([114, 109]);
  });

  it("never runs the score backwards", function () {
    let last = -1;
    for (let m = 0; m <= 140; m += 5) {
      const s = simulateDemo(nba, KICKOFF, at(m));
      expect(s.homeScore).to.be.at.least(last);
      last = s.homeScore;
    }
  });
});

describe("withDemoState", function () {
  it("recognises demo ids only", function () {
    expect(isDemoEspnId("demo-epl-ars-che")).to.equal(true);
    expect(isDemoEspnId("704512")).to.equal(false);
    expect(isDemoEspnId(null)).to.equal(false);
  });

  it("applies the simulation to a demo row", function () {
    const row = {
      espnId: "demo-x",
      gameDate: KICKOFF,
      metaData: { demo: soccer },
      status: SportEventStatus.SCHEDULED,
    };
    const out = withDemoState(row, at(120));
    expect(out.status).to.equal(SportEventStatus.FINAL);
    expect(row.status).to.equal(SportEventStatus.SCHEDULED); // not mutated
  });

  it("leaves real fixtures exactly as they came in", function () {
    const row = { espnId: "704512", gameDate: KICKOFF, metaData: null };
    expect(withDemoState(row, at(120))).to.equal(row);
  });
});
