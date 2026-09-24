#!/usr/bin/env bash
# Pregătește un server Ubuntu 24.04 nou pentru site. Se poate rula de mai multe ori fără probleme.
#
#   sudo DOMAIN=numele-tau-tenis.ro ACME_EMAIL=tu@exemplu.ro ./scripts/setup-server.sh
#
# Ce face: actualizări de securitate automate, firewall (doar SSH, HTTP, HTTPS), Docker,
# memorie swap pe serverele mici, fișierul .env cu parole generate aleatoriu.
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Rulează cu sudo: sudo ./scripts/setup-server.sh"; exit 1
fi
. /etc/os-release
if [ "${ID:-}" != "ubuntu" ]; then
  echo "Scriptul e făcut pentru Ubuntu 24.04 (serverul tău: ${PRETTY_NAME:-necunoscut})."; exit 1
fi

cd "$(dirname "$0")/.."
PROJECT_DIR=$(pwd)
step() { printf '\n==> %s\n' "$*"; }

step "Pachete de bază și actualizări automate de securitate"
export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get install -y -q ca-certificates curl gnupg git ufw fail2ban unattended-upgrades openssl
dpkg-reconfigure -f noninteractive unattended-upgrades
systemctl enable --now fail2ban >/dev/null

step "Docker"
if ! command -v docker >/dev/null 2>&1; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -q
  apt-get install -y -q docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
else
  echo "Docker e deja instalat: $(docker --version)"
fi
systemctl enable --now docker >/dev/null
if [ -n "${SUDO_USER:-}" ] && [ "$SUDO_USER" != "root" ]; then
  usermod -aG docker "$SUDO_USER"
fi

step "Firewall: permit doar SSH, HTTP și HTTPS"
ufw allow OpenSSH >/dev/null
ufw allow 80/tcp >/dev/null
ufw allow 443/tcp >/dev/null
ufw allow 443/udp >/dev/null
ufw --force enable >/dev/null
ufw status | sed 's/^/   /'

step "Memorie swap (necesară la construirea site-ului pe serverele cu 1–2 GB RAM)"
if ! swapon --show | grep -q .; then
  mem_mb=$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)
  if [ "$mem_mb" -lt 4000 ]; then
    fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile
    grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo "Am adăugat 2 GB de swap."
  fi
else
  echo "Swap există deja."
fi

step "Fișierul de configurare .env"
if [ -f .env ]; then
  echo ".env există deja; nu îl modific."
else
  domain="${DOMAIN:-}"
  email="${ACME_EMAIL:-}"
  [ -n "$domain" ] || read -r -p "Domeniul site-ului (fără www, ex. numele-tau-tenis.ro): " domain
  [ -n "$email" ] || read -r -p "Adresa ta de email (pentru certificatul HTTPS): " email
  db_password=$(openssl rand -hex 24)
  secret=$(openssl rand -base64 48 | tr -d '\n')
  cp .env.example .env
  set_var() { sed -i "s|^$1=.*|$1=$2|" .env; }
  set_var APP_URL "https://$domain"
  set_var DOMAIN "$domain"
  set_var ACME_EMAIL "$email"
  set_var AUTH_SECRET "$secret"
  set_var POSTGRES_PASSWORD "$db_password"
  set_var DATABASE_URL "postgresql://tenis:$db_password@db:5432/tenis"
  set_var MEDIA_DIR "/app/storage/media"
  set_var EMAIL_FROM "\"Rezervări <rezervari@$domain>\""
  set_var SMTP_HOST ""
  set_var SMTP_PORT "587"
  chmod 600 .env
  echo "Am creat .env cu parole generate aleatoriu."
  echo "Mai ai de completat datele de email (SMTP_*) — vezi DEPLOY.md, pasul 5."
fi
chown -R "${SUDO_USER:-root}":"${SUDO_USER:-root}" "$PROJECT_DIR"

step "Gata"
cat <<MSG
Serverul e pregătit. Pașii următori (detaliați în DEPLOY.md):
  1. completează SMTP_HOST, SMTP_USER, SMTP_PASSWORD în .env:  nano .env
  2. pornește site-ul:                                         docker compose up -d --build
  3. creează contul tău de administrator:                     docker compose exec app node dist/admin-create.mjs
Deconectează-te și reconectează-te prin SSH ca să poți folosi docker fără sudo.
MSG
