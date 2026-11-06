import { PrismaClient } from "@prisma/client";
import path from "path";
import { PERSONA_EMAIL_DOMAIN, mulberry32, seedFrom, uuidV5 } from "./roomChat.seeder";
import { prepareVoiceClips, VoiceClip } from "./voiceNotes";

/**
 * Fans talking in match rooms: text and voice notes from both sides, so a
 * fixture opens onto a crowd instead of an empty room.
 *
 * Authors are the `@chumme.local` personas the room-chat seeder creates (run
 * `npm run db:seed:chat` first). Each match gets its own cast, split between
 * the two teams — `sportTeamId` is what puts a message in that fan's column.
 *
 * Voice notes come from `prisma/seed-assets/sport-voice/` (crowd chants, fans
 * shouting), falling back to `prisma/seed-assets/voice/` when that is empty.
 *
 * Every message is timestamped in the past, around the match's kickoff: build-up
 * before it, reactions during, verdicts after. An upcoming match gets build-up
 * only. Ids are UUIDv5s keyed on match + slot, so re-running adds nothing new.
 *
 * Tuning (env):
 *   SEED_SPORT_CHAT_PER_MATCH   messages per match           (default 18)
 *   SEED_SPORT_VOICE_RATIO      share that are voice notes   (default 0.3)
 *   SEED_SPORT_CHAT_DAYS        matches within ± this many days of now (default 3)
 *   SEED_SPORT_CHAT_MATCHES     at most this many matches    (default 60)
 */

const SPORT_CHAT_NAMESPACE = "4b8e1d2c-9f63-4a57-b0e8-3c71d5a2f914";
const SPORT_VOICE_DIR = path.join(__dirname, "..", "seed-assets", "sport-voice");

const HOUR = 60 * 60 * 1000;
/** Rough match length; long enough for football with stoppage and the NBA. */
const MATCH_LENGTH = 2 * HOUR;

/** {team} is the author's side, {rival} the other one. */
const LINES = {
  pre: [
    "let's go {team}!! 🔥",
    "{team} win this one, calling it now",
    "nervous about this one ngl",
    "{rival} fans awfully quiet today 👀",
    "who's watching from home?",
    "lineup looks strong for {team}",
    "if {team} score first it's over",
    "need 3 points today, no excuses",
    "{rival} haven't beaten us in ages",
    "can't wait for kickoff 😤",
    "prediction: 2-1 {team}",
    "this is the game of the week",
  ],
  live: [
    "WHAT A GOAL 😱",
    "come onnnn {team}",
    "ref is blind 🙄",
    "that was never a foul",
    "{rival} parking the bus already",
    "we need a sub, legs are gone",
    "keeper is having a blinder",
    "how was that not a penalty??",
    "{team} all over them right now",
    "my heart can't take this",
    "unlucky! so close",
    "this atmosphere though 🔊",
    "{rival} fans gone silent lol",
    "keep the ball!!",
  ],
  post: [
    "what a game 👏",
    "proud of {team} today",
    "robbed. absolutely robbed",
    "{rival} were lucky, simple as",
    "MOTM easily",
    "on to the next one 💪",
    "deserved that",
    "gg {rival} fans, see you next time",
  ],
};

type Phase = keyof typeof LINES;

const phaseAt = (t: number, kickoff: number): Phase =>
  t < kickoff ? "pre" : t < kickoff + MATCH_LENGTH ? "live" : "post";

/** The slot ids for one match, so seeding and purging agree on them. */
const messageId = (eventId: string, slot: number) =>
  uuidV5(`sportchat:${eventId}:${slot}`, SPORT_CHAT_NAMESPACE);

export async function seedSportChat(prisma: PrismaClient) {
  console.log("🏟️  Seeding fan chat into match rooms...");

  const perMatch = Math.max(1, Number(process.env.SEED_SPORT_CHAT_PER_MATCH) || 18);
  const days = Math.max(1, Number(process.env.SEED_SPORT_CHAT_DAYS) || 3);
  const maxMatches = Math.max(1, Number(process.env.SEED_SPORT_CHAT_MATCHES) || 60);

  const personas = await prisma.user.findMany({
    where: { email: { endsWith: PERSONA_EMAIL_DOMAIN } },
    select: { id: true },
    orderBy: { id: "asc" },
  });
  if (personas.length < 2) {
    console.log("⚠️ No seeded personas to post as. Run `npm run db:seed:chat` first.");
    return;
  }

  let clips: VoiceClip[] = await prepareVoiceClips(prisma, SPORT_VOICE_DIR);
  if (clips.length === 0) clips = await prepareVoiceClips(prisma);
  const voiceRatio = clips.length
    ? Math.min(1, Math.max(0, Number(process.env.SEED_SPORT_VOICE_RATIO ?? 0.3)))
    : 0;

  const now = Date.now();
  const events = await prisma.sportEvent.findMany({
    where: {
      gameDate: { gte: new Date(now - days * 24 * HOUR), lte: new Date(now + days * 24 * HOUR) },
      status: { notIn: ["POSTPONED", "CANCELLED"] },
    },
    select: { id: true, gameDate: true, homeTeamId: true, awayTeamId: true },
  });
  // Closest to now first: those are the rooms people actually open.
  events.sort(
    (a, b) => Math.abs(a.gameDate.getTime() - now) - Math.abs(b.gameDate.getTime() - now),
  );
  const chosen = events.slice(0, maxMatches);
  if (chosen.length === 0) {
    console.log(
      `⚠️ No matches within ${days} days of now. Run db:seed:sports or db:seed:sports:demo first.`,
    );
    return;
  }

  const teamIds = [...new Set(chosen.flatMap((e) => [e.homeTeamId, e.awayTeamId]))];
  const teams = await prisma.sportTeam.findMany({
    where: { id: { in: teamIds } },
    select: { id: true, name: true },
  });
  const teamName = new Map(teams.map((t) => [t.id, t.name]));

  const rows: {
    id: string;
    sportEventId: string;
    sportTeamId: string;
    authorId: string;
    content: string | null;
    voiceMessageId: string | null;
    createdAt: Date;
  }[] = [];
  let voiceCount = 0;

  for (const event of chosen) {
    const rand = mulberry32(seedFrom(`sportchat:${event.id}`));
    const kickoff = event.gameDate.getTime();

    // Build-up starts a few hours out; chat stops at "now" so nothing is
    // timestamped in the future, and two hours after the final whistle.
    const end = Math.min(now, kickoff + MATCH_LENGTH + 2 * HOUR);
    const start = kickoff > now ? now - 6 * HOUR : kickoff - 2 * HOUR;
    if (end <= start) continue;

    // 6–10 fans, each loyal to one side.
    const castSize = Math.min(personas.length, 6 + Math.floor(rand() * 5));
    const cast = [...personas]
      .sort(() => rand() - 0.5)
      .slice(0, castSize)
      .map((p, i) => ({
        id: p.id,
        side: i % 2 === 0 ? event.homeTeamId : event.awayTeamId,
      }));

    const times = Array.from({ length: perMatch }, () => start + rand() * (end - start)).sort(
      (a, b) => a - b,
    );

    times.forEach((t, slot) => {
      const fan = cast[Math.floor(rand() * cast.length)];
      const rival = fan.side === event.homeTeamId ? event.awayTeamId : event.homeTeamId;
      const isVoice = rand() < voiceRatio;

      let content: string | null = null;
      let voiceMessageId: string | null = null;
      if (isVoice) {
        voiceMessageId = clips[Math.floor(rand() * clips.length)].fileId;
        voiceCount += 1;
      } else {
        const pool = LINES[phaseAt(t, kickoff)];
        content = pool[Math.floor(rand() * pool.length)]
          .replace("{team}", teamName.get(fan.side) ?? "us")
          .replace("{rival}", teamName.get(rival) ?? "them");
      }

      rows.push({
        id: messageId(event.id, slot),
        sportEventId: event.id,
        sportTeamId: fan.side,
        authorId: fan.id,
        content,
        voiceMessageId,
        createdAt: new Date(t),
      });
    });
  }

  const inserted = await prisma.sportRoomMessage.createMany({ data: rows, skipDuplicates: true });
  console.log(
    `✅ Match chat: +${inserted.count} messages across ${chosen.length} matches ` +
      `(${voiceCount} voice notes planned, ${rows.length - inserted.count} already there).`,
  );
}

/** Remove every match-room message the personas posted. */
export async function purgeSportChat(prisma: PrismaClient) {
  const removed = await prisma.sportRoomMessage.deleteMany({
    where: { author: { email: { endsWith: PERSONA_EMAIL_DOMAIN } } },
  });
  console.log(`✅ Match chat purged: ${removed.count} messages.`);
}
