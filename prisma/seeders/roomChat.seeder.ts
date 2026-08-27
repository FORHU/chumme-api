import { PrismaClient, UserRole, Prisma } from "@prisma/client";
import crypto from "crypto";
import { prepareVoiceClips, purgeSeededVoiceNotes } from "./voiceNotes";

/**
 * Seeds dummy chat history into every ChummeSubCategory.
 *
 * A subcategory *is* the chat room — it owns `roomMessages` and `userChatRooms`,
 * there is no separate Room table. Categories and subcategories already seed via
 * `chummeCategory.seeder.ts`, and the app's tap chain (globe → subcategory →
 * chat-room) already works end to end. What was missing is that every room
 * opened empty, so this seeder gives each one a cast of members and a plausible
 * backlog.
 *
 * Everything here is keyed on UUIDv5 ids derived from the room id, so re-running
 * is a no-op rather than a duplicate. Nothing is ever deleted — the staging
 * database is shared with other projects, so this seeder is strictly additive.
 */

/** Fixed namespace so derived ids are stable across machines and runs. */
const ROOM_CHAT_NAMESPACE = "1b4e28ba-2fa1-11d2-883f-0016d3cca427";

/**
 * RFC 4122 v5 UUID. The ids have to be real UUIDs (not arbitrary strings)
 * because Prisma declares these columns with `@default(uuid())` and callers
 * downstream validate message ids with `Joi.string().uuid()`.
 */
function uuidV5(name: string, namespace: string = ROOM_CHAT_NAMESPACE): string {
  const nsHex = namespace.replace(/-/g, "");
  const nameBytes = new TextEncoder().encode(name);

  // Uint8Array rather than Buffer throughout: @types/node models Buffer with an
  // ArrayBufferLike backing store that will not narrow to ArrayBuffer, so
  // passing one to createHash trips a variance error under this tsconfig.
  const input = new Uint8Array(16 + nameBytes.length);
  for (let i = 0; i < 16; i++) {
    input[i] = parseInt(nsHex.slice(i * 2, i * 2 + 2), 16);
  }
  input.set(nameBytes, 16);

  const digest = crypto.createHash("sha1").update(input).digest();

  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) bytes[i] = digest[i];
  bytes[6] = (bytes[6] & 0x0f) | 0x50; // version 5
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
}

/**
 * Deterministic PRNG. `Math.random` would reshuffle the cast, timing and
 * reactions on every run, which defeats the fixed-id idempotency above — the
 * rows would survive but the content they were generated from would not match.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a — turns a room id into a stable 32-bit PRNG seed. */
function seedFrom(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Synthetic members. These are real User rows because RoomMessage.authorId is a
 * foreign key and the message list renders `author.username` / `author.name`.
 *
 * The `@chumme.local` domain is unroutable on purpose: these accounts should
 * never receive mail, and the password set at creation is a throwaway random
 * value nobody holds, so none of them is loggable-into.
 */
const PERSONAS = [
  { username: "mira_dlc", name: "Mira de la Cruz", nationality: "PH" },
  { username: "kenji.aoki", name: "Kenji Aoki", nationality: "JP" },
  { username: "tashaB", name: "Tasha Brooks", nationality: "US" },
  { username: "olu_ade", name: "Olu Adeyemi", nationality: "NG" },
  { username: "sofia_rmz", name: "Sofía Ramírez", nationality: "MX" },
  { username: "danw", name: "Dan Whitfield", nationality: "GB" },
  { username: "prithvi_k", name: "Prithvi Kulkarni", nationality: "IN" },
  { username: "minseo.h", name: "Han Min-seo", nationality: "KR" },
  { username: "lucaferr", name: "Luca Ferraro", nationality: "IT" },
  { username: "amina_z", name: "Amina Zahra", nationality: "EG" },
  { username: "bea_santos", name: "Bea Santos", nationality: "PH" },
  { username: "noahk", name: "Noah Keller", nationality: "DE" },
  { username: "thao.ng", name: "Thảo Nguyễn", nationality: "VN" },
  { username: "rafa_lima", name: "Rafael Lima", nationality: "BR" },
  { username: "ines_mrt", name: "Inês Martins", nationality: "PT" },
  { username: "dmitri_v", name: "Dmitri Volkov", nationality: "RU" },
  { username: "chiara_bn", name: "Chiara Bianchi", nationality: "IT" },
  { username: "yusuf_dm", name: "Yusuf Demir", nationality: "TR" },
  { username: "leila_hd", name: "Leila Haddad", nationality: "MA" },
  { username: "jonaslk", name: "Jonas Lindqvist", nationality: "SE" },
  { username: "aisyah_r", name: "Aisyah Rahman", nationality: "MY" },
  { username: "carlos_mn", name: "Carlos Mendoza", nationality: "CO" },
  { username: "wei.chen", name: "Chen Wei", nationality: "CN" },
  { username: "nadia_ks", name: "Nadia Kowalski", nationality: "PL" },
  { username: "tomobrien", name: "Tom O'Brien", nationality: "IE" },
  { username: "priya_sh", name: "Priya Sharma", nationality: "IN" },
  { username: "andre_sv", name: "André Silva", nationality: "BR" },
  { username: "hanna_v", name: "Hanna Virtanen", nationality: "FI" },
  { username: "kwame_o", name: "Kwame Osei", nationality: "GH" },
  { username: "sara_bnt", name: "Sara Bennett", nationality: "AU" },
  { username: "hoang.tr", name: "Trần Hoàng", nationality: "VN" },
  { username: "elif_ky", name: "Elif Kaya", nationality: "TR" },
  { username: "marco_dv", name: "Marco de Vries", nationality: "NL" },
  { username: "zanele_m", name: "Zanele Mkhize", nationality: "ZA" },
  { username: "jihoon.p", name: "Park Ji-hoon", nationality: "KR" },
  { username: "clara_sh", name: "Clara Schmidt", nationality: "DE" },
  { username: "diego_ct", name: "Diego Castillo", nationality: "PE" },
  { username: "nina_pv", name: "Nina Popović", nationality: "RO" },
  { username: "arun_pl", name: "Arun Pillai", nationality: "IN" },
  { username: "yuki.tnk", name: "Yuki Tanaka", nationality: "JP" },
] as const;

type SeededPersona = { id: string; username: string };

/**
 * Conversation bursts. Each inner array is one coherent exchange rather than a
 * bag of unrelated lines — rooms filled with independently sampled sentences
 * read as noise, not as a conversation, which is the whole point of seeding.
 *
 * `{room}` interpolates the subcategory name.
 */
const SCRIPTS: Record<string, string[][]> = {
  music: [
    [
      "anyone else just find out about the new release?",
      "yes!! been on repeat since this morning",
      "the production on track 4 is unreal",
      "track 4 is the one with the string outro right",
      "yep that one. gave me chills honestly",
    ],
    [
      "what got you all into {topic}?",
      "older sibling played it constantly growing up, stuck with me",
      "for me it was a random playlist at like 2am",
      "the 2am playlist pipeline is real",
    ],
    [
      "tickets go on sale friday btw",
      "oh no my wallet",
      "setting an alarm right now, last time they sold out in 4 min",
      "4 minutes is brutal",
      "we should coordinate so someone gets through at least",
    ],
    [
      "unpopular opinion: the b-sides are better than the singles",
      "not unpopular here honestly",
      "hard disagree but respect it",
      "name one b-side that beats the lead single then",
      "i can name three, give me a sec",
    ],
    [
      "made a playlist if anyone wants it",
      "drop it!",
      "how long is it",
      "about 3 hours, no skips i promise",
      "bold claim, will be verifying",
    ],
    [
      "what are we all listening to right now",
      "same three songs on loop like always",
      "the loop is a lifestyle not a phase",
      "i have played one track 40 times this week and i regret nothing",
    ],
    [
      "trying to learn this on guitar and my fingers hate me",
      "which part, the bridge?",
      "the bridge. of course the bridge",
      "everyone dies on the bridge. keep going, it clicks suddenly",
    ],
    [
      "does anyone actually like the remix better than the original",
      "me, and i will defend it",
      "the remix has no soul, i said what i said",
      "the remix has TOO much soul that's the problem",
    ],
    [
      "found a {topic} artist with like 200 monthly listeners and they're incredible",
      "post them before they blow up so we can be smug later",
      "this is how every good recommendation starts",
      "posting now, be nice to them",
    ],
    [
      "what's the best album closer of all time",
      "oh this is a dangerous question",
      "dangerous but necessary",
      "im going with the obvious one and i don't care",
    ],
    [
      "headphones or speakers for {topic}?",
      "headphones, no contest, you miss half the mix otherwise",
      "speakers if the neighbours are out",
      "the neighbours are never out. headphones it is",
    ],
    [
      "the live version is so much better than the studio one",
      "always is honestly",
      "not always. sometimes live just means out of tune",
      "brutal but fair",
    ],
    [
      "does anyone else get emotional over a chord progression or is it just me",
      "not just you",
      "four chords and im gone, every time",
      "we're all four chords away from crying in here",
    ],
    [
      "started making my own stuff recently",
      "oh nice, what are you working with",
      "just a laptop and a cheap mic for now",
      "that's how everyone starts. post something when you're ready",
      "might take a while but i will",
    ],
    [
      "what's an album you can listen to front to back with zero skips",
      "genuinely only like three exist for me",
      "three is generous, i have one",
      "the no-skip album is rarer than people admit",
    ],
    [
      "why does everything sound so compressed these days",
      "loudness war never ended, it just got quieter about it",
      "that's a good line and also depressing",
      "the vinyl masters are usually better if you can find them",
    ],
    [
      "song that instantly takes you back to being 15?",
      "oh no. not doing this to myself today",
      "too late im already in the memory",
      "we've made a mistake as a group",
    ],
    [
      "{topic} playlist for studying — does that work for anyone?",
      "works for me but only instrumental versions",
      "lyrics kill it for me instantly",
      "same, my brain tries to sing along and nothing gets done",
    ],
    [
      "anyone going to anything live this month?",
      "small venue show next week, very excited",
      "small venues are the best format and im tired of pretending otherwise",
      "nothing beats being three metres from the stage",
    ],
    [
      "hot take: skipping tracks ruins the album",
      "depends entirely on the album",
      "the good ones earn the sequencing",
      "the bad ones you skip and feel nothing, correct",
    ],
  ],
  sports: [
    [
      "that last match was something else",
      "still not over the second half",
      "the sub at 60 changed everything honestly",
      "should have come on 20 minutes earlier",
    ],
    [
      "who are we all backing this season?",
      "same as always, suffering is a lifestyle",
      "this is the year. i say that annually",
      "the annual declaration 😭",
    ],
    [
      "stats for the season are wild if you look them up",
      "the away form is the confusing part",
      "away form has been rough for like three seasons now",
      "something structural going on there",
    ],
    [
      "anyone watching live or just highlights?",
      "live when i can, timezone makes it painful",
      "highlights gang, i value my sleep",
      "sleep is for people whose team isn't playing",
    ],
  ],
  gaming: [
    [
      "patch notes dropped",
      "please tell me they fixed the matchmaking",
      "they did not fix the matchmaking",
      "of course they didn't",
    ],
    [
      "anyone want to run something later tonight?",
      "im down, around 9?",
      "9 works, ill be on",
      "count me in too, need one more?",
    ],
    [
      "finally finished it after like 60 hours",
      "no spoilers!! im only halfway",
      "no spoilers i promise. but the ending is worth it",
      "that's all i needed to hear",
    ],
    [
      "what difficulty is everyone playing on",
      "normal, im here for the story",
      "hardest one, i enjoy suffering apparently",
      "respect. i lasted about two hours on that",
    ],
  ],
  food: [
    [
      "best thing you've eaten this week, go",
      "street food from a place near my office, no name, no sign, incredible",
      "the unmarked places are always the best ones",
      "genuinely never been wrong about that rule",
    ],
    [
      "trying to recreate a dish from memory and failing",
      "what's the dish",
      "something my grandmother made, i never got the recipe",
      "that's the hardest kind to chase honestly",
      "she used way more garlic than any recipe online admits to",
    ],
    [
      "controversial: pineapple belongs on a lot more things than people think",
      "here we go",
      "im actually with you on this one",
      "two of you. incredible.",
    ],
  ],
  film: [
    [
      "just watched it for the third time and caught something new",
      "the thing in the background of the diner scene?",
      "YES that one. how did i miss it twice",
      "everyone misses it twice. that's the trick",
    ],
    [
      "recommendations? something slow and quiet",
      "if you haven't seen it, the one about the lighthouse keeper",
      "seen it, loved it, want more of exactly that",
      "then you want the director's earlier work, it's even quieter",
    ],
    [
      "the score is doing so much heavy lifting in this",
      "genuinely half the emotional weight",
      "watch it muted sometime, it's a completely different film",
      "that's a great experiment actually",
    ],
  ],
  tech: [
    [
      "anyone else's build breaking after the update?",
      "yep, had to pin the previous version",
      "pinning worked for me too but it feels bad",
      "it does feel bad. temporary though hopefully",
    ],
    [
      "what's everyone using these days for this",
      "still on the boring stable thing, no regrets",
      "boring and stable is underrated",
      "boring and stable is the whole job honestly",
    ],
    [
      "spent four hours on a bug that was a typo",
      "the classic",
      "was it a missing await",
      "it was a missing await.",
      "it's always a missing await",
    ],
  ],
  general: [
    [
      "hey everyone, just joined {room} 👋",
      "welcome! good to have you",
      "welcome aboard",
      "thanks! what does this room usually talk about",
      "honestly a bit of everything, jump in wherever",
    ],
    [
      "how's everyone doing today",
      "surviving. long week already and it's tuesday",
      "tuesday has no business being this long",
      "genuinely the worst offender of the week",
    ],
    [
      "random question but where is everyone from",
      "manila here",
      "berlin 🇩🇪",
      "são paulo, currently very hot",
      "this room is properly global, love that",
    ],
    [
      "anyone up for a call sometime this week?",
      "would be down, evenings work better for me",
      "evenings work. timezone chaos incoming though",
      "we'll find a window, we always do",
    ],
    [
      "quiet in here today",
      "just lurking honestly",
      "lurking is participation, i don't make the rules",
      "correct and i will be citing this later",
    ],
    [
      "what's everyone working on lately",
      "nothing productive, thanks for asking",
      "honest answer, respect",
      "i've been meaning to start something for about four months",
    ],
    [
      "is it just me or has this week been extremely long",
      "not just you",
      "it's been three days and it feels like nine",
      "time is behaving strangely and nobody is addressing it",
    ],
    [
      "does anyone here actually sleep properly",
      "define properly",
      "that's a no from you then",
      "it's a no from most of us judging by the timestamps in here",
    ],
    [
      "what got you into {topic} originally?",
      "complete accident honestly",
      "same, wasn't looking for it at all",
      "the accidental ones always stick the hardest",
    ],
    [
      "unpopular opinion time. go.",
      "this always ends badly and i love it",
      "mine is so mild it's going to disappoint everyone",
      "mild opinions are the real controversy in here",
    ],
    [
      "anyone got recommendations? running low",
      "depends what mood you're after",
      "something to have on in the background mostly",
      "got a few for that, sending in a sec",
    ],
    [
      "genuinely how does everyone find the time for this",
      "i don't, i just neglect other things",
      "the honesty is refreshing",
      "we're all neglecting something to be here",
    ],
  ],
};

/**
 * Strip a trailing room-type word so `{topic}` reads naturally.
 *
 * The globe seeder names rooms `<topic> <suffix>` ("Lo-Fi Lounge", "Jazz Chat"),
 * so interpolating the full name gives "what got you into Jazz Chat?". Trimming
 * the suffix is the difference between that and "what got you into Jazz?".
 */
const ROOM_TYPE_WORDS = new Set([
  "chat", "room", "lounge", "talk", "hangout", "circle", "collective", "club",
  "sessions", "society", "guild", "crew", "nights",
]);

function topicOf(roomName: string): string {
  const words = roomName.trim().split(/\s+/);
  if (words.length > 1 && ROOM_TYPE_WORDS.has(words[words.length - 1].toLowerCase())) {
    return words.slice(0, -1).join(" ");
  }
  return roomName;
}

/** Keyword → script theme. Falls back to `general` for anything unmatched. */
const THEME_KEYWORDS: [RegExp, keyof typeof SCRIPTS][] = [
  // Deliberately broad, and checked first: the globe seeder names every room
  // from a music vocabulary (Karaoke, Falsetto, Beatmaker, Chillhop…). A
  // narrower pattern dumps most of a 650-room map into the generic bucket.
  [
    /music|pop|rock|hip.?hop|rap|drill|jazz|band|song|kpop|k-pop|opm|indie|edm|metal|karaoke|duet|vocal|lo-?fi|synthwave|acoustic|r&b|choir|producer|beat|artist|cover|ballad|folk|piano|guitar|drum|bass|remix|studio|mic|harmony|falsetto|serenade|anthem|chillhop|gospel|reggae|afrobeat|latin|ambient|soundtrack|sing|track|album|playlist|audio|sound/i,
    "music",
  ],
  [/sport|football|soccer|basketball|nba|fifa|league|team|athlet|boxing|tennis|f1|racing/i, "sports"],
  [/gam(e|ing)|esport|valorant|dota|league of legends|minecraft|roblox|console/i, "gaming"],
  [/food|cook|recipe|eat|kitchen|cuisine|coffee|baking|restaurant/i, "food"],
  [/film|movie|cinema|anime|series|drama|show/i, "film"],
  // `ai` is word-bounded — unanchored it matches inside "certain", "email" and
  // most of the alphabet, which would hijack unrelated rooms.
  [/tech|dev|code|coding|program|software|\bai\b|startup|engineer/i, "tech"],
];

function pickTheme(name: string): keyof typeof SCRIPTS {
  for (const [pattern, theme] of THEME_KEYWORDS) {
    if (pattern.test(name)) return theme;
  }
  return "general";
}

const REACTION_EMOJIS = ["👍", "🔥", "😂", "❤️", "🎧", "👏", "😮", "💯"];

const REPLY_LINES = [
  "same here honestly",
  "this is exactly it",
  "wait really?",
  "couldn't have said it better",
  "adding this to my list",
  "ok you've convinced me",
  "hard agree",
  "never thought about it like that",
  "saving this one",
  "you're right and you should say it louder",
  "this changed my mind actually",
  "been thinking about this all day",
  "genuinely did not expect that",
  "putting this on a poster",
  "screenshotting this one",
  "how did nobody say this sooner",
  "ok but consider the opposite",
  "im stealing this take",
  "finally someone said it",
  "no notes, perfect",
  "this is the correct answer",
  "took me a second but yeah, fair",
  "strong words for a tuesday",
  "i disagree but you argued it well",
  "unreasonably accurate",
];

/**
 * Create the synthetic member accounts, or return them if they already exist.
 *
 * Looked up by email rather than id because a prior run (or a human) may have
 * created a matching account, and colliding on the unique email would abort the
 * whole seed.
 */
/**
 * Give a persona a generated avatar image.
 *
 * DiceBear renders a deterministic illustration per seed, so a given username
 * always gets the same face and the rows stay stable across runs. It's a
 * third-party URL rather than an upload to our own CDN — acceptable for demo
 * accounts, and the client falls back to coloured initials if it ever fails to
 * load, so a DiceBear outage degrades rather than breaks.
 *
 * Skips users who already have an avatar so a real upload is never overwritten.
 */
async function ensureAvatar(
  prisma: PrismaClient,
  userId: string,
  username: string,
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatarId: true },
  });
  if (user?.avatarId) return;

  const fileId = uuidV5(`avatar:${username}`);
  const fileUrl = `https://api.dicebear.com/9.x/notionists/png?seed=${encodeURIComponent(
    username,
  )}&size=128&backgroundType=gradientLinear`;

  await prisma.file.upsert({
    where: { id: fileId },
    update: { fileUrl },
    create: {
      id: fileId,
      filename: `${username}-avatar.png`,
      fileUrl,
      metaData: { source: "dicebear", seeded: true },
    },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { avatarId: fileId },
  });
}

async function ensurePersonas(prisma: PrismaClient): Promise<SeededPersona[]> {
  const seeded: SeededPersona[] = [];

  for (const persona of PERSONAS) {
    const email = `${persona.username.replace(/[^a-z0-9]/gi, "")}@chumme.local`;
    const id = uuidV5(`persona:${persona.username}`);

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username: persona.username }] },
      select: { id: true, username: true },
    });

    if (existing) {
      // Backfill avatars onto personas created before this seeder set them,
      // otherwise the first run's accounts keep blank discs forever.
      await ensureAvatar(prisma, existing.id, persona.username);
      seeded.push(existing);
      continue;
    }

    // Unusable credentials — random secret, never printed, never stored.
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto
      .pbkdf2Sync(crypto.randomBytes(32).toString("hex"), salt, 1000, 64, "sha512")
      .toString("hex");

    const created = await prisma.user.create({
      data: {
        id,
        email,
        username: persona.username,
        name: persona.name,
        nationality: persona.nationality,
        password: `${salt}:${hash}`,
        role: UserRole.USER,
        isEmailVerified: true,
        onboardingCompleted: true,
      },
      select: { id: true, username: true },
    });

    await ensureAvatar(prisma, created.id, persona.username);
    seeded.push(created);
  }

  console.log(`👥 Chat personas ready: ${seeded.length}`);
  return seeded;
}

type PendingMessage = {
  id: string;
  chummeSubCategoryId: string;
  authorId: string;
  /**
   * Null for voice notes — the bubble renders the player instead of text.
   * `content` is a Prisma `Json?` column, and a Json field needs the explicit
   * `Prisma.DbNull` sentinel to mean SQL NULL; a bare `null` is rejected
   * because it's ambiguous with a stored JSON `null`.
   */
  content: string | typeof Prisma.DbNull;
  createdAt: Date;
  parentMessageId?: string;
  voiceMessageId?: string;
};

type PendingReaction = {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: Date;
};

export async function seedRoomChats(prisma: PrismaClient) {
  console.log("🌱 Seeding dummy chat history into community rooms...");

  const messagesPerRoom = Number(process.env.SEED_CHAT_MESSAGES_PER_ROOM) || 24;
  // High enough to cover every room the globe seeder creates (~654). The cap
  // exists as a brake for ad-hoc runs, not as a default that silently leaves
  // two thirds of the map opening into empty rooms.
  const roomLimit = Number(process.env.SEED_CHAT_ROOM_LIMIT) || 2000;

  const rooms = await prisma.chummeSubCategory.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, chummeCategoryId: true },
    orderBy: { createdAt: "asc" },
    take: roomLimit,
  });

  if (rooms.length === 0) {
    console.log("⚠️ No subcategories found. Run the category seeder first.");
    return;
  }

  const personas = await ensurePersonas(prisma);
  const voiceClips = await prepareVoiceClips(prisma);

  // Share of messages that become voice notes. Kept low on purpose: a room
  // where every third message is a voice note is not what a busy chat looks
  // like, and it makes the text content impossible to skim.
  const voiceRatio = voiceClips.length
    ? Number(process.env.SEED_VOICE_RATIO) || 0.12
    : 0;

  // Voice notes arrive in runs, not sprinkled one at a time. When someone sends
  // one the room tends to answer in kind for a few messages before dropping
  // back to text, so an independent per-message coin flip — which is what this
  // used to be — reads wrong: at a 12% rate almost every note lands alone.
  //
  // A run's length is drawn up front rather than ended by a per-message coin
  // flip. A geometric chain has its mode at 1 whatever mean you give it — at
  // SEED_VOICE_RUN=5 a quarter of runs still came out as lone notes, which is
  // the exact thing this exists to prevent. Drawing from a band around the
  // target instead puts the mode where it was asked for.
  //
  // `pStart` is solved so the overall share still lands on SEED_VOICE_RATIO:
  // runs of mean length L separated by gaps of mean 1/pStart give
  //
  //   share = L / (L + 1/pStart)  ==  voiceRatio
  //
  // so raising SEED_VOICE_RUN clusters the same number of notes into fewer,
  // longer runs rather than adding more of them.
  const voiceRun = Math.max(1, Number(process.env.SEED_VOICE_RUN) || 5);
  const runLo = Math.max(1, Math.round(voiceRun * 0.6));
  const runHi = Math.max(runLo, Math.round(voiceRun * 1.4));
  const pStart =
    voiceRatio > 0
      ? Math.min(1, voiceRatio / (voiceRun * (1 - voiceRatio)))
      : 0;

  const memberships: {
    id: string;
    userId: string;
    chummeSubCategoryId: string;
    joinedAt: Date;
  }[] = [];
  const topLevel: PendingMessage[] = [];
  const replies: PendingMessage[] = [];
  const reactions: PendingReaction[] = [];

  const now = Date.now();
  const touchedCategoryIds = new Set<string>();

  for (const room of rooms) {
    touchedCategoryIds.add(room.chummeCategoryId);

    const rand = mulberry32(seedFrom(room.id));
    const theme = pickTheme(room.name);
    const bursts = SCRIPTS[theme];

    // A distinct cast per room, so adjacent rooms don't read as the same few
    // people talking to themselves everywhere. Fisher-Yates rather than
    // `sort(() => rand() - 0.5)`: a comparator-based shuffle is measurably
    // biased, which at 650+ rooms would visibly favour the same few personas.
    const shuffled = [...personas];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    // Varying the size matters as much as varying the members — a fixed 5
    // everywhere is a pattern you notice after scrolling a few rooms.
    const cast = shuffled.slice(0, 4 + Math.floor(rand() * 4));

    for (const [index, member] of cast.entries()) {
      memberships.push({
        id: uuidV5(`member:${room.id}:${member.id}`),
        userId: member.id,
        chummeSubCategoryId: room.id,
        // Members joined before the backlog they produced.
        joinedAt: new Date(now - (7 + index) * 24 * 60 * 60 * 1000),
      });
    }

    // Build with *relative* timing first — lines within a burst land minutes
    // apart, bursts land hours apart. The absolute window is fitted afterwards,
    // because generating straight onto wall-clock time packs the whole backlog
    // into one afternoon and every room reads as abandoned.
    type Draft = {
      authorId: string;
      content: string;
      /** Delay before this line, in ms. Meaning depends on `burstStart`. */
      gap: number;
      /** First line of a burst — its gap is elastic and gets fitted below. */
      burstStart: boolean;
      replies: { authorId: string; content: string }[];
      reactions: { userId: string; emoji: string }[];
    };
    const drafts: Draft[] = [];

    // Sample bursts without replacement rather than rotating through the list
    // from a random start. Rotation gives every room the same conversations in
    // a shifted order — with ~6 bursts needed per room, sampling from 20 is the
    // difference between 20 variants and genuinely distinct rooms.
    const deck = [...bursts];
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    let burstIndex = 0;
    let speakerOffset = Math.floor(rand() * cast.length);

    while (drafts.length < messagesPerRoom) {
      // Reshuffling on wrap keeps the tail of a long room from replaying the
      // head in order, for the rare case the deck runs out.
      if (burstIndex >= deck.length) {
        burstIndex = 0;
        for (let i = deck.length - 1; i > 0; i--) {
          const j = Math.floor(rand() * (i + 1));
          [deck[i], deck[j]] = [deck[j], deck[i]];
        }
      }
      const burst = deck[burstIndex];
      burstIndex += 1;

      for (const [lineIndex, rawLine] of burst.entries()) {
        if (drafts.length >= messagesPerRoom) break;

        const burstStart = lineIndex === 0;

        const draft: Draft = {
          authorId: cast[(speakerOffset + lineIndex) % cast.length].id,
          content: rawLine
            .replace(/\{room\}/g, room.name)
            .replace(/\{topic\}/g, topicOf(room.name)),
          // Lines answering each other are a couple of minutes apart and stay
          // that way; the elastic weight on a burst start is resolved later.
          gap: burstStart ? 1 + rand() : (1 + rand() * 5) * 60 * 1000,
          burstStart,
          replies: [],
          reactions: [],
        };

        // Threaded replies never appear in the main list — the repository
        // filters on `parentMessageId: null`. They exist so the "N replies"
        // affordance on the bubble has something to open.
        if (rand() < 0.18) {
          const replyCount = rand() < 0.35 ? 2 : 1;
          for (let r = 0; r < replyCount; r++) {
            draft.replies.push({
              authorId: cast[Math.floor(rand() * cast.length)].id,
              content: REPLY_LINES[Math.floor(rand() * REPLY_LINES.length)],
            });
          }
        }

        if (rand() < 0.25) {
          const reactorCount = rand() < 0.3 ? 2 : 1;
          const used = new Set<string>();
          for (let k = 0; k < reactorCount; k++) {
            const userId = cast[Math.floor(rand() * cast.length)].id;
            const emoji = REACTION_EMOJIS[Math.floor(rand() * REACTION_EMOJIS.length)];
            // The table is unique on (messageId, userId, emoji); a duplicate
            // within one payload would be dropped silently, so skip it here to
            // keep the intended reactor count honest.
            const key = `${userId}:${emoji}`;
            if (used.has(key)) continue;
            used.add(key);
            draft.reactions.push({ userId, emoji });
          }
        }

        drafts.push(draft);
      }

      speakerOffset += 2;
    }

    // Fit the backlog to [5 days ago → a few minutes ago] by absorbing the
    // slack into the gaps *between* bursts only. Scaling every gap uniformly
    // would stretch a two-minute reply into a ninety-minute one and destroy the
    // rhythm the bursts exist to create.
    const windowStart = now - 5 * 24 * 60 * 60 * 1000;
    const windowEnd = now - (4 + rand() * 90) * 60 * 1000;

    const withinTotal = drafts
      .filter((d) => !d.burstStart)
      .reduce((sum, d) => sum + d.gap, 0);
    const elasticWeight = drafts
      .filter((d) => d.burstStart)
      .reduce((sum, d) => sum + d.gap, 0) || 1;
    // Never let a fitted gap go negative if a room happens to be all one burst.
    const elasticTotal = Math.max(windowEnd - windowStart - withinTotal, 0);

    // Which messages in this room are voice notes, decided before the layout
    // loop so the room can be inspected as a whole afterwards.
    //
    // Runs are deliberately not broken at burst boundaries. Grouping is a
    // visual property — what matters is that the bubbles sit next to each other
    // in the scroll, not that they share a sitting.
    const voiceAt: boolean[] = new Array(drafts.length).fill(false);

    if (voiceRatio > 0 && voiceClips.length > 0) {
      let runLeft = 0;
      for (let i = 0; i < drafts.length; i++) {
        if (runLeft > 0) {
          runLeft -= 1;
          voiceAt[i] = true;
        } else if (rand() < pStart) {
          // Commit to the whole run here. Ending it by coin flip instead would
          // put the mode back at 1 and undo the clustering.
          runLeft = runLo + Math.floor(rand() * (runHi - runLo + 1)) - 1;
          voiceAt[i] = true;
        }
      }

      // Guarantee every room opens at least one run. At the rates involved a
      // room of ~24 messages has roughly a one-in-three chance of drawing none
      // at all, which left half the rooms — and whole countries — silent. A
      // community whose rooms are entirely text reads as dead next to one with
      // voice, and that is a property of the seed, not of the country.
      if (!voiceAt.some(Boolean)) {
        const len = Math.min(
          drafts.length,
          runLo + Math.floor(rand() * (runHi - runLo + 1)),
        );
        const start = Math.floor(rand() * (drafts.length - len + 1));
        for (let i = start; i < start + len; i++) voiceAt[i] = true;
      }
    }

    let cursor = windowStart;

    for (const [index, draft] of drafts.entries()) {
      cursor += draft.burstStart
        ? (draft.gap / elasticWeight) * elasticTotal
        : draft.gap;

      const at = cursor;
      const messageId = uuidV5(`msg:${room.id}:${index}`);

      // A voice note replaces the line's text rather than accompanying it —
      // the client keys off `voiceMessage` and never renders both.
      const clip = voiceAt[index]
        ? voiceClips[Math.floor(rand() * voiceClips.length)]
        : null;

      topLevel.push({
        id: messageId,
        chummeSubCategoryId: room.id,
        authorId: draft.authorId,
        content: clip ? Prisma.DbNull : draft.content,
        createdAt: new Date(at),
        ...(clip ? { voiceMessageId: clip.fileId } : {}),
      });

      for (const [r, reply] of draft.replies.entries()) {
        replies.push({
          id: uuidV5(`reply:${room.id}:${index}:${r}`),
          chummeSubCategoryId: room.id,
          authorId: reply.authorId,
          content: reply.content,
          // Derived from the scaled parent rather than scaled themselves — a
          // 2-minute reply gap multiplied by the stretch factor would become
          // half an hour.
          createdAt: new Date(at + (2 + r * 3) * 60 * 1000),
          parentMessageId: messageId,
        });
      }

      for (const [k, reaction] of draft.reactions.entries()) {
        reactions.push({
          id: uuidV5(`react:${room.id}:${index}:${k}`),
          messageId,
          userId: reaction.userId,
          emoji: reaction.emoji,
          createdAt: new Date(at + (60 + k * 45) * 1000),
        });
      }
    }
  }

  // `skipDuplicates` is what makes re-running safe: every id above is derived
  // from the room id, so a second run collides with itself and inserts nothing.
  const insertedMembers = await prisma.roomUserChat.createMany({
    data: memberships,
    skipDuplicates: true,
  });
  console.log(`✅ Room memberships: +${insertedMembers.count}`);

  const insertedTopLevel = await prisma.roomMessage.createMany({
    data: topLevel,
    skipDuplicates: true,
  });
  console.log(`✅ Top-level messages: +${insertedTopLevel.count}`);

  // Replies go in a second pass — the FK to parentMessageId cannot resolve
  // until the parents are committed.
  const insertedReplies = await prisma.roomMessage.createMany({
    data: replies,
    skipDuplicates: true,
  });
  console.log(`✅ Threaded replies: +${insertedReplies.count}`);

  const insertedReactions = await prisma.roomMessageReaction.createMany({
    data: reactions,
    skipDuplicates: true,
  });
  console.log(`✅ Reactions: +${insertedReactions.count}`);

  const voiceCount = topLevel.filter((m) => m.voiceMessageId).length;
  if (voiceCount) {
    console.log(
      `🎤 Voice notes: ${voiceCount} of ${topLevel.length} messages (${Math.round((voiceCount / topLevel.length) * 100)}%)`,
    );
  }

  await reconcileVoiceNotes(prisma, topLevel);

  await recalculatePopulationCounts(prisma, rooms.map((r) => r.id), touchedCategoryIds);

  console.log(
    `🎉 Seeded chat history across ${rooms.length} rooms (~${messagesPerRoom} messages each).`,
  );
}

/** Postgres copes with far larger `IN` lists, but this keeps statements sane. */
const UPDATE_CHUNK = 1000;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Apply voice-note attachments to messages that already exist.
 *
 * `createMany({ skipDuplicates: true })` inserts but never updates, and every
 * message id is a UUIDv5 derived from its room — so on any re-run the whole
 * batch collides with the previous run and is silently skipped. That is exactly
 * what we want for the *content* (it keeps rooms stable), but it means a message
 * can never gain a voice note it didn't have the first time. Reconciling here is
 * what makes adding clips to `seed-assets/voice/` take effect without wiping the
 * database first.
 *
 * Updates are grouped by clip rather than issued per row: `updateMany` sets one
 * value per call, and there are only a handful of clips.
 */
async function reconcileVoiceNotes(
  prisma: PrismaClient,
  drafts: PendingMessage[],
) {
  const withVoice = drafts.filter((d) => d.voiceMessageId);
  const withoutVoice = drafts.filter((d) => !d.voiceMessageId);

  const byClip = new Map<string, string[]>();
  for (const draft of withVoice) {
    const list = byClip.get(draft.voiceMessageId!) ?? [];
    list.push(draft.id);
    byClip.set(draft.voiceMessageId!, list);
  }

  let attached = 0;
  for (const [fileId, ids] of byClip) {
    for (const batch of chunk(ids, UPDATE_CHUNK)) {
      // The `voiceMessageId: null` guard makes repeat runs cheap and stops a
      // message from being reshuffled onto a different clip each time.
      const res = await prisma.roomMessage.updateMany({
        where: { id: { in: batch }, voiceMessageId: null },
        data: { voiceMessageId: fileId, content: Prisma.DbNull },
      });
      attached += res.count;
    }
  }

  // The reverse case: clips removed, or SEED_VOICE_RATIO lowered. Give those
  // messages their text back rather than leaving a player with no audio.
  const contentById = new Map(withoutVoice.map((d) => [d.id, d.content]));
  let reverted = 0;
  for (const batch of chunk(withoutVoice.map((d) => d.id), UPDATE_CHUNK)) {
    const stale = await prisma.roomMessage.findMany({
      where: { id: { in: batch }, voiceMessageId: { not: null } },
      select: { id: true },
    });
    for (const row of stale) {
      await prisma.roomMessage.update({
        where: { id: row.id },
        data: {
          voiceMessageId: null,
          content: contentById.get(row.id) ?? Prisma.DbNull,
        },
      });
      reverted += 1;
    }
  }

  if (attached || reverted) {
    console.log(
      `🎤 Voice notes reconciled: ${attached} attached, ${reverted} reverted to text.`,
    );
  }
}

/** Domain every synthetic persona's email ends with. Never routable. */
const PERSONA_EMAIL_DOMAIN = "@chumme.local";

/**
 * Remove everything the chat seeder created, anywhere in the database.
 *
 * Identified by authorship rather than by id: the message ids are UUIDv5s
 * derived from room ids, so reconstructing them would mean knowing every room
 * that was ever seeded. Every seeded message is written by a persona, and
 * personas are exactly the accounts on the `@chumme.local` domain — so that set
 * is both complete and safe.
 *
 * Deletion order follows the foreign keys: reactions, then replies before their
 * parents (the self-relation), then memberships, then the avatars, then the
 * accounts themselves.
 */
export async function purgeSeededChat(prisma: PrismaClient) {
  console.log("🗑️  Purging seeded chat...");

  await purgeSeededVoiceNotes(prisma);

  const personas = await prisma.user.findMany({
    where: { email: { endsWith: PERSONA_EMAIL_DOMAIN } },
    select: { id: true, avatarId: true },
  });

  if (personas.length === 0) {
    console.log("Nothing to purge — no persona accounts found.");
    return;
  }

  const userIds = personas.map((p) => p.id);
  const avatarIds = personas
    .map((p) => p.avatarId)
    .filter((id): id is string => Boolean(id));

  const messageIds = (
    await prisma.roomMessage.findMany({
      where: { authorId: { in: userIds } },
      select: { id: true },
    })
  ).map((m) => m.id);

  // Reactions on seeded messages go regardless of who left them — a real user
  // reacting to a seeded message would otherwise block the delete.
  const reactions = await prisma.roomMessageReaction.deleteMany({
    where: { OR: [{ messageId: { in: messageIds } }, { userId: { in: userIds } }] },
  });

  const replies = await prisma.roomMessage.deleteMany({
    where: { authorId: { in: userIds }, parentMessageId: { not: null } },
  });
  const messages = await prisma.roomMessage.deleteMany({
    where: { authorId: { in: userIds } },
  });
  const members = await prisma.roomUserChat.deleteMany({
    where: { userId: { in: userIds } },
  });

  // Break the User → File link before removing the avatars it points at.
  await prisma.user.updateMany({
    where: { id: { in: userIds } },
    data: { avatarId: null },
  });
  const avatars = await prisma.file.deleteMany({
    where: { id: { in: avatarIds } },
  });

  const users = await prisma.user.deleteMany({ where: { id: { in: userIds } } });

  console.log(
    `✅ Chat purged: ${messages.count + replies.count} messages, ${reactions.count} reactions, ${members.count} memberships, ${avatars.count} avatars, ${users.count} personas.`,
  );
}

/**
 * Raise the denormalised member counters to match reality where they undercount.
 *
 * `RoomUserChatRepo.join` increments `populationCount` on both the subcategory
 * and its parent category as a side effect of joining. Inserting membership
 * rows directly bypasses that, which would leave the globe's heat layer and the
 * "N members" labels reading zero on rooms that visibly have members.
 *
 * This only ever raises a counter, never lowers it. `globeCommunities.seeder`
 * writes a synthetic populationCount to drive the heatmap — a community showing
 * 450 members is backed by 5 real persona rows, because backing it literally
 * would mean seeding 450 user accounts per circle. Recomputing downward here
 * would flatten every one of those to 5 and wipe the heat ramp out.
 */
async function recalculatePopulationCounts(
  prisma: PrismaClient,
  roomIds: string[],
  categoryIds: Set<string>,
) {
  const perRoom = await prisma.roomUserChat.groupBy({
    by: ["chummeSubCategoryId"],
    where: { chummeSubCategoryId: { in: roomIds } },
    _count: { _all: true },
  });
  const membersByRoom = new Map(
    perRoom.map((r) => [r.chummeSubCategoryId, r._count._all]),
  );

  const rooms = await prisma.chummeSubCategory.findMany({
    where: { id: { in: roomIds } },
    select: { id: true, populationCount: true },
  });

  let raisedRooms = 0;
  for (const room of rooms) {
    const actual = membersByRoom.get(room.id) ?? 0;
    if (actual > room.populationCount) {
      await prisma.chummeSubCategory.update({
        where: { id: room.id },
        data: { populationCount: actual },
      });
      raisedRooms += 1;
    }
  }

  // A category's real population is the membership total across *all* of its
  // subcategories, not just the ones this run touched — so gather them all
  // rather than reusing the room list above.
  const ids = [...categoryIds];
  const allSubs = await prisma.chummeSubCategory.findMany({
    where: { chummeCategoryId: { in: ids } },
    select: { id: true, chummeCategoryId: true },
  });

  const allMembers = await prisma.roomUserChat.groupBy({
    by: ["chummeSubCategoryId"],
    where: { chummeSubCategoryId: { in: allSubs.map((s) => s.id) } },
    _count: { _all: true },
  });
  const countBySub = new Map(
    allMembers.map((r) => [r.chummeSubCategoryId, r._count._all]),
  );

  const totalByCategory = new Map<string, number>();
  for (const sub of allSubs) {
    totalByCategory.set(
      sub.chummeCategoryId,
      (totalByCategory.get(sub.chummeCategoryId) ?? 0) + (countBySub.get(sub.id) ?? 0),
    );
  }

  const cats = await prisma.chummeCategory.findMany({
    where: { id: { in: ids } },
    select: { id: true, populationCount: true },
  });

  let raisedCats = 0;
  for (const cat of cats) {
    const actual = totalByCategory.get(cat.id) ?? 0;
    if (actual > cat.populationCount) {
      await prisma.chummeCategory.update({
        where: { id: cat.id },
        data: { populationCount: actual },
      });
      raisedCats += 1;
    }
  }

  console.log(
    `📊 Population counts raised on ${raisedRooms}/${rooms.length} rooms and ${raisedCats}/${cats.length} categories (existing higher values preserved).`,
  );
}
