#!/bin/sh
# Restores one backup into the running database (and, if present, the images from the same moment).
# Usage (via scripts/restore.sh): restore.sh baza-2026-09-24_033000.dump
set -eu
file="${1:?Numele fișierului de backup lipsește}"
case "$file" in */*) ;; *) file="/backups/$file" ;; esac
[ -f "$file" ] || { echo "Nu găsesc $file"; exit 1; }

echo "[restaurare] baza de date din $(basename "$file")"
PGPASSWORD="$POSTGRES_PASSWORD" pg_restore -h "${PGHOST:-db}" -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  --clean --if-exists --no-owner --single-transaction "$file"

media="/backups/media-$(basename "$file" .dump | sed 's/^baza-//').tar.gz"
if [ -f "$media" ]; then
  echo "[restaurare] imaginile din $(basename "$media")"
  find /media -mindepth 1 -delete
  tar -xzf "$media" -C /media
  # Uploaded files belong to the app user (uid 1001) in the app container.
  if [ "$(id -u)" = "0" ]; then chown -R 1001:1001 /media; fi
else
  echo "[restaurare] nu există arhivă de imagini pentru același moment; imaginile rămân neschimbate."
fi
echo "[restaurare] gata."
