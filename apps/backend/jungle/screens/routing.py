from django.urls import path

from jungle.screens.realtime import ScreenConsumer

websocket_urlpatterns = [path("ws/screens/", ScreenConsumer.as_asgi())]
