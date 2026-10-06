"""Member cards (R-020 … R-025): issuing, blocking and reissuing, reading a scanned code,
the print queue (R-021) and the Diamond card (R-024, Q1)."""

from __future__ import annotations

import secrets
import uuid
from collections.abc import Callable
from dataclasses import dataclass
from functools import partial

from django.db import IntegrityError, transaction
from django.db.models import QuerySet
from django.http import HttpRequest

from jungle.accounts.models import User
from jungle.accounts.services.authz import authorize, current_user
from jungle.audit import services as audit
from jungle.cards.models import (
    CardStatus,
    MemberCard,
    PhysicalCardRequest,
    PrintReason,
    PrintStatus,
)
from jungle.cards.printing import PrintableCard, cards_pdf
from jungle.configuration.services import get_config
from jungle.core import clock
from jungle.core.errors import DomainError, ErrorCode
from jungle.core.permissions import Action
from jungle.locations.models import Location
from jungle.notifications import services as notifications
from jungle.notifications.services import account_path

NUMBER_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

# Called after a card changes, so Wallet passes refresh (R-023). Set by jungle.cards.wallet.
_listeners: list[Callable[[MemberCard], None]] = []


def on_card_changed(listener: Callable[[MemberCard], None]) -> None:
    _listeners.append(listener)


def _changed(card: MemberCard) -> None:
    for listener in _listeners:
        transaction.on_commit(partial(listener, card))


def card_changed(card: MemberCard) -> None:
    """Something shown on the card changed (name, rank, LP after a match, R-023)."""
    MemberCard.objects.filter(pk=card.pk).update(updated_at=clock.now())
    card.refresh_from_db()
    _changed(card)


# ---------------------------------------------------------------- issuing
def _new_number() -> str:
    return "JP-" + "".join(secrets.choice(NUMBER_ALPHABET) for _ in range(8))


def issue_card(actor: audit.Actor, user: User, reason: str = "Card nou") -> MemberCard:
    """R-022: a new random token; every older card of the person stops working."""
    with transaction.atomic():
        now = clock.now()
        old = list(
            MemberCard.objects.select_for_update().filter(user=user, status=CardStatus.ACTIVE)
        )
        for card in old:
            card.status = CardStatus.REVOKED
            card.revoked_at = now
            card.revoke_reason = reason[:250]
            card.updated_at = now
            card.save(update_fields=["status", "revoked_at", "revoke_reason", "updated_at"])
            _changed(card)  # the old Wallet passes show "invalid"
        for _ in range(5):  # pragma: no branch - random numbers practically never repeat
            try:
                with transaction.atomic():
                    card = MemberCard.objects.create(
                        user=user,
                        token=secrets.token_urlsafe(32),
                        number=_new_number(),
                        wallet_auth_token=secrets.token_urlsafe(32),
                        issued_at=now,
                        updated_at=now,
                    )
                break
            except IntegrityError:  # pragma: no cover - a repeated random number
                continue
        audit.record(
            actor,
            "cards.issued",
            target=card,
            after={"user": str(user.pk), "revoked": [str(c.pk) for c in old]},
            reason=reason,
        )
        _send_card_email(user, card)
    return card


def _send_card_email(user: User, card: MemberCard) -> None:
    """§11 "card emis (cu linkuri Wallet)": email and push, once per card."""
    context = {"number": card.number, "url": account_path(user.preferred_language, "card")}
    notifications.notify(user, "account.card_issued", context, subject=str(card.pk))


def active_card(user: User) -> MemberCard | None:
    return MemberCard.objects.filter(user=user, status=CardStatus.ACTIVE).first()


def my_card(request: HttpRequest) -> MemberCard:
    """The customer's card; the first one is created on the first request (R-020)."""
    user = current_user(request)
    card = active_card(user)
    if card is None:
        card = issue_card(audit.actor_from_request(request), user, "Primul card")
    return card


def replace_my_card(request: HttpRequest) -> MemberCard:
    """R-022: lost card → blocked at once and replaced; the old code stops working."""
    user = current_user(request)
    return issue_card(
        audit.actor_from_request(request), user, "Card pierdut sau înlocuit (din cont)"
    )


def _user(user_id: uuid.UUID) -> User:
    user = User.objects.filter(pk=user_id, is_active=True).first()
    if user is None:
        raise DomainError(ErrorCode.ACCOUNTS_NOT_FOUND, status=404)
    return user


def staff_reissue(
    request: HttpRequest, user_id: uuid.UUID, location_id: uuid.UUID, reason: str, print_card: bool
) -> MemberCard:
    authorize(request, Action.CARDS_MANAGE, location_id)
    if not reason.strip():
        raise DomainError(ErrorCode.VALIDATION_INVALID, params={"field": "reason"})
    location = Location.objects.filter(pk=location_id).first()
    if location is None:
        raise DomainError(ErrorCode.LOCATIONS_NOT_FOUND, status=404)
    user = _user(user_id)
    with transaction.atomic():
        had_card = MemberCard.objects.filter(user=user).exists()
        card = issue_card(audit.actor_from_request(request), user, reason)
        if print_card:
            PhysicalCardRequest.objects.create(
                card=card,
                location=location,
                reason=PrintReason.REISSUE if had_card else PrintReason.NEW_MEMBER,
                created_at=clock.now(),
            )
    return card


def block_card(
    request: HttpRequest, card_id: uuid.UUID, location_id: uuid.UUID, reason: str
) -> MemberCard:
    """Staff block a card without issuing a new one (e.g. misuse); audited."""
    authorize(request, Action.CARDS_MANAGE, location_id)
    if not reason.strip():
        raise DomainError(ErrorCode.VALIDATION_INVALID, params={"field": "reason"})
    with transaction.atomic():
        card = MemberCard.objects.select_for_update().filter(pk=card_id).first()
        if card is None:
            raise DomainError(ErrorCode.CARDS_NOT_FOUND, status=404)
        if card.status == CardStatus.ACTIVE:
            now = clock.now()
            card.status = CardStatus.REVOKED
            card.revoked_at = now
            card.revoke_reason = reason[:250]
            card.updated_at = now
            card.save()
            _changed(card)
            audit.record(
                audit.actor_from_request(request), "cards.blocked", target=card, reason=reason
            )
    return card


# ---------------------------------------------------------------- scanning (R-025)
def resolve(token: str) -> MemberCard:
    """The active card behind a scanned code. Unknown or blocked codes are refused the same
    way, so a scanner cannot tell which codes once existed."""
    card = (
        MemberCard.objects.select_related("user")
        .filter(token=token.strip(), status=CardStatus.ACTIVE, user__is_active=True)
        .first()
    )
    if card is None:
        raise DomainError(ErrorCode.CARDS_INVALID, status=404)
    return card


# ---------------------------------------------------------- print queue (R-021), Diamond (R-024)
def print_queue(request: HttpRequest, location_id: uuid.UUID) -> QuerySet[PhysicalCardRequest]:
    authorize(request, Action.CARDS_MANAGE, location_id)
    return (
        PhysicalCardRequest.objects.filter(location_id=location_id)
        .exclude(status__in=(PrintStatus.HANDED_OVER, PrintStatus.CANCELLED))
        .select_related("card", "card__user")
    )


def _emblem_label(emblem: str) -> str:
    return emblem.replace("_", " ").title()


def printable(request_row: PhysicalCardRequest) -> PrintableCard:
    user = request_row.card.user
    subtitle = "Membru"
    if request_row.reason == PrintReason.DIAMOND:
        subtitle = f"Diamant · {_emblem_label(request_row.emblem)}"
    elif request_row.reason == PrintReason.KING:
        subtitle = "Rege al Junglei"
    return PrintableCard(
        user.first_name, user.last_name, request_row.card.number, request_row.card.token, subtitle
    )


def print_pdf(request: HttpRequest, location_id: uuid.UUID, request_ids: list[uuid.UUID]) -> bytes:
    """The PDF of the chosen queued cards; a Diamond card waits for its emblem (Q1)."""
    rows = list(
        print_queue(request, location_id).filter(
            pk__in=request_ids, status=PrintStatus.QUEUED, card__status=CardStatus.ACTIVE
        )
    )
    rows = [r for r in rows if r.reason != PrintReason.DIAMOND or r.emblem]
    if not rows:
        raise DomainError(ErrorCode.CARDS_NOTHING_TO_PRINT, status=409)
    audit.record(
        audit.actor_from_request(request),
        "cards.print_pdf",
        target=rows[0],
        after={"requests": [str(r.pk) for r in rows]},
    )
    return cards_pdf([printable(r) for r in rows])


def set_print_status(
    request: HttpRequest, request_id: uuid.UUID, location_id: uuid.UUID, status: str
) -> PhysicalCardRequest:
    """queued → printed → handed over; or cancelled while not handed over."""
    with transaction.atomic():
        row = (
            print_queue(request, location_id)
            .select_for_update(of=("self",))
            .filter(pk=request_id)
            .first()
        )
        if row is None:
            raise DomainError(ErrorCode.CARDS_NOT_FOUND, status=404)
        allowed = {
            PrintStatus.QUEUED: (PrintStatus.PRINTED, PrintStatus.CANCELLED),
            PrintStatus.PRINTED: (PrintStatus.HANDED_OVER, PrintStatus.CANCELLED),
        }
        if status not in allowed.get(PrintStatus(row.status), ()):
            raise DomainError(ErrorCode.CARDS_INVALID_TRANSITION, status=409)
        row.status = status
        if status == PrintStatus.PRINTED:
            row.printed_at = clock.now()
        elif status == PrintStatus.HANDED_OVER:
            row.handed_over_at = clock.now()
        row.save()
        audit.record(audit.actor_from_request(request), f"cards.print_{status}", target=row)
    return row


def offer_diamond_card(user: User, location: Location) -> PhysicalCardRequest | None:
    """R-024, Q1: the first promotion to Diamond gives a new physical card with an emblem
    the player chooses. Once in a lifetime. Called by the league (Stage 6)."""
    card = active_card(user)
    if (
        card is None
        or PhysicalCardRequest.objects.filter(card__user=user, reason=PrintReason.DIAMOND)
        .exclude(status=PrintStatus.CANCELLED)
        .exists()
    ):
        return None
    row = PhysicalCardRequest.objects.create(
        card=card, location=location, reason=PrintReason.DIAMOND, created_at=clock.now()
    )
    audit.record(audit.SYSTEM, "cards.diamond_offered", target=row)
    return row


def offer_king_card(user: User, location: Location) -> PhysicalCardRequest | None:
    """§6.12, LG-120: the special card of a King of the Jungle, at the end of every season."""
    card = active_card(user)
    if card is None:
        return None
    row = PhysicalCardRequest.objects.create(
        card=card, location=location, reason=PrintReason.KING, created_at=clock.now()
    )
    audit.record(audit.SYSTEM, "cards.king_offered", target=row)
    return row


def emblems() -> list[str]:
    return list(get_config("cards.diamond_emblems"))


def choose_emblem(request: HttpRequest, emblem: str) -> PhysicalCardRequest:
    user = current_user(request)
    if emblem not in emblems():
        raise DomainError(ErrorCode.CARDS_INVALID_EMBLEM)
    with transaction.atomic():
        row = (
            PhysicalCardRequest.objects.select_for_update()
            .filter(card__user=user, reason=PrintReason.DIAMOND, status=PrintStatus.QUEUED)
            .first()
        )
        if row is None:
            raise DomainError(ErrorCode.CARDS_NOT_FOUND, status=404)
        row.emblem = emblem
        row.save(update_fields=["emblem"])
        audit.record(
            audit.actor_from_request(request),
            "cards.emblem_chosen",
            target=row,
            after={"emblem": emblem},
        )
    return row


@dataclass(frozen=True)
class DiamondOffer:
    request_id: uuid.UUID
    emblem: str
    status: str


def my_diamond_offer(request: HttpRequest) -> DiamondOffer | None:
    user = current_user(request)
    row = (
        PhysicalCardRequest.objects.filter(card__user=user, reason=PrintReason.DIAMOND)
        .exclude(status=PrintStatus.CANCELLED)
        .first()
    )
    return DiamondOffer(row.pk, row.emblem, row.status) if row else None
