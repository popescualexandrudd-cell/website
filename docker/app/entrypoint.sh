#!/bin/sh
# Runs before the app starts: applies database migrations and, on a brand-new database only,
# loads the initial content from config/antrenor.yml. The worker skips this (RUN_MIGRATIONS=0).
set -eu

if [ "${RUN_MIGRATIONS:-1}" = "1" ]; then
  echo "[pornire] aplic migrările bazei de date…"
  (cd /app/migrate && node node_modules/prisma/build/index.js migrate deploy)
  node dist/seed.mjs --if-empty
fi

exec "$@"
