import "dotenv/config";
import { PrismaClient } from "@prisma/client";

/**
 * Read-only diagnosis for the P3009 deploy failure.
 *
 * Prints the failed migration row (including Prisma's stored error log), then
 * checks every foreign key that `20260814085246_add_owner_id` re-creates for
 * orphaned rows — re-adding an FK is the only thing in that migration that can
 * fail against a database with real history.
 *
 * Runs nothing but SELECTs. Safe against the shared staging database.
 */

const prisma = new PrismaClient();

const TARGET = "20260814085246_add_owner_id";

/** `[label, child table, child column, parent table, parent column, on-delete]` */
const FOREIGN_KEYS: [string, string, string, string, string, "RESTRICT" | "SET NULL"][] = [
  ["Conversation.userId", "Conversation", "userId", "User", "id", "RESTRICT"],
  ["SocialFeedItem.postId", "SocialFeedItem", "postId", "SocialUserPost", "id", "SET NULL"],
  ["SocialFeedSnapshot.socialFeedId", "SocialFeedSnapshot", "socialFeedId", "SocialFeedItem", "id", "RESTRICT"],
  ["SocialFeedSignal.socialFeedId", "SocialFeedSignal", "socialFeedId", "SocialFeedItem", "id", "RESTRICT"],
  ["SocialFeedItemComment.socialFeedItemId", "SocialFeedItemComment", "socialFeedItemId", "SocialFeedItem", "id", "RESTRICT"],
  ["SocialIngestionSchedule.socialIngestionTargetId", "SocialIngestionSchedule", "socialIngestionTargetId", "SocialIngestionTarget", "id", "RESTRICT"],
  ["ChummeArtist.ownerId", "ChummeArtist", "ownerId", "User", "id", "SET NULL"],
  ["Music.ownerId", "Music", "ownerId", "User", "id", "SET NULL"],
];

const COLUMNS_ADDED: [string, string][] = [
  ["ChummeArtist", "ownerId"],
  ["Music", "ownerId"],
  ["ChummeCategoryDesign", "aiChatEnabled"],
  ["ChummeCategoryDesign", "discoveryEnabled"],
  ["SystemAsset", "description"],
  ["SystemAsset", "isDeleted"],
  ["SystemAsset", "title"],
];

const CONSTRAINTS_ADDED = [
  "ChummeArtist_ownerId_fkey",
  "Music_ownerId_fkey",
  "SocialFeedItem_postId_fkey",
  "SocialFeedSnapshot_socialFeedId_fkey",
  "SocialFeedSignal_socialFeedId_fkey",
  "SocialFeedItemComment_socialFeedItemId_fkey",
  "SocialIngestionSchedule_socialIngestionTargetId_fkey",
  "Conversation_userId_fkey",
];

async function main() {
  const host = (process.env.DATABASE_URL ?? "").replace(/\/\/[^@]*@/, "//***:***@");
  console.log(`Target: ${host || "(DATABASE_URL not set)"}\n`);

  // ── 1. The failed migration row ────────────────────────────────────────────
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT migration_name, started_at, finished_at, rolled_back_at,
            applied_steps_count, logs
     FROM "_prisma_migrations"
     WHERE migration_name = $1`,
    TARGET,
  );

  if (rows.length === 0) {
    console.log(`No _prisma_migrations row for ${TARGET} — it never started here.`);
  } else {
    const r = rows[0];
    console.log("=== FAILED MIGRATION ===");
    console.log(`  name ................ ${r.migration_name}`);
    console.log(`  started_at .......... ${r.started_at}`);
    console.log(`  finished_at ......... ${r.finished_at ?? "(never finished)"}`);
    console.log(`  rolled_back_at ...... ${r.rolled_back_at ?? "(not marked)"}`);
    console.log(`  applied_steps_count . ${r.applied_steps_count}`);
    console.log(`\n  --- Prisma's stored error ---`);
    console.log(
      String(r.logs ?? "(empty)")
        .split("\n")
        .map((l: string) => "  " + l)
        .join("\n"),
    );
  }

  // ── 2. Which parts of the migration actually landed ────────────────────────
  console.log("\n=== WHAT LANDED ===");
  for (const [table, column] of COLUMNS_ADDED) {
    const hit = await prisma.$queryRawUnsafe<any[]>(
      `SELECT 1 FROM information_schema.columns
       WHERE table_name = $1 AND column_name = $2 LIMIT 1`,
      table,
      column,
    );
    console.log(`  column  ${`${table}.${column}`.padEnd(42)} ${hit.length ? "present" : "MISSING"}`);
  }
  for (const name of CONSTRAINTS_ADDED) {
    const hit = await prisma.$queryRawUnsafe<any[]>(
      `SELECT 1 FROM pg_constraint WHERE conname = $1 LIMIT 1`,
      name,
    );
    console.log(`  fk      ${name.padEnd(42)} ${hit.length ? "present" : "MISSING"}`);
  }

  // ── 3. Orphan rows that would block each FK ────────────────────────────────
  console.log("\n=== ORPHAN CHECK (any non-zero blocks the migration) ===");
  const offenders: string[] = [];

  for (const [label, child, col, parent, pcol, onDelete] of FOREIGN_KEYS) {
    try {
      const res = await prisma.$queryRawUnsafe<any[]>(
        `SELECT count(*)::int AS n
         FROM "${child}" c
         LEFT JOIN "${parent}" p ON p."${pcol}" = c."${col}"
         WHERE c."${col}" IS NOT NULL AND p."${pcol}" IS NULL`,
      );
      const n = Number(res[0]?.n ?? 0);
      if (n > 0) offenders.push(`${label} (${n} orphans, ON DELETE ${onDelete})`);
      console.log(`  ${label.padEnd(48)} ${String(n).padStart(6)}  ${n > 0 ? "← BLOCKS" : "ok"}`);
    } catch (err: any) {
      // A missing column just means that part of the migration never ran.
      console.log(`  ${label.padEnd(48)} ${"n/a".padStart(6)}  (${String(err.message).split("\n")[0].slice(0, 60)})`);
    }
  }

  // ── 4. Verdict ─────────────────────────────────────────────────────────────
  console.log("\n=== VERDICT ===");
  const steps = Number(rows[0]?.applied_steps_count ?? 0);
  if (rows.length === 0) {
    console.log("  Migration has no record here. Check you're pointed at staging.");
  } else if (steps === 0) {
    console.log("  applied_steps_count = 0 → the transaction rolled back cleanly.");
    console.log("  The database is unchanged. After clearing the orphans below, run:");
    console.log(`\n    npx prisma migrate resolve --rolled-back "${TARGET}"\n`);
    console.log("  then redeploy — Prisma will retry the migration.");
  } else {
    console.log(`  applied_steps_count = ${steps} → PARTIALLY applied.`);
    console.log("  Use the WHAT LANDED section above: run only the still-MISSING");
    console.log("  statements from the migration.sql by hand, then:");
    console.log(`\n    npx prisma migrate resolve --applied "${TARGET}"\n`);
  }

  if (offenders.length) {
    console.log("\n  Orphans to clear first:");
    offenders.forEach((o) => console.log(`    - ${o}`));
    console.log("\n  SET NULL relations: null the column. RESTRICT relations: the child");
    console.log("  row cannot exist without its parent, so it has to be deleted.");
    console.log("  Snapshot the database before deleting anything — it is shared.");
  } else {
    console.log("\n  No orphans found. If the migration still fails, the cause is in");
    console.log("  the stored error above rather than a constraint violation.");
  }
}

main()
  .catch((e) => {
    console.error("Failed:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
