"""How the league connects to the rest of the system (called once, from AppConfig.ready)."""

from __future__ import annotations

from typing import Any

from jungle.accounts.models import User
from jungle.cards import fields as card_fields
from jungle.cards.models import MemberCard
from jungle.cards.services import active_card, card_changed
from jungle.league import badges, matches, projection, services, store
from jungle.league.models import Ladder, LeagueEvent, LeagueSeason, SeasonStatus, Standing
from jungle.ledger import payments
from jungle.privacy import league_consent
from jungle.privacy import services as privacy

TIER_RO = {
    "bronze": "Bronz",
    "silver": "Argint",
    "gold": "Aur",
    "platinum": "Platină",
    "diamond": "Diamant",
    "master": "Maestru",
}
TIER_EN = {
    "bronze": "Bronze",
    "silver": "Silver",
    "gold": "Gold",
    "platinum": "Platinum",
    "diamond": "Diamond",
    "master": "Master",
}


def rank_label(tier: str, division: str, labels: dict[str, str]) -> str:
    return f"{labels[tier]} {division}".strip()


def wallet_fields(card: MemberCard) -> list[card_fields.CardField]:
    """R-023: the holder's own rank, LP and level in the main (doubles) ladder, in the
    holder's language."""
    row = (
        Standing.objects.filter(
            season__status=SeasonStatus.ACTIVE,
            ladder=Ladder.DOUBLES,
            competitor_id=str(card.user_id),
        )
        .select_related("season")
        .first()
    )
    if row is None or not services.is_playing(card.user):
        return []
    ro = card.user.preferred_language == "ro"
    if row.rank_index is None:
        left = row.placement_left
        return [
            card_fields.CardField(
                "placement",
                "Plasare",
                "Placement",
                f"{left} meciuri rămase" if ro else f"{left} matches left",
            )
        ]
    return [
        card_fields.CardField(
            "rank", "Rang", "Rank", rank_label(row.tier, row.division, TIER_RO if ro else TIER_EN)
        ),
        card_fields.CardField("lp", "LP", "LP", str(row.lp)),
        card_fields.CardField(
            "level", "Nivel", "Level", f"{projection.round_level(row.level):.1f}"
        ),
    ]


def refresh_cards(season: LeagueSeason, event: LeagueEvent, outcome: dict[str, Any]) -> None:
    """After a match, a bonus or decay, the players' Wallet cards show the new values."""
    ids: set[str] = set()
    for update in (
        outcome.get("updates", [])
        + outcome.get("decay", [])
        + ([outcome["bonus"]] if "bonus" in outcome else [])
    ):
        ids.update(update["competitor"].split("+"))
    if outcome.get("replayed"):
        rows = Standing.objects.filter(season=season).values_list("player_a_id", flat=True)
        ids.update(str(pk) for pk in rows)
    for user in User.objects.filter(pk__in=ids):
        card = active_card(user)
        if card is not None:
            card_changed(card)


def connect() -> None:
    card_fields.register(wallet_fields)
    league_consent.on_signed(services.try_join)
    league_consent.on_withdrawn(
        lambda user: services.leave(user, "Acordul pentru ligă a fost retras")
    )
    privacy.on_erased(lambda user: services.leave(user, "Cont șters"))
    store.on_applied(refresh_cards)
    store.on_applied(badges.after_match)
    payments.on_paid(matches.payment_received)
