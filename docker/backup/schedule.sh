#!/bin/sh
# Runs backup.sh once a day at BACKUP_TIME (local time, default 03:30).
set -eu
at="${BACKUP_TIME:-03:30}"
last=""
echo "[backup] programat zilnic la $at (${TZ:-UTC}); păstrez ${BACKUP_KEEP_DAYS:-14} zile."
while true; do
  now=$(date +%H:%M)
  today=$(date +%Y-%m-%d)
  if [ "$now" = "$at" ] && [ "$last" != "$today" ]; then
    if backup.sh; then last="$today"; else echo "[backup] a eșuat; reîncerc mâine sau rulează manual scripts/backup.sh"; last="$today"; fi
  fi
  sleep 30
done
