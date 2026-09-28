#!/usr/bin/env bash
# Checks the kiosk OS files without installing anything (run by scripts/test-all):
# shell syntax, a dry-run render, the Chromium policy, and the service hardening.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
bash -n "$HERE/install.sh"
bash -n "$HERE/files/watchdog.sh"
env_file="$(mktemp)"
trap 'rm -f "$env_file"' EXIT
echo "BRIDGE_DEVICE_ID=00000000-0000-0000-0000-000000000000" >"$env_file"
root="$("$HERE/install.sh" --kiosk-url https://kiosk-liga.example.invalid/ \
  --api-url https://api.example.invalid/api/v1 --bridge-env "$env_file" --dry-run | sed -n 's/^dry run: files rendered under //p')"
trap 'rm -rf "$env_file" "$root"' EXIT
python3 - "$root" <<'PY'
import json, pathlib, sys
root = pathlib.Path(sys.argv[1])
files = [p for p in root.rglob("*") if p.is_file()]
leftover = [str(p) for p in files if "@KIOSK_" in p.read_text(errors="ignore") or "@API_" in p.read_text(errors="ignore")]
assert not leftover, f"placeholders left in {leftover}"
policy = json.loads((root / "etc/chromium/policies/managed/jungle.json").read_text())
assert policy["URLBlocklist"] == ["*"], "everything not allowed is blocked"
assert "https://kiosk-liga.example.invalid/" in policy["URLAllowlist"]
assert policy["DeveloperToolsAvailability"] == 2 and policy["DownloadRestrictions"] == 3
bridge = (root / "etc/systemd/system/jungle-bridge.service").read_text()
for line in ("User=jungle-bridge", "NoNewPrivileges=yes", "ProtectSystem=strict", "Restart=always",
             "EnvironmentFile=/etc/jungle-bridge/bridge.env", "CapabilityBoundingSet="):
    assert line in bridge, f"bridge service: {line}"
kiosk = (root / "etc/systemd/system/jungle-kiosk.service").read_text()
for line in ("User=kiosk", "--kiosk", "file:///opt/jungle-kiosk/start.html", "Restart=always"):
    assert line in kiosk, f"kiosk service: {line}"
env = root / "etc/jungle-bridge/bridge.env"
assert oct(env.stat().st_mode & 0o777) == "0o600", "the device token file is private"
start = (root / "opt/jungle-kiosk/start.html").read_text()
assert 'KIOSK_URL = "https://kiosk-liga.example.invalid/"' in start
print(f"kiosk-os: {len(files)} files rendered and checked")
PY
