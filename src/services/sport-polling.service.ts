import cron from "node-cron";
import SportRepo from "../repositories/sport.repository";
import SportIngestionSvc from "./sport-ingestion.service";
import SportRoomSvc from "./sport-room.service";
import logger from "../utils/logger";

/**
 * Paces ESPN polling per league.
 *
 * The cadence is adaptive on purpose. `SportLeague.pollIntervalSeconds`
 * defaults to 30, but 30-second polling is only warranted while something is
 * actually happening. Applying it to every league around the clock would be
 * ~2,880 requests per league per day to fetch a fixture list that changes
 * roughly never.
 *
 * So: fast while a match is live or about to start, slow otherwise.
 */

/** How early before kickoff the fast cadence starts. */
const LEAD_IN_MINUTES = 30;

/** Cadence when a league has nothing live — just keeps the fixture list fresh. */
const IDLE_INTERVAL_SECONDS = 15 * 60;

/** The tick itself. Individual leagues are rate-limited inside it. */
const TICK_EXPRESSION = "*/30 * * * * *";

/**
 * Last successful poll per league.
 *
 * In-process, which is correct for a single worker and wrong for several: two
 * workers would each keep their own map and double the request rate. If the
 * worker is ever scaled out, move this to Redis (`RedisUtil` is already used
 * elsewhere for exactly this kind of cross-process state).
 */
const lastPolledAt = new Map<string, number>();

let running = false;
let task: cron.ScheduledTask | null = null;

async function tick(): Promise<void> {
  // A slow ESPN response must not let ticks pile up on top of each other.
  if (running) {
    logger.warn(
      "[SportPolling] Previous tick still running — skipping this one",
    );
    return;
  }
  running = true;

  try {
    const leagues = await SportRepo.findLeaguesForPolling();
    if (leagues.length === 0) return;

    const now = Date.now();

    for (const league of leagues) {
      try {
        const active = await SportRepo.hasActiveWindow(
          league.id,
          LEAD_IN_MINUTES,
        );
        const intervalSeconds = active
          ? league.pollIntervalSeconds
          : IDLE_INTERVAL_SECONDS;

        const last = lastPolledAt.get(league.id) ?? 0;
        if (now - last < intervalSeconds * 1000) continue;

        lastPolledAt.set(league.id, now);

        const result = await SportIngestionSvc.syncLeague(league);

        for (const change of result.changed) {
          logger.info(
            `[SportPolling] ${league.name} ${change.espnId}: ` +
              `${change.from} → ${change.to} (${change.score})`,
          );

          // Posting is best-effort: a room that cannot be written to must not
          // stop the fixture data from being ingested.
          try {
            await SportRoomSvc.postMatchUpdate({
              eventId: change.eventId,
              espnSport: league.espnSport,
              from: change.from,
              to: change.to,
              homeTeam: change.homeTeam,
              awayTeam: change.awayTeam,
              score: change.score,
              clock: change.clock,
            });
          } catch (error: any) {
            logger.warn(
              `[SportPolling] Match update not posted for ${change.espnId}: ${error?.message ?? error}`,
            );
          }
        }

        if (result.skipped > 0) {
          logger.warn(
            `[SportPolling] ${league.name}: skipped ${result.skipped} unusable fixture(s)`,
          );
        }
      } catch (error: any) {
        // One league failing must not stop the others on this tick.
        logger.error(
          `[SportPolling] ${league.name} failed: ${error?.message ?? error}`,
        );
      }
    }
  } catch (error: any) {
    logger.error(`[SportPolling] Tick failed: ${error?.message ?? error}`);
  } finally {
    running = false;
  }
}

export default class SportPollingService {
  static async start(): Promise<void> {
    if (task) {
      logger.warn(
        "[SportPolling] Already started — ignoring duplicate start()",
      );
      return;
    }

    const leagues = await SportRepo.findLeaguesForPolling();
    if (leagues.length === 0) {
      // Not an error: the tables ship empty and stay that way until leagues are
      // seeded. Say so plainly rather than starting a timer that does nothing.
      logger.info(
        "[SportPolling] No active leagues — poller idle until one is seeded",
      );
    }

    task = cron.schedule(TICK_EXPRESSION, () => {
      void tick();
    });

    logger.info(
      `[SportPolling] Started — ${leagues.length} active league(s), ` +
        `fast cadence within ${LEAD_IN_MINUTES}min of kickoff`,
    );
  }

  static stop(): void {
    task?.stop();
    task = null;
    lastPolledAt.clear();
    logger.info("[SportPolling] Stopped");
  }

  /** Manual trigger — for a seeder, an admin endpoint, or a first warm-up. */
  static async backfillNow(days = 14) {
    logger.info(`[SportPolling] Backfilling ${days} days of fixtures...`);
    const results = await SportIngestionSvc.backfillUpcoming(days);
    for (const r of results) {
      logger.info(
        `[SportPolling] ${r.league}: ${r.events} fixture(s), ${r.skipped} skipped`,
      );
    }

    // No room provisioning step: a match room is not a row that has to exist
    // beforehand. It is identified by the fixture, so the moment a SportEvent
    // is ingested its room is addressable.
    return results;
  }
}
