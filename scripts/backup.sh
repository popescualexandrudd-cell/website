#!/usr/bin/env bash
# Backup acum (în afara celui automat de noapte): baza de date + imaginile.
# Rulează din directorul proiectului:  ./scripts/backup.sh
# Lista backup-urilor:                 ./scripts/backup.sh --lista
# Copiere pe calculatorul tău:          ./scripts/backup.sh --copiaza ./backup-local
set -euo pipefail
cd "$(dirname "$0")/.."

case "${1:-}" in
  --lista)
    docker compose run --rm --no-deps -T backup sh -c 'ls -lh /backups | grep -E "(baza|media)-" || echo "Niciun backup încă."'
    ;;
  --copiaza)
    dest="${2:?Spune unde copiez, de exemplu: ./scripts/backup.sh --copiaza ./backup-local}"
    mkdir -p "$dest"
    id=$(docker compose ps -q backup)
    [ -n "$id" ] || { echo "Containerul de backup nu rulează. Pornește-l: docker compose up -d backup"; exit 1; }
    docker cp "$id:/backups/." "$dest/"
    echo "Am copiat backup-urile în $dest"
    ;;
  "")
    docker compose run --rm -T backup backup.sh
    ;;
  *)
    echo "Opțiune necunoscută: $1 (folosește --lista sau --copiaza <dosar>)"; exit 1
    ;;
esac
