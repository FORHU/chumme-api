import axios from "axios";
import logger from "./logger";

/**
 * Thin client for ESPN's public scoreboard API.
 *
 * HOST MATTERS. Verified 2026-09-07:
 *
 *   site.web.api.espn.com  → 200, keyless, whole scoreboard in one call   ← this
 *   site.api.espn.com      → 403 on the identical path
 *   sports.core.api...     → 200 but reference-style: ~5-6 requests per fixture
 *   www.espn.com / .ph     → 202 bot interstitial, no content
 *
 * The `.web` is the entire difference. Do not "simplify" the host.
 *
 * These endpoints are undocumented and unsupported. Everything below treats the
 * response as untrusted shape — missing fields are normal, not exceptional.
 */
const BASE = "https://site.web.api.espn.com/apis/site/v2/sports";

const TIMEOUT_MS = 10_000;

/** ESPN serves a bot interstitial to unrecognised clients on some hosts. */
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/126.0 Safari/537.36";

/**
 * Only the fields we actually read. ESPN sends far more; declaring the whole
 * payload would be a maintenance burden for no benefit, and every field here is
 * optional because an undocumented API is free to drop any of them.
 */
export interface EspnTeam {
  id?: string;
  name?: string;
  displayName?: string;
  shortDisplayName?: string;
  abbreviation?: string;
  color?: string;
  alternateColor?: string;
  logo?: string;
  venue?: { fullName?: string };
}

export interface EspnCompetitor {
  id?: string;
  homeAway?: "home" | "away";
  score?: string | number;
  team?: EspnTeam;
}

export interface EspnCompetition {
  id?: string;
  date?: string;
  venue?: { fullName?: string };
  broadcasts?: { names?: string[] }[];
  odds?: { details?: string; overUnder?: number | string }[];
  competitors?: EspnCompetitor[];
  status?: EspnStatus;
}

export interface EspnStatus {
  period?: number;
  displayClock?: string;
  type?: { name?: string; detail?: string; shortDetail?: string };
}

export interface EspnEvent {
  id?: string;
  date?: string;
  name?: string;
  shortName?: string;
  status?: EspnStatus;
  competitions?: EspnCompetition[];
}

export interface EspnScoreboard {
  events?: EspnEvent[];
  leagues?: { id?: string; name?: string; slug?: string }[];
}

/**
 * Fetches one league's scoreboard.
 *
 * `dates` accepts ESPN's own formats — `YYYYMMDD` for a single day or
 * `YYYYMMDD-YYYYMMDD` for a range. Omitting it returns ESPN's current window,
 * which is what a live-score poll wants.
 *
 * Returns null rather than throwing: a poller must survive a bad response from
 * one league without taking down the tick for every other league.
 */
export async function fetchScoreboard(params: {
  espnSport: string;
  espnSlug: string;
  dates?: string;
}): Promise<EspnScoreboard | null> {
  const url = `${BASE}/${params.espnSport}/${params.espnSlug}/scoreboard`;

  try {
    const response = await axios.get<EspnScoreboard>(url, {
      timeout: TIMEOUT_MS,
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      params: params.dates ? { dates: params.dates } : undefined,
      // ESPN answers a blocked client with 202 and an HTML interstitial rather
      // than an error status, so success alone is not proof of a usable body.
      validateStatus: (s) => s === 200,
    });

    if (typeof response.data !== "object" || response.data === null) {
      logger.warn(
        `[ESPN] ${params.espnSport}/${params.espnSlug}: non-JSON body, likely a bot interstitial`,
      );
      return null;
    }

    return response.data;
  } catch (error: any) {
    logger.warn(
      `[ESPN] ${params.espnSport}/${params.espnSlug} fetch failed: ` +
        `${error?.response?.status ?? ""} ${error?.message ?? error}`,
    );
    return null;
  }
}

/** `YYYYMMDD`, in UTC — the format ESPN's `dates` parameter expects. */
export function toEspnDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

export function toEspnDateRange(from: Date, to: Date): string {
  return `${toEspnDate(from)}-${toEspnDate(to)}`;
}
