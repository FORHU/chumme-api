import { PrismaClient } from "@prisma/client";

/**
 * Seeds the leagues the Sports tab covers, and the Circle hierarchy they hang
 * off.
 *
 * Nothing in the sports feature does anything until a SportLeague row exists:
 * both the live proxy and the poller iterate active leagues, find none, and
 * return early. This is the switch that turns the feature on.
 *
 * Each league also needs a ChummeSubCategory — a league IS a Circle in this
 * data model, and team rooms are ChummeTopicCategory rows underneath it. A
 * league with no sub-category can ingest fixtures but can never be given team
 * rooms, so the two are created together here rather than left to drift.
 *
 * Slugs are taken from the ESPN API reference in Public-ESPN-API-main
 * (`docs/sports/soccer.md`), not guessed. `espnSport` and `espnSlug` are the
 * two path segments of
 *   site.web.api.espn.com/apis/site/v2/sports/{espnSport}/{espnSlug}/scoreboard
 */

/** Marker in `note`, so a re-seed can find its own rows without touching others. */
export const SPORTS_MARKER = "[SPORTS_SEED]";

interface LeagueSeed {
  espnSport: string;
  espnSlug: string;
  name: string;
  abbreviation: string;
  /** Seconds between polls while a match is live. */
  pollIntervalSeconds?: number;
}

/**
 * Deliberately short. Every active league is one ESPN request per poll and a
 * Circle in the app whether or not anyone joins it — an empty league reads as a
 * dead product exactly like an empty room does. Add more once these have
 * traffic.
 */
const LEAGUES: LeagueSeed[] = [
  { espnSport: "soccer", espnSlug: "eng.1", name: "English Premier League", abbreviation: "EPL" },
  { espnSport: "soccer", espnSlug: "esp.1", name: "Spanish LALIGA", abbreviation: "LALIGA" },
  { espnSport: "soccer", espnSlug: "ita.1", name: "Italian Serie A", abbreviation: "SERIE A" },
  { espnSport: "soccer", espnSlug: "ger.1", name: "German Bundesliga", abbreviation: "BUND" },
  {
    espnSport: "soccer",
    espnSlug: "uefa.champions",
    name: "UEFA Champions League",
    abbreviation: "UCL",
  },
  // Basketball scores every few seconds, so `sport-room.service` suppresses
  // per-score messages here — status changes only. Kept because the fixture
  // list and the team rooms still work fine.
  { espnSport: "basketball", espnSlug: "nba", name: "NBA", abbreviation: "NBA" },
];

/** The parent every league Circle sits under. */
const PARENT_CATEGORY = "Sports";

export async function seedSportLeagues(prisma: PrismaClient) {
  // find-or-create rather than upsert: `name` is not unique, so upsert has no
  // key to match on.
  let category = await prisma.chummeCategory.findFirst({
    where: { name: PARENT_CATEGORY, deletedAt: null },
    select: { id: true },
  });

  if (!category) {
    category = await prisma.chummeCategory.create({
      data: {
        name: PARENT_CATEGORY,
        note: `${SPORTS_MARKER} Live match schedules and team rooms`,
        chummeTraits: "COMMUNITIES",
        discoveryKeywords: ["sports", "football", "soccer", "basketball", "live scores"],
      },
      select: { id: true },
    });
    console.log(`Created parent category "${PARENT_CATEGORY}"`);
  }

  let created = 0;
  let updated = 0;

  for (const league of LEAGUES) {
    // espnSlug is not unique in the schema (a slug can repeat across sports),
    // so the identity here is the sport+slug pair.
    const existing = await prisma.sportLeague.findFirst({
      where: { espnSport: league.espnSport, espnSlug: league.espnSlug },
      select: { id: true, chummeSubCategoryId: true },
    });

    if (existing) {
      // Only backfill a missing Circle link; never clobber one someone set by
      // hand to point at an existing community.
      if (!existing.chummeSubCategoryId) {
        const sub = await createLeagueCircle(prisma, category.id, league);
        await prisma.sportLeague.update({
          where: { id: existing.id },
          data: { chummeSubCategoryId: sub.id, isActive: true },
        });
        console.log(`Linked ${league.name} to a new Circle`);
      }
      updated++;
      continue;
    }

    const sub = await createLeagueCircle(prisma, category.id, league);

    await prisma.sportLeague.create({
      data: {
        espnSport: league.espnSport,
        espnSlug: league.espnSlug,
        name: league.name,
        abbreviation: league.abbreviation,
        chummeSubCategoryId: sub.id,
        isActive: true,
        ...(league.pollIntervalSeconds && {
          pollIntervalSeconds: league.pollIntervalSeconds,
        }),
      },
    });

    created++;
    console.log(`Seeded ${league.name} (${league.espnSport}/${league.espnSlug})`);
  }

  console.log(`\nLeagues: ${created} created, ${updated} already present`);
  return { created, updated };
}

function createLeagueCircle(
  prisma: PrismaClient,
  chummeCategoryId: string,
  league: LeagueSeed,
) {
  return prisma.chummeSubCategory.create({
    data: {
      name: league.name,
      note: `${SPORTS_MARKER} Team rooms and match chat`,
      chummeCategoryId,
      chummeTraits: "COMMUNITIES",
      discoveryKeywords: [league.name, league.abbreviation, league.espnSport],
    },
    select: { id: true },
  });
}
