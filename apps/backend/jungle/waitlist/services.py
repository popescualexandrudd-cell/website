"""Waitlist sign-up, confirmation, unsubscribe and staff export (Stage 1B)."""

from __future__ import annotations

import csv
import io
from dataclasses import dataclass
from datetime import timedelta
from urllib.parse import urlencode

from django.conf import settings
from django.core import signing
from django.db import transaction
from django.db.models import QuerySet
from django.http import HttpRequest

from jungle.accounts.models import normalize_email
from jungle.accounts.services.authz import authorize
from jungle.accounts.services.validation import clean_email, clean_phone
from jungle.audit import services as audit
from jungle.configuration.services import get_config
from jungle.core import clock
from jungle.core.crypto import sha256_hex
from jungle.core.errors import DomainError, ErrorCode
from jungle.core.http import client_ip, user_agent
from jungle.core.permissions import Action
from jungle.core.ratelimit import increment
from jungle.legal.models import DocumentKind
from jungle.legal.services import current_document
from jungle.notifications.email import send_templated_email
from jungle.waitlist.models import Interest, Status, WaitlistEntry

CONFIRM_SALT = "jungle.waitlist.confirm"
UNSUBSCRIBE_SALT = "jungle.waitlist.unsubscribe"
SIGNUPS_PER_IP_PER_HOUR = 5
RESEND_COOLDOWN = timedelta(minutes=10)

_PATHS = {
    "confirm": {"ro": "/ro/lista/confirmare", "en": "/en/waitlist/confirm"},
    "unsubscribe": {"ro": "/ro/lista/dezabonare", "en": "/en/waitlist/unsubscribe"},
}


@dataclass(frozen=True)
class SignupData:
    email: str
    name: str
    phone: str
    interests: list[str]
    language: str
    notice_version: int
    source: str = ""
    honeypot: str = ""


def _link(kind: str, language: str, token: str) -> str:
    lang = language if language in ("ro", "en") else "ro"
    return f"{settings.WEB_BASE_URL}{_PATHS[kind][lang]}?{urlencode({'token': token})}"


def confirm_token(entry: WaitlistEntry) -> str:
    return signing.dumps({"w": str(entry.pk), "h": entry.email_sha256}, salt=CONFIRM_SALT)


def unsubscribe_token(entry: WaitlistEntry) -> str:
    return signing.dumps({"w": str(entry.pk), "h": entry.email_sha256}, salt=UNSUBSCRIBE_SALT)


def _send_confirmation(entry: WaitlistEntry) -> None:
    if not entry.email:
        return
    send_templated_email(
        "waitlist_confirm",
        entry.email,
        entry.language,
        {
            "name": entry.name,
            "link": _link("confirm", entry.language, confirm_token(entry)),
            "unsubscribe_link": _link("unsubscribe", entry.language, unsubscribe_token(entry)),
            "ttl_days": int(get_config("waitlist.confirmation_ttl_days")),
        },
    )


def signup(request: HttpRequest, data: SignupData) -> None:
    """Always ends the same way for the caller ("check your email"): no account enumeration."""
    if data.honeypot:
        return  # bots fill the hidden field; pretend success, store nothing
    if increment(f"waitlist:ip:{client_ip(request)}", 3600) > SIGNUPS_PER_IP_PER_HOUR:
        raise DomainError(
            ErrorCode.AUTH_RATE_LIMITED, status=429, params={"retry_after_seconds": 3600}
        )
    email = clean_email(data.email)
    phone = clean_phone(data.phone) if data.phone.strip() else ""
    interests = sorted(set(data.interests))
    if any(i not in Interest.values for i in interests):
        raise DomainError(ErrorCode.VALIDATION_INVALID, params={"fields": ["interests"]})
    notice = current_document(DocumentKind.WAITLIST_NOTICE, data.language)
    if notice.version != data.notice_version:
        raise DomainError(
            ErrorCode.LEGAL_CONSENT_OUTDATED,
            params={"kind": DocumentKind.WAITLIST_NOTICE, "current_version": notice.version},
        )
    digest = sha256_hex(normalize_email(email))
    now = clock.now()
    with transaction.atomic():
        entry = WaitlistEntry.objects.select_for_update().filter(email_sha256=digest).first()
        if entry is not None and entry.status == Status.CONFIRMED:
            return  # already on the list: nothing to do, nothing revealed
        if entry is not None and entry.status == Status.PENDING:
            sent = entry.confirmation_sent_at
            if sent is not None and now - sent < RESEND_COOLDOWN:
                return
        else:
            entry = entry or WaitlistEntry(email_sha256=digest)
            entry.status = Status.PENDING
            entry.withdrawn_at = None
            entry.confirmed_at = None
        entry.email = email
        entry.name = data.name.strip()
        entry.phone = phone
        entry.interests = interests
        entry.language = data.language
        entry.source = data.source.strip()[:60]
        entry.notice = notice
        entry.notice_sha256 = notice.sha256
        entry.consent_ip = client_ip(request)
        entry.consent_user_agent = user_agent(request)
        entry.confirmation_sent_at = now
        entry.save()
        audit.record(
            audit.actor_from_request(request),
            "waitlist.signup",
            target=entry,
            after={
                "interests": interests,
                "language": data.language,
                "notice_version": notice.version,
            },
        )
        transaction.on_commit(lambda: _send_confirmation(entry))


def _load(token: str, salt: str, max_age: int | None) -> WaitlistEntry:
    try:
        payload = signing.loads(token, salt=salt, max_age=max_age)
    except signing.SignatureExpired as exc:
        raise DomainError(ErrorCode.WAITLIST_TOKEN_EXPIRED) from exc
    except signing.BadSignature as exc:
        raise DomainError(ErrorCode.WAITLIST_TOKEN_INVALID) from exc
    entry = WaitlistEntry.objects.filter(pk=payload.get("w"), email_sha256=payload.get("h")).first()
    if entry is None:
        raise DomainError(ErrorCode.WAITLIST_TOKEN_INVALID)
    return entry


def confirm(request: HttpRequest, token: str) -> WaitlistEntry:
    ttl = int(get_config("waitlist.confirmation_ttl_days")) * 86400
    entry = _load(token, CONFIRM_SALT, ttl)
    if entry.status == Status.WITHDRAWN:
        raise DomainError(ErrorCode.WAITLIST_TOKEN_INVALID)
    if entry.status == Status.PENDING:
        with transaction.atomic():
            entry.status = Status.CONFIRMED
            entry.confirmed_at = clock.now()
            entry.save(update_fields=["status", "confirmed_at"])
            audit.record(audit.actor_from_request(request), "waitlist.confirmed", target=entry)
            email, language = entry.email or "", entry.language
            unsubscribe = _link("unsubscribe", language, unsubscribe_token(entry))
            name = entry.name
            transaction.on_commit(
                lambda: send_templated_email(
                    "waitlist_welcome",
                    email,
                    language,
                    {"name": name, "unsubscribe_link": unsubscribe},
                )
            )
    return entry


def unsubscribe(request: HttpRequest, token: str) -> WaitlistEntry:
    """Withdraw consent and erase personal data (GDPR, §12.2). Idempotent."""
    entry = _load(token, UNSUBSCRIBE_SALT, None)
    if entry.status != Status.WITHDRAWN:
        with transaction.atomic():
            entry.status = Status.WITHDRAWN
            entry.withdrawn_at = clock.now()
            entry.email = None
            entry.name = ""
            entry.phone = ""
            entry.interests = []
            entry.source = ""
            entry.consent_ip = None
            entry.consent_user_agent = ""
            entry.save()
            audit.record(audit.actor_from_request(request), "waitlist.withdrawn", target=entry)
    return entry


def purge_unconfirmed(actor: audit.Actor) -> int:
    """Delete sign-ups never confirmed within the confirmation window (data minimisation)."""
    ttl = int(get_config("waitlist.confirmation_ttl_days"))
    cutoff = clock.now() - timedelta(days=ttl)
    stale = WaitlistEntry.objects.filter(status=Status.PENDING, created_at__lt=cutoff)
    count = stale.count()
    if count:
        with transaction.atomic():
            stale.delete()
            audit.record(
                actor,
                "waitlist.purged_unconfirmed",
                target_type="waitlist.waitlistentry",
                after={"deleted": count, "older_than_days": ttl},
            )
    return count


# ---------------------------------------------------------------- staff
def staff_entries(request: HttpRequest, status: str) -> QuerySet[WaitlistEntry]:
    authorize(request, Action.WAITLIST_VIEW)
    qs = WaitlistEntry.objects.all()
    return qs.filter(status=status) if status else qs


def stats(request: HttpRequest) -> dict[str, object]:
    authorize(request, Action.WAITLIST_VIEW)
    confirmed = WaitlistEntry.objects.filter(status=Status.CONFIRMED)
    by_interest = dict.fromkeys(Interest.values, 0)
    for interests in confirmed.values_list("interests", flat=True):
        for interest in interests:
            by_interest[interest] = by_interest.get(interest, 0) + 1
    return {
        "by_status": {s: WaitlistEntry.objects.filter(status=s).count() for s in Status.values},
        "confirmed_by_interest": by_interest,
    }


def csv_safe(value: str) -> str:
    """Stop spreadsheet formula injection: cells starting with = + - @ are read as text."""
    return f"'{value}" if value[:1] in ("=", "+", "-", "@", "\t", "\r") else value


CSV_COLUMNS = ("email", "name", "phone", "interests", "language", "source", "confirmed_at")


def export_csv(request: HttpRequest) -> str:
    """Confirmed entries only. Every export of personal data is audited."""
    authorize(request, Action.WAITLIST_EXPORT)
    rows = WaitlistEntry.objects.filter(status=Status.CONFIRMED).order_by("confirmed_at")
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(CSV_COLUMNS)
    count = 0
    for e in rows:
        values = [
            e.email or "",
            e.name,
            e.phone,
            " ".join(e.interests),
            e.language,
            e.source,
            e.confirmed_at.isoformat() if e.confirmed_at else "",
        ]
        writer.writerow([csv_safe(v) for v in values])
        count += 1
    audit.record(
        audit.actor_from_request(request),
        "waitlist.exported",
        target_type="waitlist.waitlistentry",
        after={"rows": count},
    )
    return buffer.getvalue()
