import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import {
  PERSONA_EMAIL_DOMAIN,
  pickTheme,
  mulberry32,
  seedFrom,
  uuidV5,
  type ChatTheme,
} from "./roomChat.seeder";

/**
 * Drops TikTok, Instagram and Facebook links into the seeded room chats, so a
 * circle reads like people sharing clips with each other and not only typing.
 *
 * The app already does the rendering: any message whose text contains a link
 * `MessageBody` can preview becomes a tappable player card (TikTokPlayer /
 * MetaEmbedPlayer). So a link message is an ordinary text message — the same
 * `content` string every other seeded line uses — and nothing on the client
 * changes.
 *
 * Links come from two places, merged:
 *   1. `SocialFeedItem.externalUrl` — posts the Instagram / TikTok crawlers have
 *      already ingested. A post tied to a subcategory is shared in that room
 *      first. Set SEED_LINKS_FROM_FEED=0 to skip.
 *   2. `prisma/seed-assets/social-links.json` — a hand-curated list grouped by
 *      room theme. This is the only Facebook source; nothing ingests Facebook.
 *
 * Every link is checked against the same URL shapes the app previews, so
 * nothing lands as a bare unplayable URL. TikTok links are additionally checked
 * against TikTok's public oEmbed endpoint and dropped if the video is gone
 * (SEED_LINKS_VERIFY=0 to skip).
 *
 * Runs after `roomChat.seeder`: link messages are written by the personas
 * already in each room, at times inside that room's existing backlog, so they
 * interleave with the conversation instead of piling up at the end. Ids are
 * UUIDv5s keyed on room + slot, so re-running is a no-op apart from swapping a
 * slot's link when the pool has changed.
 */

type LinkPlatform = "tiktok" | "instagram" | "facebook";

type SocialLink = {
  url: string;
  platform: LinkPlatform;
  /** Optional text sent with the link instead of a generated lead-in. */
  caption?: string;
};

/** Where the curated list lives, relative to the api package root. */
const LINKS_FILE = path.resolve(__dirname, "../seed-assets/social-links.json");

/**
 * Upper bound on slots per room. Purge and shrink sweep this many, so lowering
 * SEED_LINKS_PER_ROOM later removes the slots above the new value.
 */
const MAX_SLOTS = 20;
const MAX_FOLLOW_UPS = 2;
const MAX_REACTIONS = 2;

// ── URL shapes ──────────────────────────────────────────────────────────────
// Mirrors chumme-app-v3 modules/community/utils/linkPreview.ts and metaEmbed.ts.
// A link that fails these would render as plain blue text in the app, which is
// not what this seeder is for — so it is dropped here with a warning.

const TT_ID = "\\d{15,22}";
const TIKTOK_PATTERNS = [
  new RegExp(`^https?://(?:[\\w-]+\\.)?tiktok\\.com/@[^/?#]+/video/(${TT_ID})(?:[?&#/].*)?$`, "i"),
  new RegExp(
    `^https?://(?:[\\w-]+\\.)?tiktok\\.com/(?:v|embed|embed/v2|player/v1)/(${TT_ID})(?:\\.html)?(?:[?&#/].*)?$`,
    "i",
  ),
  /^https?:\/\/(?:vt|vm)\.tiktok\.com\/[A-Za-z0-9]+\/?(?:[?#].*)?$/i,
  /^https?:\/\/(?:www\.)?tiktok\.com\/t\/[A-Za-z0-9]+\/?(?:[?#].*)?$/i,
];

const INSTAGRAM_PATTERN =
  /^https?:\/\/(?:www\.)?instagram\.com\/(?:(?!share\/)[A-Za-z0-9._]+\/)?(p|reels?|tv)\/([A-Za-z0-9_-]{5,})\/?(?:[?#].*)?$/i;

const FB_HOST = "(?:(?:www|m|web|mbasic)\\.)?facebook\\.com";
const FACEBOOK_PATTERNS = [
  new RegExp(`^https?://${FB_HOST}/reel/\\d{5,}/?(?:[?#].*)?$`, "i"),
  new RegExp(`^https?://${FB_HOST}/(?:watch/?|video\\.php)\\?(?:[^#]*&)?v=\\d{5,}(?:[&#].*)?$`, "i"),
  new RegExp(`^https?://${FB_HOST}/(?:[^/?#]+/)+videos/(?:[^/?#]+/)?\\d{5,}/?(?:[?#].*)?$`, "i"),
  new RegExp(`^https?://${FB_HOST}/share/[vr]/[A-Za-z0-9_-]{5,}/?(?:[?#].*)?$`, "i"),
  /^https?:\/\/fb\.watch\/[A-Za-z0-9_-]{5,}\/?(?:[?#].*)?$/i,
];

function classify(url: string): LinkPlatform | null {
  if (TIKTOK_PATTERNS.some((p) => p.test(url))) return "tiktok";
  if (INSTAGRAM_PATTERN.test(url)) return "instagram";
  if (FACEBOOK_PATTERNS.some((p) => p.test(url))) return "facebook";
  return null;
}

// ── What the personas say around a link ─────────────────────────────────────

/** `{url}` is replaced with the link. A bare `{url}` renders as just the card. */
const LEAD_INS: Record<LinkPlatform, string[]> = {
  tiktok: [
    "{url}",
    "this has been all over my fyp {url}",
    "ok who made this 😭 {url}",
    "saw this on tiktok and thought of this room {url}",
    "{url} the comments on this one are gold",
    "can't stop watching this {url}",
  ],
  instagram: [
    "{url}",
    "found this on ig, thoughts? {url}",
    "this reel lives in my head now {url}",
    "posting this here because nobody else i know will get it {url}",
    "{url} saw this earlier and had to share",
  ],
  facebook: [
    "{url}",
    "saw this on fb and had to share {url}",
    "my aunt shared this on facebook and honestly she was right {url}",
    "{url} this one's going around everywhere",
    "old but still one of the best {url}",
  ],
};

const FOLLOW_UPS = [
  "ok this is so good",
  "why is this so accurate 😭",
  "saving this",
  "watched it three times already",
  "the ending 😂",
  "sending this to everyone i know",
  "how did you even find this",
  "this made my day honestly",
  "not me watching this on loop",
  "the algorithm is finally doing its job",
  "i've seen this before and it still gets me",
  "need more of this in here",
];

const LINK_REACTIONS = ["🔥", "😂", "❤️", "👏", "💯", "😮"];

// ── Sources ────────────────────────────────────────────────────────────────

/**
 * Curated links, grouped by the same themes roomChat.seeder assigns rooms
 * (music, sports, gaming, food, film, tech, general). Keys starting with `_`
 * are notes, not themes. An entry is a URL string or `{ url, caption }`.
 */
function loadFileLinks(): Map<ChatTheme, SocialLink[]> {
  const byTheme = new Map<ChatTheme, SocialLink[]>();
  if (!fs.existsSync(LINKS_FILE)) {
    console.log(`ℹ️  No ${path.basename(LINKS_FILE)} — using ingested feed links only.`);
    return byTheme;
  }

  const raw = JSON.parse(fs.readFileSync(LINKS_FILE, "utf8")) as Record<string, unknown>;
  let rejected = 0;

  for (const [key, entries] of Object.entries(raw)) {
    if (key.startsWith("_") || !Array.isArray(entries)) continue;
    const theme = key as ChatTheme;
    const list: SocialLink[] = [];

    for (const entry of entries) {
      const url = (typeof entry === "string" ? entry : (entry as { url?: string })?.url)?.trim();
      const caption =
        typeof entry === "object" && entry ? (entry as { caption?: string }).caption : undefined;
      if (!url) continue;

      const platform = classify(url);
      if (!platform) {
        console.warn(`⚠️  Skipping link the app can't preview: ${url}`);
        rejected += 1;
        continue;
      }
      list.push({ url, platform, caption });
    }
    byTheme.set(theme, list);
  }

  const total = [...byTheme.values()].reduce((n, l) => n + l.length, 0);
  console.log(`📄 Curated links: ${total} usable${rejected ? `, ${rejected} rejected` : ""}.`);
  return byTheme;
}

/**
 * Posts the crawlers ingested. Highest-scoring first, so a capped pull keeps
 * the posts the feed itself ranks best. Returns those tied to a room
 * separately, so each room shares its own posts before generic ones.
 */
async function loadFeedLinks(prisma: PrismaClient) {
  const byRoom = new Map<string, SocialLink[]>();
  const unassigned: SocialLink[] = [];

  if (process.env.SEED_LINKS_FROM_FEED === "0") return { byRoom, unassigned };

  const limit = Number(process.env.SEED_LINKS_FEED_LIMIT) || 500;
  const items = await prisma.socialFeedItem.findMany({
    where: { isDeleted: false, externalUrl: { not: null } },
    select: { externalUrl: true, chummeSubCategoryId: true },
    orderBy: [{ score: "desc" }, { createdAt: "desc" }],
    take: limit,
  });

  for (const item of items) {
    const url = item.externalUrl!.trim();
    const platform = classify(url);
    if (!platform) continue;

    const link: SocialLink = { url, platform };
    if (item.chummeSubCategoryId) {
      const list = byRoom.get(item.chummeSubCategoryId) ?? [];
      list.push(link);
      byRoom.set(item.chummeSubCategoryId, list);
    } else {
      unassigned.push(link);
    }
  }

  const assigned = [...byRoom.values()].reduce((n, l) => n + l.length, 0);
  console.log(
    `📥 Feed links: ${assigned + unassigned.length} usable of ${items.length} ingested posts (${assigned} tied to a room).`,
  );
  return { byRoom, unassigned };
}

/**
 * Drop TikTok links whose video no longer exists. TikTok's oEmbed is public and
 * answers 4xx for removed or private videos. A network failure keeps the link —
 * an offline seed run shouldn't empty the pool.
 *
 * Instagram and Facebook aren't checked: Instagram's oEmbed terms limit use to
 * displaying the embed, and Facebook has no tokenless check worth trusting.
 */
async function verifyLinks(links: SocialLink[]): Promise<Set<string>> {
  const dead = new Set<string>();
  if (process.env.SEED_LINKS_VERIFY === "0") return dead;

  const tiktok = [...new Set(links.filter((l) => l.platform === "tiktok").map((l) => l.url))];
  if (tiktok.length === 0) return dead;

  let offline = 0;
  const queue = [...tiktok];
  const worker = async () => {
    for (let url = queue.shift(); url; url = queue.shift()) {
      try {
        const res = await fetch(
          `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`,
          { signal: AbortSignal.timeout(6000) },
        );
        if (res.status >= 400 && res.status < 500) dead.add(url);
      } catch {
        offline += 1;
      }
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));

  console.log(
    `🔎 TikTok links checked: ${tiktok.length - dead.size} live, ${dead.size} removed${offline ? `, ${offline} unreachable (kept)` : ""}.`,
  );
  for (const url of dead) console.warn(`   ✗ ${url}`);
  return dead;
}

// ── Seeding ────────────────────────────────────────────────────────────────

const UPDATE_CHUNK = 1000;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function slotIds(roomId: string, slot: number) {
  return {
    message: uuidV5(`link:${roomId}:${slot}`),
    followUps: Array.from({ length: MAX_FOLLOW_UPS }, (_, j) => uuidV5(`link:${roomId}:${slot}:f${j}`)),
    reactions: Array.from({ length: MAX_REACTIONS }, (_, k) => uuidV5(`link:${roomId}:${slot}:r${k}`)),
  };
}

export async function seedRoomLinks(prisma: PrismaClient) {
  console.log("🔗 Seeding TikTok / Instagram / Facebook links into community rooms...");

  const perRoom = Math.min(
    MAX_SLOTS,
    Math.max(0, Number(process.env.SEED_LINKS_PER_ROOM ?? 2) || 0),
  );

  const fileLinks = loadFileLinks();
  const feed = await loadFeedLinks(prisma);

  const everyLink = [
    ...[...fileLinks.values()].flat(),
    ...[...feed.byRoom.values()].flat(),
    ...feed.unassigned,
  ];
  if (everyLink.length === 0) {
    console.log(
      `⚠️ No usable links. Add some to ${path.relative(process.cwd(), LINKS_FILE)} or ingest posts first.`,
    );
    return;
  }

  const dead = await verifyLinks(everyLink);
  const alive = (list: SocialLink[] | undefined) => (list ?? []).filter((l) => !dead.has(l.url));

  const rooms = await prisma.chummeSubCategory.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true },
  });

  // Who can post: the personas roomChat.seeder already made members of a room.
  const memberRows = await prisma.roomUserChat.findMany({
    where: { user: { email: { endsWith: PERSONA_EMAIL_DOMAIN } } },
    select: { chummeSubCategoryId: true, userId: true },
  });
  const castByRoom = new Map<string, string[]>();
  for (const row of memberRows) {
    const list = castByRoom.get(row.chummeSubCategoryId) ?? [];
    list.push(row.userId);
    castByRoom.set(row.chummeSubCategoryId, list);
  }
  // Stable order, so the PRNG picks the same people on every run.
  for (const list of castByRoom.values()) list.sort();

  // When: the span of the room's existing seeded backlog.
  const spans = await prisma.roomMessage.groupBy({
    by: ["chummeSubCategoryId"],
    where: {
      parentMessageId: null,
      author: { email: { endsWith: PERSONA_EMAIL_DOMAIN } },
    },
    _min: { createdAt: true },
    _max: { createdAt: true },
  });
  const spanByRoom = new Map(
    spans.map((s) => [s.chummeSubCategoryId, { from: s._min.createdAt!, to: s._max.createdAt! }]),
  );

  const messages: {
    id: string;
    chummeSubCategoryId: string;
    authorId: string;
    content: string;
    createdAt: Date;
  }[] = [];
  const reactions: { id: string; messageId: string; userId: string; emoji: string; createdAt: Date }[] = [];
  const linkContent = new Map<string, string>();
  const shrinkIds: string[] = [];

  let skippedNoChat = 0;
  let skippedNoLinks = 0;
  let seededRooms = 0;
  const platformCount: Record<LinkPlatform, number> = { tiktok: 0, instagram: 0, facebook: 0 };

  for (const room of rooms) {
    // Slots above the current per-room count are cleared, so lowering the
    // setting takes effect on the next run.
    for (let slot = perRoom; slot < MAX_SLOTS; slot++) {
      const ids = slotIds(room.id, slot);
      shrinkIds.push(ids.message, ...ids.followUps);
    }

    const cast = castByRoom.get(room.id);
    const span = spanByRoom.get(room.id);
    if (!cast?.length || !span) {
      skippedNoChat += 1;
      continue;
    }

    const theme = pickTheme(room.name);
    // Own posts first, then the room's theme, then anything general. Ingested
    // feed posts are artist content, so they back up music rooms only.
    const ranked: SocialLink[] = [];
    const seen = new Set<string>();
    const add = (list: SocialLink[]) => {
      for (const link of list) {
        if (seen.has(link.url)) continue;
        seen.add(link.url);
        ranked.push(link);
      }
    };
    const rand = mulberry32(seedFrom(`links:${room.id}`));
    const shuffled = (list: SocialLink[]) => {
      const copy = [...list];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    };

    add(shuffled(alive(feed.byRoom.get(room.id))));
    add(shuffled(alive(fileLinks.get(theme))));
    if (theme === "music") add(shuffled(alive(feed.unassigned)));
    add(shuffled(alive(fileLinks.get("general"))));

    const count = Math.min(perRoom, ranked.length);
    if (count === 0) {
      skippedNoLinks += 1;
      continue;
    }
    seededRooms += 1;

    // Spread the links across the backlog: one per equal segment, placed
    // somewhere in the middle of it so they never sit on the edges.
    const from = span.from.getTime();
    const width = Math.max(span.to.getTime() - from, 60 * 60 * 1000);
    const segment = width / count;

    for (let slot = 0; slot < count; slot++) {
      const link = ranked[slot];
      const ids = slotIds(room.id, slot);
      const at = from + segment * slot + segment * (0.15 + rand() * 0.7);

      const author = cast[Math.floor(rand() * cast.length)];
      const leadIns = LEAD_INS[link.platform];
      const content = link.caption
        ? `${link.caption} ${link.url}`
        : leadIns[Math.floor(rand() * leadIns.length)].replace("{url}", link.url);

      messages.push({
        id: ids.message,
        chummeSubCategoryId: room.id,
        authorId: author,
        content,
        createdAt: new Date(at),
      });
      linkContent.set(ids.message, content);
      platformCount[link.platform] += 1;

      // Someone else answers it, a minute or few later.
      const others = cast.length > 1 ? cast.filter((id) => id !== author) : cast;
      const followUps = rand() < 0.7 ? (rand() < 0.35 ? 2 : 1) : 0;
      for (let j = 0; j < followUps; j++) {
        messages.push({
          id: ids.followUps[j],
          chummeSubCategoryId: room.id,
          authorId: others[Math.floor(rand() * others.length)],
          content: FOLLOW_UPS[Math.floor(rand() * FOLLOW_UPS.length)],
          createdAt: new Date(at + (1 + j * 2 + rand() * 2) * 60 * 1000),
        });
      }

      if (rand() < 0.55) {
        const used = new Set<string>();
        const reactorCount = rand() < 0.4 ? 2 : 1;
        for (let k = 0; k < reactorCount; k++) {
          const userId = others[Math.floor(rand() * others.length)];
          const emoji = LINK_REACTIONS[Math.floor(rand() * LINK_REACTIONS.length)];
          if (used.has(`${userId}:${emoji}`)) continue;
          used.add(`${userId}:${emoji}`);
          reactions.push({
            id: ids.reactions[k],
            messageId: ids.message,
            userId,
            emoji,
            createdAt: new Date(at + (40 + k * 50) * 1000),
          });
        }
      }
    }
  }

  const removed = await deleteLinkMessages(prisma, shrinkIds);
  if (removed) console.log(`🧹 Removed ${removed} link messages above SEED_LINKS_PER_ROOM=${perRoom}.`);

  const inserted = await prisma.roomMessage.createMany({ data: messages, skipDuplicates: true });
  console.log(`✅ Link messages + follow-ups: +${inserted.count}`);

  const insertedReactions = await prisma.roomMessageReaction.createMany({
    data: reactions,
    skipDuplicates: true,
  });
  console.log(`✅ Reactions on links: +${insertedReactions.count}`);

  // createMany never updates, so a slot whose link changed (pool edited, a
  // TikTok went dead) would keep the old one. Rewrite those in place.
  let updated = 0;
  for (const batch of chunk([...linkContent.keys()], UPDATE_CHUNK)) {
    const existing = await prisma.roomMessage.findMany({
      where: { id: { in: batch } },
      select: { id: true, content: true },
    });
    for (const row of existing) {
      const want = linkContent.get(row.id)!;
      if (row.content !== want) {
        await prisma.roomMessage.update({ where: { id: row.id }, data: { content: want } });
        updated += 1;
      }
    }
  }
  if (updated) console.log(`♻️  Link messages refreshed with a new link: ${updated}`);

  console.log(
    `🎉 Links in ${seededRooms} rooms — TikTok ${platformCount.tiktok}, Instagram ${platformCount.instagram}, Facebook ${platformCount.facebook}.` +
      (skippedNoChat ? ` ${skippedNoChat} rooms skipped with no seeded chat (run db:seed:chat first).` : "") +
      (skippedNoLinks ? ` ${skippedNoLinks} rooms had no link for their theme.` : ""),
  );
}

/**
 * Delete link messages and their follow-ups by id, reactions first. A message a
 * real user has replied to in a thread is left alone rather than taking their
 * reply with it.
 */
async function deleteLinkMessages(prisma: PrismaClient, ids: string[]): Promise<number> {
  let removed = 0;
  for (const batch of chunk(ids, UPDATE_CHUNK)) {
    const deletable = (
      await prisma.roomMessage.findMany({
        where: { id: { in: batch }, replies: { none: {} } },
        select: { id: true },
      })
    ).map((m) => m.id);
    if (deletable.length === 0) continue;

    await prisma.roomMessageReaction.deleteMany({ where: { messageId: { in: deletable } } });
    const res = await prisma.roomMessage.deleteMany({ where: { id: { in: deletable } } });
    removed += res.count;
  }
  return removed;
}

/** Remove every link message this seeder could have written, in any room. */
export async function purgeSeededLinks(prisma: PrismaClient) {
  console.log("🗑️  Purging seeded links...");
  const rooms = await prisma.chummeSubCategory.findMany({ select: { id: true } });
  const ids: string[] = [];
  for (const room of rooms) {
    for (let slot = 0; slot < MAX_SLOTS; slot++) {
      const s = slotIds(room.id, slot);
      ids.push(s.message, ...s.followUps);
    }
  }
  const removed = await deleteLinkMessages(prisma, ids);
  console.log(`✅ Links purged: ${removed} messages.`);
}
