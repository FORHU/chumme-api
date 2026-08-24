import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import { cityPositionFor, CITY_COORDINATES } from "./cityCoordinates";

/**
 * Seeds a worldwide spread of communities so the Circles globe has enough
 * density for its heat layer to actually read as a heat map.
 *
 * The app already shipped a client-side fixture for this
 * (`modules/community/fixtures/dummyCommunities.ts`, currently gated off by
 * DUMMY_GLOBE_ENABLED). That fixture solved the visual problem but the circles
 * were inert — tapping one had to be remapped onto a real category because
 * there was nothing behind it. These are real rows, so every circle on the
 * globe opens into real subcategories and real chat.
 *
 * The region table, the anchor logic and the member-count curves below are
 * ported verbatim from that fixture, because those numbers were tuned against
 * the actual heatmapWeight stops in GlobeMapCanvas:
 *
 *   heatmapWeight interpolates on sqrt(membersCount): 0 → 0.15, 8 → 0.5, 25 → 1
 *
 * so membersCount ~64 is a mid-weight circle and ~625 saturates. Re-deriving
 * them by feel would decalibrate the ramp.
 *
 * Every row carries GLOBE_MARKER in its note, and `purgeGlobeCommunities`
 * removes exactly those rows — this has to be reversible because the staging
 * database is shared with other projects.
 */

/** Tags seeded rows for identification and cleanup. Do not change casually. */
export const GLOBE_MARKER = "[seeded:globe]";

const GLOBE_NAMESPACE = "3d8e0a52-9f47-4b1e-8c6a-2f5b7d9e1a30";

function uuidV5(name: string, namespace: string = GLOBE_NAMESPACE): string {
  const nsHex = namespace.replace(/-/g, "");
  const nameBytes = new TextEncoder().encode(name);

  const input = new Uint8Array(16 + nameBytes.length);
  for (let i = 0; i < 16; i++) {
    input[i] = parseInt(nsHex.slice(i * 2, i * 2 + 2), 16);
  }
  input.set(nameBytes, 16);

  const digest = crypto.createHash("sha1").update(input).digest();

  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) bytes[i] = digest[i];
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
}

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

function pick<T>(arr: readonly T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)];
}

/**
 * `[ISO-3166 alpha-2, community count, heat bias]`.
 *
 * Every code here resolves in the client's `countryCentroids` table — a code it
 * cannot place falls through to a hash-picked land centroid, which would drop
 * the community somewhere unrelated to its own name.
 */
const SEED_REGIONS: [string, number, number][] = [
  // Primary hotspots — dense and busy, these should burn red at globe zoom.
  ["PH", 34, 1.0],
  ["US", 30, 1.0],
  ["IN", 26, 0.95],
  ["ID", 22, 0.9],
  ["BR", 20, 0.9],
  ["JP", 18, 0.85],
  ["KR", 16, 0.85],
  ["GB", 16, 0.8],
  // Secondary — warm cores, clearly above ambient.
  ["DE", 14, 0.75],
  ["NG", 14, 0.75],
  ["MX", 12, 0.7],
  ["VN", 12, 0.7],
  ["TH", 11, 0.65],
  ["ES", 10, 0.6],
  ["FR", 10, 0.6],
  ["IT", 9, 0.55],
  ["CA", 9, 0.55],
  ["AU", 8, 0.5],
  ["TR", 8, 0.5],
  ["PK", 8, 0.5],
  ["CN", 7, 0.5],
  ["EG", 7, 0.45],
  ["RU", 7, 0.45],
  ["BD", 6, 0.4],
  ["PL", 6, 0.4],
  ["NL", 6, 0.4],
  ["MY", 6, 0.4],
  // Ambient — cool edges. These keep the ramp's low stops in play so the
  // gradient reads as a scale rather than a binary hot/absent.
  ["SG", 5, 0.35],
  ["ZA", 5, 0.35],
  ["KE", 5, 0.3],
  ["AR", 5, 0.3],
  ["CO", 4, 0.3],
  ["CL", 4, 0.25],
  ["PE", 4, 0.25],
  ["SA", 4, 0.25],
  ["TW", 4, 0.25],
  ["HK", 4, 0.25],
  ["SE", 3, 0.2],
  ["NO", 3, 0.2],
  ["DK", 3, 0.2],
  ["FI", 3, 0.2],
  ["IE", 3, 0.2],
  ["PT", 3, 0.2],
  ["GR", 3, 0.2],
  ["CZ", 3, 0.2],
  ["RO", 3, 0.2],
  ["UA", 3, 0.2],
  ["BE", 3, 0.2],
  ["AT", 3, 0.15],
  ["CH", 3, 0.15],
  ["NZ", 3, 0.15],
  ["IL", 3, 0.15],
  ["MA", 3, 0.15],
  ["GH", 3, 0.15],
  ["NP", 2, 0.15],
  ["KH", 2, 0.15],
  ["LA", 2, 0.15],
];

const TOPICS = [
  "Karaoke", "Duet", "Vocal", "Lo-Fi", "Synthwave", "Acoustic", "Hip-Hop",
  "R&B", "Indie", "Jazz", "Choir", "Songwriter", "Producer", "Beatmaker",
  "AI Artist", "Cover", "Ballad", "Rock", "Pop", "K-Pop", "Folk", "Piano",
  "Guitar", "Drummer", "Bassline", "Remix", "Studio", "Open Mic", "Harmony",
  "Falsetto", "Serenade", "Anthem", "Bedroom Pop", "Chillhop", "Gospel",
  "Reggae", "Afrobeat", "Latin", "Ambient", "Soundtrack",
] as const;

const SUFFIXES = [
  "Circle", "Collective", "Club", "Lounge", "Sessions", "Room", "Society",
  "Guild", "Crew", "Nights",
] as const;

const EMOJI = [
  "🎤", "🎧", "🎸", "🎹", "🥁", "🎻", "🎺", "🎬", "🌟", "🔥", "💫", "🎵",
  "🎶", "🪩", "📻",
] as const;

const TAGS = ["Music", "Karaoke", "Collab", "Live", "Community"] as const;

/** Mirrors the app's COMMUNITY_PRESET_COLORS so both clients agree visually. */
const PRESET_COLORS = [
  "#A53860", "#EF88AD", "#670D2F", "#F4C2A0", "#8B3A52", "#D14D8C",
  "#B03D6B", "#EF5EAD", "#FF8F50", "#FFAD7A", "#FFCBA4", "#FFBC8F",
] as const;

const SUB_SUFFIXES = ["Chat", "Room", "Lounge", "Talk", "Hangout"] as const;

export async function seedGlobeCommunities(prisma: PrismaClient) {
  console.log("🌍 Seeding globe communities for heatmap density...");

  const systemUser =
    (await prisma.user.findFirst({ where: { email: "aiforhu@gmail.com" } })) ??
    (await prisma.user.findFirst({ orderBy: { createdAt: "asc" } }));

  if (!systemUser) {
    console.log("⚠️ No users found to own subcategories. Run the user seeder first.");
    return;
  }

  // Same seed as the client fixture, and the rand() calls below happen in the
  // same order, so the member-count distribution is identical to the one the
  // heat ramp was tuned against.
  const rand = mulberry32(0x43484d);
  // Subcategories draw from a separate stream — interleaving them would shift
  // every membersCount downstream and decalibrate the map.
  const subRand = mulberry32(0x5355425f);

  const designs: any[] = [];
  const categories: any[] = [];
  const subcategories: any[] = [];

  for (const [code, count, bias] of SEED_REGIONS) {
    // A few outsized communities per region give the kernel a genuine peak to
    // build around. Without them the region averages out to lukewarm and the
    // top of the colour ramp never gets exercised.
    const anchors = count >= 18 ? 3 : count >= 10 ? 2 : 1;

    for (let i = 0; i < count; i++) {
      const isAnchor = i < anchors;

      const populationCount = isAnchor
        ? // Bias scales the whole anchor range, not just its ceiling. An
          // additive floor here would hand every ambient region a ~450-member
          // core too, which flattens the map to a uniform warm wash.
          Math.round(80 + (340 + rand() * 600) * bias)
        : // Power skew: most circles are small, a few reach into the hundreds —
          // a flat distribution makes every blob the same temperature.
          Math.round(4 + Math.pow(rand(), 2.4) * 380 * bias);

      const primary = pick(PRESET_COLORS, rand);
      const topic = pick(TOPICS, rand);
      const suffix = pick(SUFFIXES, rand);
      const emojiIcon = pick(EMOJI, rand);
      const tag = pick(TAGS, rand);

      const categoryId = uuidV5(`globe:cat:${code}:${i}`);
      const designId = uuidV5(`globe:design:${code}:${i}`);
      const name = `${topic} ${suffix}`;

      designs.push({
        id: designId,
        name: `${name} Design`,
        colorSet: { primary, secondary: primary, border: primary },
        // Anchor on a real city rather than leaving this empty. The client's
        // fallback spirals around a country centroid, which for archipelagos
        // drops most circles in open water — the PH centroid is itself sea.
        // Falls back to `{}` for countries with no city data, which restores
        // the old centroid behaviour rather than placing them at [0,0].
        position: cityPositionFor(code, i, rand) ?? {},
        sizeSet: { radius: 4, maxRadius: 90 },
        border: { width: 2, color: "#000", style: "solid" },
        shadow: { x: 0, y: 2, blur: 8, color: "#888" },
        opacity: 1,
        capacity: Math.max(populationCount * 2, 100),
        status: "active",
        tags: [tag],
        emojiIcon,
      });

      categories.push({
        id: categoryId,
        name,
        note: `${GLOBE_MARKER} ${code}`,
        isAd: false,
        chummeTraits: "COMMUNITIES" as const,
        populationCount,
        discoveryKeywords: [topic.toLowerCase(), tag.toLowerCase()],
        targetCountries: [code],
        channelId: [],
        chummeVisualDesignId: designId,
      });

      const subCount = subRand() < 0.45 ? 2 : 1;
      for (let s = 0; s < subCount; s++) {
        subcategories.push({
          id: uuidV5(`globe:sub:${code}:${i}:${s}`),
          name: `${pick(TOPICS, subRand)} ${pick(SUB_SUFFIXES, subRand)}`,
          note: `${GLOBE_MARKER} ${code}`,
          chummeCategoryId: categoryId,
          chummeTraits: "COMMUNITIES" as const,
          ownerId: systemUser.id,
          discoveryKeywords: [],
          channelId: [],
        });
      }
    }
  }

  // Designs first — ChummeCategory.chummeVisualDesignId is a FK, so the rows it
  // points at have to exist before the categories referencing them.
  const d = await prisma.chummeCategoryDesign.createMany({
    data: designs,
    skipDuplicates: true,
  });
  console.log(`✅ Designs:       +${d.count} (of ${designs.length})`);

  const c = await prisma.chummeCategory.createMany({
    data: categories,
    skipDuplicates: true,
  });
  console.log(`✅ Communities:   +${c.count} (of ${categories.length})`);

  const s = await prisma.chummeSubCategory.createMany({
    data: subcategories,
    skipDuplicates: true,
  });
  console.log(`✅ Subcategories: +${s.count} (of ${subcategories.length})`);

  const missingCities = SEED_REGIONS.map(([code]) => code).filter(
    (code) => !CITY_COORDINATES[code],
  );
  if (missingCities.length) {
    console.log(
      `ℹ️ No city data for ${missingCities.join(", ")} — those fall back to the country centroid.`,
    );
  }

  const pops = categories.map((x) => x.populationCount).sort((a, b) => a - b);
  const hot = pops.filter((p) => p >= 64).length;
  console.log(
    `📊 Population spread: min=${pops[0]} median=${pops[Math.floor(pops.length / 2)]} max=${pops[pops.length - 1]} | ${hot} circles at mid-weight or hotter`,
  );
  console.log(
    `🎉 Seeded ${categories.length} communities across ${SEED_REGIONS.length} countries.`,
  );
}

/**
 * Remove every row this seeder created, in foreign-key order.
 *
 * Scoped strictly to rows whose note carries GLOBE_MARKER, so hand-made and
 * user-created communities on a shared database are never touched.
 */
export async function purgeGlobeCommunities(prisma: PrismaClient) {
  console.log(`🗑️  Purging rows marked ${GLOBE_MARKER}...`);

  const cats = await prisma.chummeCategory.findMany({
    where: { note: { startsWith: GLOBE_MARKER } },
    select: { id: true, chummeVisualDesignId: true },
  });

  if (cats.length === 0) {
    console.log("Nothing to purge.");
    return;
  }

  const categoryIds = cats.map((c) => c.id);
  const designIds = cats
    .map((c) => c.chummeVisualDesignId)
    .filter((id): id is string => Boolean(id));

  const subs = await prisma.chummeSubCategory.findMany({
    where: { chummeCategoryId: { in: categoryIds } },
    select: { id: true, chummeVisualDesignId: true },
  });
  const subIds = subs.map((s) => s.id);
  subs.forEach((s) => s.chummeVisualDesignId && designIds.push(s.chummeVisualDesignId));

  const messageIds = (
    await prisma.roomMessage.findMany({
      where: { chummeSubCategoryId: { in: subIds } },
      select: { id: true },
    })
  ).map((m) => m.id);

  const r = await prisma.roomMessageReaction.deleteMany({
    where: { messageId: { in: messageIds } },
  });
  // Replies before parents: the self-relation would otherwise leave children
  // pointing at a row that no longer exists.
  const replies = await prisma.roomMessage.deleteMany({
    where: { chummeSubCategoryId: { in: subIds }, parentMessageId: { not: null } },
  });
  const msgs = await prisma.roomMessage.deleteMany({
    where: { chummeSubCategoryId: { in: subIds } },
  });
  const mem = await prisma.roomUserChat.deleteMany({
    where: { chummeSubCategoryId: { in: subIds } },
  });
  const sc = await prisma.chummeSubCategory.deleteMany({
    where: { id: { in: subIds } },
  });
  const cc = await prisma.chummeCategory.deleteMany({
    where: { id: { in: categoryIds } },
  });
  const dd = await prisma.chummeCategoryDesign.deleteMany({
    where: { id: { in: designIds } },
  });

  console.log(
    `✅ Removed: ${r.count} reactions, ${replies.count + msgs.count} messages, ${mem.count} memberships, ${sc.count} subcategories, ${cc.count} communities, ${dd.count} designs.`,
  );
}
