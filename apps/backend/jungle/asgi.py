import os

from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "jungle.settings")
# WebSockets (Django Channels, ADR-0005) are added in the stages that need live data.
application = get_asgi_application()
