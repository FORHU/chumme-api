/**
 * Backfill: release the email/username held by already soft-deleted users.
 *
 * `UserRepo.softDeleteUser` now tombstones both fields so a deleted account's
 * address can be reused. Accounts deleted *before* that shipped still occupy
 * the unique index, so signing up with one of those addresses still fails.
 * This rewrites them to the same tombstone shape.
 *
 * Dry run (default — prints the plan, writes nothing):
 *   npx ts-node scripts/release_deleted_user_identifiers.ts
 *
 * Apply:
 *   npx ts-node scripts/release_deleted_user_identifiers.ts --apply
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const APPLY = process.argv.includes('--apply');

/** Mirrors UserRepo.softDeleteUser so backfilled rows match new deletions. */
function tombstoneFor(userId: string) {
  const suffix = userId.replace(/-/g, '').slice(0, 12);
  return {
    email: `deleted+${suffix}@chumme.invalid`,
    username: `deleted_${suffix}`,
  };
}

async function main() {
  const deleted = await prisma.user.findMany({
    where: { isDeleted: true },
    select: { id: true, email: true, username: true },
    orderBy: { updatedAt: 'asc' },
  });

  const stale = deleted.filter((u) => !u.email.startsWith('deleted+'));

  console.log(`Soft-deleted users: ${deleted.length}`);
  console.log(`Still holding their identifiers: ${stale.length}`);

  if (stale.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  for (const user of stale) {
    const next = tombstoneFor(user.id);
    console.log(`  ${user.email} / ${user.username}  ->  ${next.email} / ${next.username}`);
  }

  if (!APPLY) {
    console.log('\nDry run — nothing written. Re-run with --apply to commit.');
    return;
  }

  let updated = 0;
  let failed = 0;

  for (const user of stale) {
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          ...tombstoneFor(user.id),
          // Match softDeleteUser: leave nothing usable for auth or recovery.
          password: null,
          otpCode: null,
          otpExpiry: null,
          otpPurpose: null,
          pendingEmail: null,
        },
      });
      updated += 1;
    } catch (error: any) {
      failed += 1;
      console.error(`  FAILED ${user.id}: ${error?.message || error}`);
    }
  }

  console.log(`\nReleased: ${updated}${failed ? `, failed: ${failed}` : ''}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
