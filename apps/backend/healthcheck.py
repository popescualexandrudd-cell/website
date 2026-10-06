"""The backend's health, asked from inside its container (the image's HEALTHCHECK and
deploy/scripts/update): GET /api/v1/health as the proxy would send it, with the first allowed
host name and HTTPS (in production Django refuses an unknown host and redirects plain HTTP)."""

import os
import sys
import urllib.request

host = (os.environ.get("DJANGO_ALLOWED_HOSTS") or "localhost").split(",")[0].strip()
request = urllib.request.Request(
    "http://127.0.0.1:8000/api/v1/health",
    headers={"Host": host, "X-Forwarded-Proto": "https"},
)
try:
    with urllib.request.urlopen(request, timeout=5) as response:  # noqa: S310 (a fixed http URL)
        sys.exit(0 if response.status == 200 else 1)
except OSError:
    sys.exit(1)
