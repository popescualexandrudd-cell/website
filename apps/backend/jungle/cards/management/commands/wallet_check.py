"""Checks the Wallet setup on the server after the certificates are installed (Q24):

    uv run python manage.py wallet_check

Apple: loads the certificates and signs a test pass. Google: loads the service account and
signs a test link. Nothing is sent to Apple or Google and no card is created.
"""

from __future__ import annotations

import uuid
from typing import Any

from django.core.management.base import BaseCommand
from django.utils import timezone

from jungle.accounts.models import User
from jungle.cards import wallet_apple, wallet_google
from jungle.cards.models import MemberCard


def _sample() -> MemberCard:
    now = timezone.now()
    user = User(first_name="Test", last_name="Wallet", created_at=now)
    return MemberCard(
        id=uuid.uuid4(),
        user=user,
        token="test-" + uuid.uuid4().hex,
        number="JP-TESTTEST",
        wallet_auth_token=uuid.uuid4().hex,
        issued_at=now,
        updated_at=now,
    )


class Command(BaseCommand):
    help = "Checks the Apple and Google Wallet configuration without contacting them."

    def handle(self, *args: Any, **options: Any) -> None:
        card = _sample()
        if wallet_apple.enabled():
            size = len(wallet_apple.build_pkpass(card))
            self.stdout.write(
                self.style.SUCCESS(f"Apple Wallet: pass de test semnat ({size} octeți).")
            )
        else:
            self.stdout.write(
                self.style.WARNING("Apple Wallet: dezactivat (APPLE_WALLET_ENABLED).")
            )
        if wallet_google.enabled():
            url = wallet_google.save_url(card)
            self.stdout.write(
                self.style.SUCCESS(f"Google Wallet: link de test semnat ({len(url)} caractere).")
            )
        else:
            self.stdout.write(
                self.style.WARNING("Google Wallet: dezactivat (GOOGLE_WALLET_ENABLED).")
            )
