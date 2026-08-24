# Fixing P3009 — failed `20260814085246_add_owner_id` on `chumme-main`

**Status:** `migrate deploy` refuses to run. The app container restarts, fails the
health check, and restarts again. The API is down until this is resolved.

**What happened:** the migration ran for the first time against staging at
`2026-08-24 09:13:27 UTC`, failed partway, and Prisma recorded it as failed in
`_prisma_migrations`. Prisma will not apply *any* further migration while a
failed row exists — that's the P3009 guard, and it is deliberate.

> Do not delete the `_prisma_migrations` row by hand and do not run
> `migrate reset`. Reset drops the database, and `chumme-main` is shared with
> four other projects.

---

## Step 1 — Get the real error

P3009 is the *blocker*, not the cause. The original failure is stored in the
`logs` column. Run this from the EC2 box (or anything that can reach the RDS):

```sql
SELECT migration_name,
       started_at,
       finished_at,
       rolled_back_at,
       applied_steps_count,
       logs
FROM "_prisma_migrations"
WHERE migration_name = '20260814085246_add_owner_id';
```

`applied_steps_count` is the important field:

- **`0`** — nothing was applied, the transaction rolled back cleanly. Go to Step 3a.
- **`> 0`** — some statements committed. Go to Step 3b.

---

## Step 2 — Find the likely cause

The migration drops six foreign keys and re-adds them. Re-adding an FK fails if
any existing row violates it, which is the overwhelmingly likely failure on a
database with real data. These queries find the offending rows — each should
return `0`:

```sql
-- Conversation.userId -> User.id            (ON DELETE RESTRICT)
SELECT count(*) FROM "Conversation" c
  LEFT JOIN "User" u ON u.id = c."userId"
  WHERE c."userId" IS NOT NULL AND u.id IS NULL;

-- SocialFeedItem.postId -> SocialUserPost.id  (ON DELETE SET NULL)
SELECT count(*) FROM "SocialFeedItem" f
  LEFT JOIN "SocialUserPost" p ON p.id = f."postId"
  WHERE f."postId" IS NOT NULL AND p.id IS NULL;

-- SocialFeedSnapshot.socialFeedId -> SocialFeedItem.id   (RESTRICT)
SELECT count(*) FROM "SocialFeedSnapshot" s
  LEFT JOIN "SocialFeedItem" f ON f.id = s."socialFeedId"
  WHERE s."socialFeedId" IS NOT NULL AND f.id IS NULL;

-- SocialFeedSignal.socialFeedId -> SocialFeedItem.id     (RESTRICT)
SELECT count(*) FROM "SocialFeedSignal" s
  LEFT JOIN "SocialFeedItem" f ON f.id = s."socialFeedId"
  WHERE s."socialFeedId" IS NOT NULL AND f.id IS NULL;

-- SocialFeedItemComment.socialFeedItemId -> SocialFeedItem.id (RESTRICT)
SELECT count(*) FROM "SocialFeedItemComment" c
  LEFT JOIN "SocialFeedItem" f ON f.id = c."socialFeedItemId"
  WHERE c."socialFeedItemId" IS NOT NULL AND f.id IS NULL;

-- SocialIngestionSchedule.socialIngestionTargetId -> SocialIngestionTarget.id
SELECT count(*) FROM "SocialIngestionSchedule" s
  LEFT JOIN "SocialIngestionTarget" t ON t.id = s."socialIngestionTargetId"
  WHERE s."socialIngestionTargetId" IS NOT NULL AND t.id IS NULL;

-- ChummeArtist.ownerId / Music.ownerId -> User.id  (both SET NULL, new columns,
-- so these can only fail if the columns already existed with stale values)
SELECT count(*) FROM "ChummeArtist" a
  LEFT JOIN "User" u ON u.id = a."ownerId"
  WHERE a."ownerId" IS NOT NULL AND u.id IS NULL;
SELECT count(*) FROM "Music" m
  LEFT JOIN "User" u ON u.id = m."ownerId"
  WHERE m."ownerId" IS NOT NULL AND u.id IS NULL;
```

`20260821000000_drop_interstellar` and the `data:drop-interstellar` script both
delete data — a plausible source of orphans if children outlived their parents.

### Clean the orphans

Once you know which check is non-zero, decide per table whether the orphans are
disposable. For a `SET NULL` relation, nulling the column is enough and loses
nothing:

```sql
UPDATE "SocialFeedItem" SET "postId" = NULL
WHERE "postId" IS NOT NULL
  AND "postId" NOT IN (SELECT id FROM "SocialUserPost");
```

For a `RESTRICT` relation the child row cannot exist without its parent, so it
has to go. **Count first, delete second**, and take a snapshot before deleting
anything on a shared database:

```sql
DELETE FROM "SocialFeedSnapshot"
WHERE "socialFeedId" IS NOT NULL
  AND "socialFeedId" NOT IN (SELECT id FROM "SocialFeedItem");
```

---

## Step 3a — Nothing was applied (`applied_steps_count = 0`)

Mark it rolled back so Prisma retries it on the next deploy:

```bash
npx prisma migrate resolve --rolled-back "20260814085246_add_owner_id"
```

Then redeploy. With the orphans cleaned, it applies normally.

## Step 3b — Partially applied (`applied_steps_count > 0`)

The DB is now between two states, so finish the migration by hand before telling
Prisma it's done. Work out which statements landed:

```sql
-- Which of the migration's columns exist?
SELECT table_name, column_name
FROM information_schema.columns
WHERE (table_name, column_name) IN (
  ('ChummeArtist','ownerId'), ('Music','ownerId'),
  ('ChummeCategoryDesign','aiChatEnabled'), ('ChummeCategoryDesign','discoveryEnabled'),
  ('SystemAsset','description'), ('SystemAsset','isDeleted'), ('SystemAsset','title')
);

-- Which of the migration's foreign keys exist?
SELECT conname FROM pg_constraint WHERE conname IN (
  'ChummeArtist_ownerId_fkey', 'Music_ownerId_fkey',
  'SocialFeedItem_postId_fkey', 'SocialFeedSnapshot_socialFeedId_fkey',
  'SocialFeedSignal_socialFeedId_fkey', 'SocialFeedItemComment_socialFeedItemId_fkey',
  'SocialIngestionSchedule_socialIngestionTargetId_fkey', 'Conversation_userId_fkey'
);
```

Run only the statements from `prisma/migrations/20260814085246_add_owner_id/migration.sql`
that are still missing, then:

```bash
npx prisma migrate resolve --applied "20260814085246_add_owner_id"
```

Redeploy.

---

## Step 4 — Confirm

```sql
SELECT migration_name, finished_at, rolled_back_at
FROM "_prisma_migrations"
ORDER BY started_at DESC LIMIT 5;
```

The row should have a `finished_at` and no `rolled_back_at`, and the deploy
health check should pass.

---

## Why this bit now and not on 2026-08-14

The migration is dated 14 August but only reached staging today, so it met four
months— worth of accumulated data for the first time. A migration that re-adds
foreign keys is exactly the kind that passes on a clean local database and fails
on one with history.

Worth considering for next time: split FK re-creation into its own migration, and
add a `NOT VALID` / `VALIDATE CONSTRAINT` two-step so a violation surfaces
without blocking the deploy.
