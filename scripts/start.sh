#!/bin/sh
# Container entrypoint: apply migrations, then prove the schema actually matches
# before serving traffic.
#
# Why the second step exists. On 2026-08-03 both OTP migrations were recorded in
# _prisma_migrations as successfully applied while their DDL never ran (the
# hallmark of `prisma migrate resolve --applied` used to clear a failure).
# `migrate deploy` trusts that ledger, so it reported "No pending migrations to
# apply" on every boot and happily started an API whose Prisma client selected
# columns the database did not have. Login and registration returned
#   "The column `User.otpPurpose` does not exist in the current database"
# for four days. `migrate deploy` alone cannot detect this -- it never compares
# the ledger against the real schema. This does.
set -eu

echo "[start] applying migrations..."
npx prisma migrate deploy

echo "[start] verifying live schema matches prisma/schema.prisma..."
# --exit-code: 0 = no difference, 2 = difference found, other = failed to run.
set +e
npx prisma migrate diff \
  --from-schema-datasource prisma/schema.prisma \
  --to-schema-datamodel prisma/schema.prisma \
  --script > /tmp/schema-drift.sql 2>&1
npx prisma migrate diff \
  --from-schema-datasource prisma/schema.prisma \
  --to-schema-datamodel prisma/schema.prisma \
  --exit-code > /dev/null 2>&1
drift_status=$?
set -e

if [ "$drift_status" -eq 2 ]; then
  echo "[start] FATAL: database schema does not match prisma/schema.prisma." >&2
  echo "[start] Migrations may be recorded as applied without having run." >&2
  echo "[start] SQL that would close the gap:" >&2
  cat /tmp/schema-drift.sql >&2
  echo "[start] Refusing to start -- serving traffic now means broken queries at runtime." >&2
  exit 1
elif [ "$drift_status" -ne 0 ]; then
  echo "[start] FATAL: drift check could not run (exit ${drift_status})." >&2
  cat /tmp/schema-drift.sql >&2
  exit "$drift_status"
fi

echo "[start] schema verified in sync."
# exec so node replaces this shell as PID 1 and receives SIGTERM on shutdown.
exec npm start
