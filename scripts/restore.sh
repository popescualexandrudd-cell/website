#!/usr/bin/env bash
# Restaurează un backup: oprește site-ul, pune la loc baza de date (și imaginile din același
# moment), repornește și verifică. Ce era în baza de date înainte se pierde.
#   ./scripts/restore.sh                         cel mai recent backup
#   ./scripts/restore.sh baza-2026-09-24_033000.dump
#   ./scripts/restore.sh ... --da                fără întrebarea de confirmare
set -euo pipefail
cd "$(dirname "$0")/.."

file=""
yes=0
for arg in "$@"; do
  case "$arg" in
    --da) yes=1 ;;
    *) file="$arg" ;;
  esac
done

if [ -z "$file" ]; then
  file=$(docker compose run --rm --no-deps -T backup sh -c 'ls -1t /backups/baza-*.dump 2>/dev/null | head -1' | tr -d '\r')
  [ -n "$file" ] || { echo "Nu există niciun backup. Fă unul cu ./scripts/backup.sh"; exit 1; }
  file=$(basename "$file")
fi

echo "Voi restaura: $file"
echo "Datele actuale (rezervări, conținut, imagini) vor fi înlocuite cu cele din backup."
if [ "$yes" != "1" ]; then
  read -r -p "Scrie DA ca să continui: " answer
  [ "$answer" = "DA" ] || { echo "Am renunțat. Nu s-a schimbat nimic."; exit 1; }
fi

# Înainte de restaurare, un backup al stării curente (pentru orice eventualitate).
echo "Salvez starea curentă…"
docker compose run --rm -T backup backup.sh inainte-de-restaurare

docker compose stop app worker
docker compose run --rm -T --user root backup restore.sh "$file"
docker compose up -d app worker

echo "Aștept ca site-ul să pornească…"
for _ in $(seq 1 60); do
  status=$(docker inspect --format '{{.State.Health.Status}}' "$(docker compose ps -q app)" 2>/dev/null || echo "")
  if [ "$status" = "healthy" ]; then
    echo "Gata: backup-ul $file a fost restaurat și site-ul funcționează."
    exit 0
  fi
  sleep 3
done
echo "Site-ul nu a pornit în 3 minute. Verifică: docker compose logs app"
exit 1
