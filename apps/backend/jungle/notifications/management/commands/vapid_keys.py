"""Makes the VAPID key pair of the push notifications (once, before the launch; Q17)."""

from __future__ import annotations

from typing import Any

from django.core.management.base import BaseCommand

from jungle.notifications.webpush import generate_keys


class Command(BaseCommand):
    help = "Generează cheile VAPID pentru notificările push; se pun doar în .env pe server."

    def handle(self, *args: Any, **options: Any) -> None:
        public, private = generate_keys()
        self.stdout.write(f"VAPID_PUBLIC_KEY={public}\nVAPID_PRIVATE_KEY={private}")
        self.stdout.write(
            self.style.WARNING("Cheia privată nu se trimite pe chat și nu intră în git.")
        )
