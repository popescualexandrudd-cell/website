#!/bin/sh
# One backup: database (pg_dump custom format) + uploaded images (tar.gz), then retention and
# the optional off-site copy. Files: /backups/baza-<data_ora>.dump and /backups/media-<data_ora>.tar.gz
# An optional label is added to the name (e.g. "inainte-de-restaurare").
set -eu
stamp="$(date +%Y-%m-%d_%H%M%S)${1:+-$1}"
keep="${BACKUP_KEEP_DAYS:-14}"
cd /backups

echo "[backup] baza de date → baza-$stamp.dump"
PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -h "${PGHOST:-db}" -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  --format=custom --no-owner --file "baza-$stamp.dump.partial"
mv "baza-$stamp.dump.partial" "baza-$stamp.dump"

echo "[backup] imagini → media-$stamp.tar.gz"
tar -czf "media-$stamp.tar.gz.partial" -C /media .
mv "media-$stamp.tar.gz.partial" "media-$stamp.tar.gz"

find /backups -maxdepth 1 \( -name 'baza-*.dump' -o -name 'media-*.tar.gz' \) -mtime +"$keep" -print -delete
find /backups -maxdepth 1 -name '*.partial' -mmin +120 -delete

if [ -n "${RCLONE_REMOTE:-}" ]; then
  echo "[backup] copie off-site în $RCLONE_REMOTE"
  rclone sync /backups "$RCLONE_REMOTE" --include 'baza-*.dump' --include 'media-*.tar.gz'
fi
echo "[backup] gata: $(ls -1 /backups | grep -c -E '^(baza|media)-') fișiere păstrate."
