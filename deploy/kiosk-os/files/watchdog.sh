#!/usr/bin/env bash
# ADR-0014: restarts the Hardware Bridge or the kiosk screen when they stop answering; after
# repeated failures, restarts the machine. (systemd already restarts a crashed service; this
# catches a service that runs but hangs.) Logs go to the journal.
set -uo pipefail
STATE=/run/jungle-kiosk-watchdog
mkdir -p "$STATE"
PORT="${BRIDGE_PORT:-8765}"

fail() {  # count consecutive failures of one check; reboot after 5
  local name="$1" count
  count=$(( $(cat "$STATE/$name" 2>/dev/null || echo 0) + 1 ))
  echo "$count" >"$STATE/$name"
  logger -t jungle-watchdog "$name failed ($count)"
  if [ "$count" -ge 5 ]; then
    logger -t jungle-watchdog "rebooting after repeated $name failures"
    systemctl reboot
  fi
}
ok() { rm -f "$STATE/$1"; }

# The bridge listens on 127.0.0.1 only.
if ss -ltnH "sport = :$PORT" | grep -q "127.0.0.1:$PORT"; then
  ok bridge
else
  systemctl restart jungle-bridge.service
  fail bridge
fi

# The screen: the service is running and Chromium's main process exists.
if systemctl is-active --quiet jungle-kiosk.service && pgrep -u kiosk -x chromium >/dev/null; then
  ok screen
else
  systemctl restart jungle-kiosk.service
  fail screen
fi
exit 0
