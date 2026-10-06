"""The league consent (R-006, R-010, R-011, §12.2).

It is signed only at a registered League Kiosk (the kiosk endpoint arrives in Stage 7 and
calls `sign`), only by adults, and recorded with the user, the text version and its hash,
the date and time, the kiosk and the language shown. It is withdrawn from the account;
the league (Stage 6) listens and takes the player out of the league.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass

from django.db import transaction
from django.http import HttpRequest

from jungle.accounts.models import User
from jungle.accounts.services.authz import current_user
from jungle.audit import services as audit
from jungle.core import clock
from jungle.core.ai_origin import refuse_ai
from jungle.core.errors import DomainError, ErrorCode
from jungle.core.http import client_ip, user_agent
from jungle.devices.models import Device, DeviceKind
from jungle.legal.models import Consent, ConsentAction, DocumentKind, LegalDocument
from jungle.legal.services import current_document, record_consents

ADULT_AGE = 18
_withdrawal_listeners: list[Callable[[User], None]] = []
_signed_listeners: list[Callable[[User], object]] = []


def on_signed(listener: Callable[[User], object]) -> None:
    """The league registers here: signing may be the last condition for joining (§6.4)."""
    if listener not in _signed_listeners:
        _signed_listeners.append(listener)


def on_withdrawn(listener: Callable[[User], None]) -> None:
    """The league registers here to take a player out of the league (Stage 6)."""
    if listener not in _withdrawal_listeners:
        _withdrawal_listeners.append(listener)


def latest(user: User) -> Consent | None:
    return (
        Consent.objects.filter(user=user, document__kind=DocumentKind.LEAGUE_GDPR)
        .select_related("document")
        .order_by("-occurred_at", "-id")
        .first()
    )


def is_adult(user: User) -> bool:
    """R-006: the league is 18+, checked from the date of birth."""
    return (
        user.date_of_birth is not None
        and clock.age_on(user.date_of_birth, clock.today_local()) >= ADULT_AGE
    )


def sign(request: HttpRequest, user: User, device: Device, language: str) -> Consent:
    """R-010: the ticked consent at the League Kiosk. Signing the current version twice
    records nothing new."""
    refuse_ai("consents")  # ADR-0019, the second barrier
    if device.kind != DeviceKind.LEAGUE_KIOSK or not device.is_active:
        raise DomainError(ErrorCode.LEAGUE_KIOSK_ONLY, status=403)
    if not is_adult(user):
        raise DomainError(ErrorCode.LEAGUE_ADULTS_ONLY, status=403)
    document = current_document(DocumentKind.LEAGUE_GDPR, language)
    with transaction.atomic():
        last = latest(user)
        if (
            last is not None
            and last.action == ConsentAction.GRANTED
            and last.document_id == document.pk
        ):
            return last
        (consent,) = record_consents(user, [document], request, device=device)
        audit.record(
            audit.actor_from_request(request),
            "league.consent_signed",
            target=consent,
            after={"user": str(user.pk), "version": document.version, "device": str(device.pk)},
        )
        for listener in _signed_listeners:
            listener(user)
    return consent


@dataclass(frozen=True)
class ConsentStatus:
    signed: bool
    version: int | None
    current_version: int | None
    outdated: bool
    signed_at: str | None


def status(user: User, language: str) -> ConsentStatus:
    """Whether the player may play in the league; `outdated` asks the kiosk to show the new text."""
    last = latest(user)
    current = (
        LegalDocument.objects.filter(
            kind=DocumentKind.LEAGUE_GDPR, language=language, published_at__lte=clock.now()
        )
        .order_by("-version")
        .first()
    )
    signed = last is not None and last.action == ConsentAction.GRANTED
    version = last.document.version if signed and last is not None else None
    current_version = current.version if current else None
    return ConsentStatus(
        signed=signed,
        version=version,
        current_version=current_version,
        outdated=signed
        and version is not None
        and current_version is not None
        and version < current_version,
        signed_at=last.occurred_at.isoformat() if signed and last is not None else None,
    )


def withdraw(request: HttpRequest) -> Consent:
    """R-011: from the account, at any time. A new WITHDRAWN row (consents are append-only)."""
    refuse_ai("consents")  # ADR-0019, the second barrier
    user = current_user(request)
    with transaction.atomic():
        last = latest(user)
        if last is None or last.action != ConsentAction.GRANTED:
            raise DomainError(ErrorCode.PRIVACY_NO_CONSENT, status=409)
        consent = Consent.objects.create(
            user=user,
            document=last.document,
            action=ConsentAction.WITHDRAWN,
            text_sha256=last.document.sha256,
            language=last.language,
            ip=client_ip(request),
            user_agent=user_agent(request),
        )
        audit.record(audit.actor_from_request(request), "league.consent_withdrawn", target=consent)
        for listener in _withdrawal_listeners:
            listener(user)
    return consent
