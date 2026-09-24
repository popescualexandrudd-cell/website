#!/usr/bin/env bash
# Actualizează site-ul la ultima versiune din git, cu revenire automată dacă noua versiune nu pornește.
#   ./scripts/deploy.sh            actualizare normală
#   ./scripts/deploy.sh --fara-git doar reconstruiește (de exemplu după ce ai schimbat .env)
set -euo pipefail
cd "$(dirname "$0")/.."

APP_IMAGE=antrenor-tenis-app
[ -f .env ] || { echo "Lipsește fișierul .env. Vezi DEPLOY.md, pasul 4."; exit 1; }

if [ "${1:-}" != "--fara-git" ]; then
  echo "1/5 Descarc ultima versiune…"
  git pull --ff-only
fi

echo "2/5 Backup înainte de actualizare…"
if docker compose ps -q db >/dev/null 2>&1 && [ -n "$(docker compose ps -q db)" ]; then
  docker compose run --rm -T backup backup.sh || echo "   (backup-ul a eșuat; continui, dar verifică mai târziu)"
fi

echo "3/5 Construiesc noua versiune (durează câteva minute)…"
previous=""
if docker image inspect "$APP_IMAGE:latest" >/dev/null 2>&1; then
  previous="$APP_IMAGE:anterior"
  docker tag "$APP_IMAGE:latest" "$previous"
fi
docker compose build app backup

echo "4/5 Pornesc noua versiune…"
# If the new app never becomes healthy, compose reports it here; the check below decides what to do.
docker compose up -d --remove-orphans || true

echo "5/5 Verific că site-ul răspunde…"
healthy=0
for _ in $(seq 1 60); do
  id=$(docker compose ps -q app)
  status=$(docker inspect --format '{{.State.Health.Status}}' "$id" 2>/dev/null || echo "")
  if [ "$status" = "healthy" ]; then healthy=1; break; fi
  if [ "$status" = "unhealthy" ]; then break; fi
  sleep 5
done

if [ "$healthy" = "1" ]; then
  echo "Gata: noua versiune rulează."
  docker image prune -f >/dev/null
  exit 0
fi

echo "Noua versiune NU a pornit. Ultimele mesaje:"
docker compose logs --tail=40 app || true
if [ -n "$previous" ]; then
  echo "Revin la versiunea anterioară…"
  docker tag "$previous" "$APP_IMAGE:latest"
  docker compose up -d --no-build --force-recreate app worker
  docker compose up -d --no-build
  echo "Am revenit la versiunea anterioară. Site-ul funcționează ca înainte de actualizare."
  echo "Dacă actualizarea conținea o migrare de bază de date, restaurează backup-ul de acum: ./scripts/restore.sh"
fi
exit 1
