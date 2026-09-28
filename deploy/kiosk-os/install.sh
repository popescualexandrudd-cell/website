#!/usr/bin/env bash
# Turns a fresh Debian 12/13 mini-PC into a Jungle Padel kiosk (ADR-0013, ADR-0014):
#   - the Hardware Bridge as a system service (its own user, key and cash journal on disk);
#   - Chromium full screen in cage on tty1, as the unprivileged user "kiosk", allowed to open
#     only the kiosk app (and the local "temporarily unavailable" page);
#   - a watchdog (services and hardware), no consoles, no SysRq, automatic security updates.
#
# Run as root, from a checkout of the repository:
#   sudo deploy/kiosk-os/install.sh --kiosk-url https://kiosk-liga.example.ro/ \
#        --api-url https://api.example.ro/api/v1 --bridge-env /path/to/bridge.env
# The bridge.env file comes from the enrollment runbook (docs/09-hardware/03-instalare-chiosc.md);
# it holds the device token and is copied with mode 600, never printed.
set -euo pipefail

usage() {
  echo "usage: $0 --kiosk-url URL --api-url URL --bridge-env FILE [--dry-run]" >&2
  exit 2
}

KIOSK_URL="" API_URL="" BRIDGE_ENV="" DRY_RUN=0
while [ $# -gt 0 ]; do
  case "$1" in
    --kiosk-url) KIOSK_URL="${2:-}"; shift 2 ;;
    --api-url) API_URL="${2:-}"; shift 2 ;;
    --bridge-env) BRIDGE_ENV="${2:-}"; shift 2 ;;
    --dry-run) DRY_RUN=1; shift ;;
    *) usage ;;
  esac
done
[ -n "$KIOSK_URL" ] && [ -n "$API_URL" ] && [ -n "$BRIDGE_ENV" ] || usage
case "$KIOSK_URL$API_URL" in *'"'*|*' '*|*'|'*) echo "URLs must not contain quotes, spaces or |" >&2; exit 2 ;; esac
[[ "$KIOSK_URL" == https://* || "$DRY_RUN" == 1 ]] || { echo "the kiosk URL must be https" >&2; exit 2; }
[ -r "$BRIDGE_ENV" ] || { echo "cannot read $BRIDGE_ENV" >&2; exit 2; }

HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/../.." && pwd)"
FILES="$HERE/files"
origin() { printf '%s' "$1" | sed -E 's#^(https?://[^/]+).*#\1#'; }
KIOSK_ORIGIN="$(origin "$KIOSK_URL")"
API_ORIGIN="$(origin "$API_URL")"

# Everything below writes to the system; --dry-run only renders the files into a folder.
ROOT="/"
if [ "$DRY_RUN" = 1 ]; then
  ROOT="$(mktemp -d)"
  echo "dry run: files rendered under $ROOT"
else
  [ "$(id -u)" = 0 ] || { echo "run as root" >&2; exit 1; }
  grep -qi debian /etc/os-release || { echo "Debian 12/13 expected (ADR-0014)" >&2; exit 1; }
fi
put() {  # put <mode> <source> <destination>
  install -D -m "$1" "$2" "$ROOT/${3#/}"
}
render() {  # render <mode> <template> <destination>
  local tmp
  tmp="$(mktemp)"
  sed -e "s|@KIOSK_URL@|$KIOSK_URL|g" -e "s|@KIOSK_ORIGIN@|$KIOSK_ORIGIN|g" \
      -e "s|@API_ORIGIN@|$API_ORIGIN|g" "$2" >"$tmp"
  put "$1" "$tmp" "$3"
  rm -f "$tmp"
}

if [ "$DRY_RUN" = 0 ]; then
  echo "==> Packages"
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -q
  apt-get install -y -q --no-install-recommends chromium cage seatd python3 python3-venv \
    ca-certificates libnss3-tools unattended-upgrades iproute2 procps curl
  echo "==> Users"
  id jungle-bridge >/dev/null 2>&1 || useradd --system --home /var/lib/jungle-bridge --shell /usr/sbin/nologin jungle-bridge
  id kiosk >/dev/null 2>&1 || useradd --create-home --shell /usr/sbin/nologin kiosk
  usermod -aG video,input,render kiosk
  gpasswd -d kiosk sudo >/dev/null 2>&1 || true
fi

echo "==> Hardware Bridge"
if [ "$DRY_RUN" = 0 ]; then
  rm -rf /opt/jungle-bridge
  mkdir -p /opt/jungle-bridge
  cp -r "$REPO/services/hardware-bridge/src" "$REPO/services/hardware-bridge/pyproject.toml" /opt/jungle-bridge/
  python3 -m venv /opt/jungle-bridge/.venv
  /opt/jungle-bridge/.venv/bin/pip install --quiet /opt/jungle-bridge
fi
put 600 "$BRIDGE_ENV" /etc/jungle-bridge/bridge.env
put 644 "$FILES/jungle-bridge.service" /etc/systemd/system/jungle-bridge.service

echo "==> Kiosk screen"
put 644 "$FILES/jungle-kiosk.service" /etc/systemd/system/jungle-kiosk.service
render 644 "$FILES/start.html" /opt/jungle-kiosk/start.html
put 644 "$REPO/packages/design-tokens/dist/tokens.css" /opt/jungle-kiosk/tokens.css
put 755 "$FILES/watchdog.sh" /opt/jungle-kiosk/watchdog.sh
render 644 "$FILES/chromium-policy.json" /etc/chromium/policies/managed/jungle.json
tmp_env="$(mktemp)"
printf 'KIOSK_URL=%s\n' "$KIOSK_URL" >"$tmp_env"
put 644 "$tmp_env" /etc/jungle-kiosk/kiosk.env
rm -f "$tmp_env"

echo "==> Watchdog and lockdown"
put 644 "$FILES/jungle-kiosk-watchdog.service" /etc/systemd/system/jungle-kiosk-watchdog.service
put 644 "$FILES/jungle-kiosk-watchdog.timer" /etc/systemd/system/jungle-kiosk-watchdog.timer
put 644 "$FILES/logind-kiosk.conf" /etc/systemd/logind.conf.d/jungle-kiosk.conf
put 644 "$FILES/sysctl-kiosk.conf" /etc/sysctl.d/90-jungle-kiosk.conf
put 644 "$FILES/watchdog-hardware.conf" /etc/systemd/system.conf.d/jungle-watchdog.conf
put 644 "$FILES/52jungle-unattended-upgrades" /etc/apt/apt.conf.d/52jungle-unattended-upgrades

if [ "$DRY_RUN" = 0 ]; then
  systemctl mask ctrl-alt-del.target getty@tty2.service getty@tty3.service getty@tty4.service \
    getty@tty5.service getty@tty6.service >/dev/null
  systemctl set-default graphical.target >/dev/null
  sysctl --system >/dev/null
  systemctl daemon-reload
  systemctl enable --now seatd.service jungle-bridge.service jungle-kiosk-watchdog.timer
  systemctl enable jungle-kiosk.service
  echo
  echo "Bridge public key (paste it in the admin at enrollment):"
  # Same user, settings and data folder as the service (the token is never on a command line).
  systemd-run --quiet --wait --pipe -p User=jungle-bridge -p StateDirectory=jungle-bridge \
    -p EnvironmentFile=/etc/jungle-bridge/bridge.env -p Environment=BRIDGE_DATA_DIR=/var/lib/jungle-bridge \
    /opt/jungle-bridge/.venv/bin/jungle-bridge public-key
  echo
  echo "Done. Reboot to start the kiosk screen: systemctl reboot"
fi
