"""ASGI entry point: HTTP (the API) and WebSockets (live updates for the screens, ADR-0005)."""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "jungle.settings")
http = get_asgi_application()  # Django first: the WebSocket routes import models

from channels.routing import ProtocolTypeRouter, URLRouter  # noqa: E402

from jungle.screens.routing import websocket_urlpatterns  # noqa: E402

application = ProtocolTypeRouter({"http": http, "websocket": URLRouter(websocket_urlpatterns)})
