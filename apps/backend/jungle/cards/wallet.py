"""Keeps the Wallet cards up to date (R-023): after any change to a card, Apple and Google
are told, once the database transaction has committed."""

from __future__ import annotations

from jungle.cards import wallet_apple, wallet_google
from jungle.cards.models import MemberCard


def refresh(card: MemberCard) -> None:
    wallet_apple.refresh(card)
    wallet_google.refresh(card)
