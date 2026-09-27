"""What a Wallet card shows. The card belongs to its holder, so it may show their own
level, rank and LP (R-023); nothing about anyone else.

The league (Stage 6) adds its fields with `register`; the card then refreshes after every
validated match through `jungle.cards.services.card_changed`.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass

from jungle.cards.models import MemberCard


@dataclass(frozen=True)
class CardField:
    key: str
    label_ro: str
    label_en: str
    value: str


Provider = Callable[[MemberCard], list[CardField]]
_providers: list[Provider] = []


def register(provider: Provider) -> None:
    if provider not in _providers:
        _providers.append(provider)


def card_fields(card: MemberCard) -> list[CardField]:
    fields = [
        CardField("member_since", "Membru din", "Member since", f"{card.user.created_at:%m.%Y}")
    ]
    for provider in _providers:
        fields.extend(provider(card))
    return fields


def full_name(card: MemberCard) -> str:
    return f"{card.user.first_name} {card.user.last_name}".strip()
