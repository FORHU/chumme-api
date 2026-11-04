/**
 * Removes specific links (dead or unwanted) from Circle chat and the feed.
 *
 *   - RoomMessage rows whose text contains one of the links → deleted, with
 *     their reactions. A message someone replied to in a thread is skipped and
 *     reported rather than taking the reply with it.
 *   - SocialFeedItem rows with one of the links as externalUrl → isDeleted = true
 *
 * Links match loosely: protocol, "www." / "m." / "web." and a trailing slash
 * are ignored, so https://www.facebook.com/share/r/abc/ also catches
 * facebook.com/share/r/abc.
 *
 * Pass links as arguments, or one per line in a file:
 *   npx ts-node scripts/remove_room_links.ts https://www.facebook.com/share/r/abc/
 *   npx ts-node scripts/remove_room_links.ts --file dead-links.txt
 * Dry run by default — prints what it would remove. Add --apply to do it.
 *
 * If a link also lives in prisma/seed-assets/social-links.json, remove it
 * there too, or the next `db:seed:links` puts it back.
 *
 * ⚠️ `chumme-main` is shared with four other projects — check DATABASE_URL
 * points where you think it does before using --apply.
 */
import "dotenv/config";
import * as fs from "fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const args = process.argv.slice(2);
const APPLY = args.includes("--apply");

/** "https://www.facebook.com/share/r/abc/" → "facebook.com/share/r/abc" */
const toKey = (url: string) =>
  url
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^(www|m|web|mbasic)\./i, "")
    .replace(/\/+$/, "");

function readLinks(): string[] {
  const links: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--apply") continue;
    if (args[i] === "--file") {
      const text = fs.readFileSync(args[++i], "utf8");
      links.push(...text.split(/\r?\n/));
      continue;
    }
    links.push(args[i]);
  }
  return [...new Set(links.map((l) => l.trim()).filter(Boolean))];
}

async function main() {
  const links = readLinks();
  if (links.length === 0) {
    console.log("No links given. Usage: remove_room_links.ts <url...> | --file links.txt [--apply]");
    return;
  }

  const target = (process.env.DATABASE_URL ?? "").replace(/:[^:@/]+@/, ":****@");
  console.log(`\nDatabase: ${target || "(DATABASE_URL unset)"}`);
  console.log(APPLY ? "Mode: APPLY — rows will be changed\n" : "Mode: DRY RUN — nothing will change\n");

  const deletable: string[] = [];
  const feedIds: string[] = [];

  for (const link of links) {
    const key = toKey(link);
    if (key.length < 10) {
      console.log(`⚠️  Skipping "${link}" — too short to match safely`);
      continue;
    }
    // content is Json holding a plain string, so match on its text form
    const like = `%${key.replace(/[%_\\]/g, "\\$&")}%`;

    const messages = await prisma.$queryRawUnsafe<
      { id: string; room: string; author: string | null; replies: bigint }[]
    >(
      `SELECT m.id, s.name AS room, u.email AS author,
              (SELECT COUNT(*) FROM "RoomMessage" r WHERE r."parentMessageId" = m.id)::bigint AS replies
       FROM "RoomMessage" m
       JOIN "ChummeSubCategory" s ON s.id = m."chummeSubCategoryId"
       LEFT JOIN "User" u ON u.id = m."authorId"
       WHERE m.content::text ILIKE $1`,
      like,
    );
    const feed = await prisma.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM "SocialFeedItem" WHERE "isDeleted" = false AND "externalUrl" ILIKE $1`,
      like,
    );

    console.log(`${link}\n  room messages: ${messages.length}, feed items: ${feed.length}`);
    for (const m of messages) {
      const threaded = Number(m.replies) > 0;
      console.log(
        `    - "${m.room}" by ${m.author ?? "unknown"}${threaded ? `  (SKIPPED: ${m.replies} thread replies)` : ""}`,
      );
      if (!threaded) deletable.push(m.id);
    }
    feedIds.push(...feed.map((f) => f.id));
  }

  console.log(`\nTotal: ${deletable.length} room messages to delete, ${feedIds.length} feed items to hide.`);

  if (!APPLY) {
    console.log("Dry run complete. Re-run with --apply to make these changes.");
    return;
  }

  const [, removed, hidden] = await prisma.$transaction([
    prisma.roomMessageReaction.deleteMany({ where: { messageId: { in: deletable } } }),
    prisma.roomMessage.deleteMany({ where: { id: { in: deletable } } }),
    prisma.socialFeedItem.updateMany({ where: { id: { in: feedIds } }, data: { isDeleted: true } }),
  ]);
  console.log(`\n✅ Deleted ${removed.count} room messages, hid ${hidden.count} feed items.`);
}

main()
  .catch((err) => {
    console.error("❌ Failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
