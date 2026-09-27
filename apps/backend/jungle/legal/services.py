"""Publishing legal documents and recording consent (R-011: user, version, text hash,
date and time, device, displayed language)."""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass

from django.db import transaction
from django.db.models import Max
from django.http import HttpRequest

from jungle.accounts.models import User
from jungle.audit import services as audit
from jungle.core import clock
from jungle.core.crypto import sha256_hex
from jungle.core.errors import DomainError, ErrorCode
from jungle.core.http import client_ip, user_agent
from jungle.devices.models import Device
from jungle.legal.models import (
    REGISTRATION_DOCUMENTS,
    Consent,
    ConsentAction,
    DocumentKind,
    LegalDocument,
)


@dataclass(frozen=True)
class AcceptedDocument:
    kind: str
    version: int
    language: str


def publish_document(
    actor: audit.Actor,
    kind: DocumentKind,
    language: str,
    title: str,
    body: str,
    *,
    is_demo: bool = False,
) -> LegalDocument:
    with transaction.atomic():
        last = LegalDocument.objects.filter(kind=kind, language=language).aggregate(
            v=Max("version")
        )["v"]
        doc = LegalDocument.objects.create(
            kind=kind,
            version=(last or 0) + 1,
            language=language,
            title=title,
            body=body,
            sha256=sha256_hex(body),
            is_demo=is_demo,
            published_at=clock.now(),
            created_by_id=actor.user_id,
        )
        audit.record(
            actor,
            "legal.document_published",
            target=doc,
            after={
                "kind": kind,
                "version": doc.version,
                "language": language,
                "sha256": doc.sha256,
            },
        )
    return doc


def current_document(kind: str, language: str) -> LegalDocument:
    doc = (
        LegalDocument.objects.filter(kind=kind, language=language, published_at__lte=clock.now())
        .order_by("-version")
        .first()
    )
    if doc is None:
        raise DomainError(
            ErrorCode.LEGAL_DOCUMENT_UNAVAILABLE,
            status=404,
            params={"kind": kind, "language": language},
        )
    return doc


def documents_to_accept(accepted: Iterable[AcceptedDocument]) -> list[LegalDocument]:
    """Check that every registration document was accepted in its current version."""
    by_kind = {a.kind: a for a in accepted}
    docs = []
    for kind in REGISTRATION_DOCUMENTS:
        item = by_kind.get(kind)
        if item is None:
            raise DomainError(ErrorCode.LEGAL_CONSENT_MISSING, params={"kind": kind})
        doc = current_document(kind, item.language)
        if doc.version != item.version:
            raise DomainError(
                ErrorCode.LEGAL_CONSENT_OUTDATED,
                params={"kind": kind, "current_version": doc.version},
            )
        docs.append(doc)
    return docs


def record_consents(
    user: User,
    documents: Iterable[LegalDocument],
    request: HttpRequest,
    device: Device | None = None,
) -> list[Consent]:
    return [
        Consent.objects.create(
            user=user,
            document=doc,
            action=ConsentAction.GRANTED,
            text_sha256=doc.sha256,
            language=doc.language,
            device=device,
            ip=client_ip(request),
            user_agent=user_agent(request),
        )
        for doc in documents
    ]


def consent_history(user: User) -> list[Consent]:
    return list(Consent.objects.filter(user=user).select_related("document"))
