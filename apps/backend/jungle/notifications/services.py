"""Notifications (§11, Stage 12): what the other modules call, and the delivery.

- `notify(user, event, context, subject=...)` writes one message per channel to the outbox (once per
  event, thing and person: the same reminder is never sent twice), unless the client turned that
  category off (only where §11 allows it) or the channel is not available (no email address, no
  browser subscribed to push, SMS off). The messages are sent right after the change is saved; a
  scheduled one (`send_after`, the reminders) waits for `send_due`.
- `notify_staff(location, event, ...)` writes to the managers and admins of the location.
- `send_due(now)` (`manage.py send_notifications`, every minute) sends what is due and retries what
  failed (at most `MAX_ATTEMPTS`), and drops the texts older than `KEEP_DAYS` (data minimisation).
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Any

from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.db.models import Q, QuerySet
from django.http import HttpRequest
from django.template import Context
from django.template import Template as DjangoTemplate

from jungle.accounts.models import User, UserRole
from jungle.accounts.services.authz import authorize, current_user
from jungle.audit import services as audit
from jungle.core import clock
from jungle.core.errors import DomainError, ErrorCode
from jungle.core.permissions import Action, Role
from jungle.notifications import webpush
from jungle.notifications.catalog import (
    EVENTS,
    OPT_IN_CATEGORIES,
    OPTIONAL_CATEGORIES,
    Category,
    Channel,
    event,
)
from jungle.notifications.defaults import DEFAULTS, SIGNATURE, Texts
from jungle.notifications.models import (
    Notification,
    Preference,
    PushSubscription,
    Status,
    Template,
)

logger = logging.getLogger(__name__)
MAX_ATTEMPTS = 5
KEEP_DAYS = 90
LANGUAGES = ("ro", "en")
STAFF_ROLES = (Role.ADMIN, Role.MANAGER)


# The account's pages a message links to (apps/web, §9.3), by language.
ACCOUNT_PAGES: dict[str, dict[str, str]] = {
    "": {"ro": "/ro/cont", "en": "/en/account"},
    "card": {"ro": "/ro/cont/card", "en": "/en/account/card"},
    "payments": {"ro": "/ro/cont/plati", "en": "/en/account/payments"},
    "league": {"ro": "/ro/cont/liga", "en": "/en/account/league"},
    "events": {"ro": "/ro/cont/evenimente", "en": "/en/account/events"},
    "calendar": {"ro": "/ro/evenimente", "en": "/en/events"},  # the public calendar
}


def account_path(language: str, page: str = "") -> str:
    """The path of an account page in the person's language (the message's `url`)."""
    return ACCOUNT_PAGES[page]["en" if language == "en" else "ro"]


def lei(bani: int) -> str:
    """An amount as a person reads it: "120 lei", "12,50 lei" (money is kept in bani)."""
    whole, cents = divmod(bani, 100)
    return f"{whole} lei" if not cents else f"{whole},{cents:02d} lei"


def day(value: date) -> str:
    return value.strftime("%d.%m.%Y")


# ---------------------------------------------------------------- writing to the outbox
def _channel_available(user: User, channel: Channel) -> bool:
    if channel == Channel.PUSH:
        return webpush.enabled() and PushSubscription.objects.filter(user=user).exists()
    # SMS (Q17) is prepared and off until the club chooses a provider: only email is left.
    return channel == Channel.EMAIL and bool(user.email) and user.is_active


def wants(user: User, key: str, channel: Channel) -> bool:
    spec = event(key)
    if spec.mandatory:
        return True
    choice = Preference.objects.filter(user=user, category=spec.category, channel=channel).first()
    return choice.enabled if choice is not None else spec.category not in OPT_IN_CATEGORIES


def opted_in(category: Category) -> QuerySet[User]:
    """The active people who turned on an opt-in category (on at least one channel)."""
    chosen = Preference.objects.filter(category=category, enabled=True).values("user_id")
    return User.objects.filter(pk__in=chosen, is_active=True, deleted_at__isnull=True)


def notify(
    user: User,
    key: str,
    context: dict[str, Any],
    subject: str = "",
    send_after: datetime | None = None,
) -> list[Notification]:
    """`subject` names the thing (a booking's id…) so the same message is written only once."""
    spec = event(key)
    now = clock.now()
    written: list[Notification] = []
    for channel in spec.channels:
        if not _channel_available(user, channel) or not wants(user, key, channel):
            continue
        language = user.preferred_language if user.preferred_language in LANGUAGES else "ro"
        notification, created = Notification.objects.get_or_create(
            key=f"{key}:{subject}:{user.pk}:{channel}",
            defaults={
                "user": user,
                "event": key,
                "channel": channel,
                "language": language,
                "context": {"first_name": user.first_name, **context},
                "send_after": send_after or now,
                "created_at": now,
            },
        )
        if created:
            written.append(notification)
    due = [n.pk for n in written if n.send_after <= now]
    if due:
        transaction.on_commit(lambda: _send_ids(due))
    return written


def withdraw(events: tuple[str, ...], subject: str) -> int:
    """Messages not sent yet that are no longer true (a cancelled booking's reminders): those whose
    subject begins with `subject` (a booking's id, whatever time it was for)."""
    queued = Notification.objects.filter(status=Status.QUEUED, event__in=events).filter(
        key__contains=f":{subject}"
    )
    return queued.update(status=Status.SKIPPED, last_error="withdrawn")


def notify_staff(location_id: Any, key: str, context: dict[str, Any], subject: str = "") -> None:
    """To the managers and admins of the location (and the admins of every location)."""
    roles = UserRole.objects.filter(role__in=STAFF_ROLES).filter(
        Q(location_id=location_id) | Q(location__isnull=True)
    )
    for user in User.objects.filter(pk__in=roles.values("user_id"), is_active=True):
        notify(user, key, context, subject=subject)


# ---------------------------------------------------------------- the texts
def texts_for(key: str, channel: str, language: str) -> Texts:
    """The panel's text if there is one, else the default (the email gets the club's signature)."""
    edited = Template.objects.filter(event=key, channel=channel, language=language).first()
    default = DEFAULTS[key][language]
    if edited is not None:
        return Texts(edited.subject, edited.body, edited.body)
    return Texts(default.subject, default.email + SIGNATURE[language], default.push)


def render(text: str, context: dict[str, Any]) -> str:
    """Django's template language on plain text: `{{ field }}` only, nothing escaped or executed."""
    return DjangoTemplate(text).render(Context(context, autoescape=False)).strip()


def _url(path: str) -> str:
    return f"{settings.WEB_BASE_URL.rstrip('/')}{path}" if path.startswith("/") else path


# ---------------------------------------------------------------- delivery
@dataclass(frozen=True)
class Outcome:
    sent: int = 0
    failed: int = 0
    skipped: int = 0


def _deliver(notification: Notification) -> None:
    context = {**notification.context, "url": _url(str(notification.context.get("url", "")))}
    texts = texts_for(notification.event, notification.channel, notification.language)
    subject = render(texts.subject, context)
    if notification.channel == Channel.EMAIL:
        send_mail(
            subject,
            render(texts.email, context),
            settings.DEFAULT_FROM_EMAIL,
            [notification.user.email or ""],
        )
        return
    message = {"title": subject, "body": render(texts.push, context), "url": context["url"]}
    subscriptions = list(PushSubscription.objects.filter(user=notification.user))
    if not subscriptions:
        raise LookupError("no browser subscribed")
    delivered = 0
    for sub in subscriptions:
        try:
            webpush.send(webpush.Subscription(sub.endpoint, sub.p256dh, sub.auth), message)
            delivered += 1
        except webpush.PushGone:
            sub.delete()  # the browser unsubscribed
    if not delivered:
        raise LookupError("every browser unsubscribed")


def send(notification: Notification) -> Status:
    """One message: sent, failed (tried again later) or skipped for good."""
    notification.attempts += 1
    try:
        if notification.channel == Channel.PUSH and not webpush.enabled():
            raise LookupError("push is off")
        _deliver(notification)
    except LookupError as exc:
        notification.status = Status.SKIPPED
        notification.last_error = str(exc)[:300]
    except Exception as exc:
        logger.warning("notification %s not sent: %s", notification.pk, exc)
        notification.status = (
            Status.FAILED if notification.attempts >= MAX_ATTEMPTS else Status.QUEUED
        )
        notification.last_error = str(exc)[:300]
    else:
        notification.status = Status.SENT
        notification.sent_at = clock.now()
        notification.last_error = ""
    notification.save(update_fields=["attempts", "status", "last_error", "sent_at"])
    return Status(notification.status)


def _send_ids(ids: list[Any]) -> None:
    for notification in Notification.objects.filter(
        pk__in=ids, status=Status.QUEUED
    ).select_related("user"):
        send(notification)


def send_due(now: datetime | None = None) -> Outcome:
    now = now or clock.now()
    counts = {Status.SENT: 0, Status.FAILED: 0, Status.SKIPPED: 0, Status.QUEUED: 0}
    due = Notification.objects.filter(status=Status.QUEUED, send_after__lte=now).select_related(
        "user"
    )
    for notification in due.order_by("send_after")[:500]:
        counts[send(notification)] += 1
    # The texts are kept 90 days, then only the fact that a message was sent (minimisation).
    Notification.objects.filter(created_at__lt=now - timedelta(days=KEEP_DAYS)).exclude(
        context={}
    ).update(context={})
    return Outcome(
        sent=counts[Status.SENT],
        failed=counts[Status.FAILED] + counts[Status.QUEUED],
        skipped=counts[Status.SKIPPED],
    )


# ---------------------------------------------------------------- the client's choices
def preferences(request: HttpRequest) -> dict[str, dict[str, bool]]:
    """{category: {channel: on}} for the categories a client may turn off."""
    user = current_user(request)
    chosen = {(p.category, p.channel): p.enabled for p in Preference.objects.filter(user=user)}
    return {
        category: {
            channel: chosen.get((category, channel), category not in OPT_IN_CATEGORIES)
            for channel in (Channel.EMAIL, Channel.PUSH)
            if any(e.category == category and channel in e.channels for e in EVENTS.values())
        }
        for category in OPTIONAL_CATEGORIES
    }


def set_preferences(
    request: HttpRequest, choices: dict[str, dict[str, bool]]
) -> dict[str, dict[str, bool]]:
    user = current_user(request)
    allowed = preferences(request)
    for category, channels in choices.items():
        for channel, enabled in channels.items():
            if category not in allowed or channel not in allowed[category]:
                raise DomainError(
                    ErrorCode.NOTIFICATIONS_NOT_OPTIONAL, status=422, params={"category": category}
                )
            Preference.objects.update_or_create(
                user=user, category=category, channel=channel, defaults={"enabled": enabled}
            )
    return preferences(request)


def _key_of(text: str, size: int) -> bool:
    return bool(re.fullmatch(r"[A-Za-z0-9_-]+", text)) and len(webpush.unb64url(text)) == size


def subscribe(request: HttpRequest, endpoint: str, p256dh: str, auth: str) -> PushSubscription:
    """A browser accepts push; the same browser moving to another account moves with it."""
    if not webpush.enabled():
        raise DomainError(ErrorCode.NOTIFICATIONS_PUSH_UNAVAILABLE, status=503)
    if not endpoint.startswith("https://"):
        raise DomainError(ErrorCode.VALIDATION_INVALID, status=422, params={"field": "endpoint"})
    # The browser's keys (RFC 8291): a P-256 point of 65 bytes and a 16-byte secret, base64url.
    if not (_key_of(p256dh, 65) and _key_of(auth, 16)):
        raise DomainError(ErrorCode.VALIDATION_INVALID, status=422, params={"field": "keys"})
    subscription, _ = PushSubscription.objects.update_or_create(
        endpoint=endpoint,
        defaults={
            "user": current_user(request),
            "p256dh": p256dh,
            "auth": auth,
            "created_at": clock.now(),
        },
    )
    return subscription


def unsubscribe(request: HttpRequest, endpoint: str) -> None:
    PushSubscription.objects.filter(user=current_user(request), endpoint=endpoint).delete()


def recent(request: HttpRequest, limit: int = 50) -> QuerySet[Notification]:
    """The client's latest messages (the account's list), push and email."""
    return Notification.objects.filter(user=current_user(request), status=Status.SENT).order_by(
        "-sent_at"
    )[:limit]


# ---------------------------------------------------------------- the panel
@dataclass(frozen=True)
class TemplateView:
    event: str
    category: str
    channel: str
    language: str
    subject: str
    body: str
    edited: bool


def staff_templates(request: HttpRequest, location_id: Any) -> list[TemplateView]:
    """The texts are the club's; staff open them from the panel of a location they manage."""
    authorize(request, Action.NOTIFICATIONS_MANAGE, location_id)
    changed = set(Template.objects.values_list("event", "channel", "language"))
    views: list[TemplateView] = []
    for key, spec in EVENTS.items():
        for channel in spec.channels:
            for language in LANGUAGES:
                texts = texts_for(key, channel, language)
                edited = (key, channel, language) in changed
                body = texts.email if channel == Channel.EMAIL else texts.push
                views.append(
                    TemplateView(key, spec.category, channel, language, texts.subject, body, edited)
                )
    return views


def save_template(
    request: HttpRequest,
    location_id: Any,
    key: str,
    channel: str,
    language: str,
    subject: str,
    body: str,
) -> Template:
    """A text replacing the default; checked by rendering it before it is saved."""
    staff = authorize(request, Action.NOTIFICATIONS_MANAGE, location_id)
    spec = event(key) if key in EVENTS else None
    if spec is None or channel not in spec.channels or language not in LANGUAGES:
        raise DomainError(ErrorCode.NOTIFICATIONS_UNKNOWN, status=404)
    subject, body = subject.strip(), body.strip()
    if not subject or not body:
        raise DomainError(ErrorCode.VALIDATION_INVALID, status=422, params={"field": "body"})
    try:
        render(subject + "\n" + body, {})
    except Exception as exc:
        raise DomainError(ErrorCode.NOTIFICATIONS_TEMPLATE_INVALID, status=422) from exc
    before = Template.objects.filter(event=key, channel=channel, language=language).first()
    template, _ = Template.objects.update_or_create(
        event=key,
        channel=channel,
        language=language,
        defaults={"subject": subject, "body": body, "updated_at": clock.now(), "updated_by": staff},
    )
    audit.record(
        audit.actor_from_request(request),
        "notifications.template_saved",
        target=template,
        before={"subject": before.subject, "body": before.body} if before else None,
        after={"subject": subject, "body": body},
    )
    return template


def reset_template(
    request: HttpRequest, location_id: Any, key: str, channel: str, language: str
) -> None:
    authorize(request, Action.NOTIFICATIONS_MANAGE, location_id)
    deleted = Template.objects.filter(event=key, channel=channel, language=language)
    for template in deleted:
        audit.record(
            audit.actor_from_request(request), "notifications.template_reset", target=template
        )
    deleted.delete()


def staff_outbox(
    request: HttpRequest, location_id: Any, limit: int = 200
) -> QuerySet[Notification]:
    """The latest messages and their state (no text: who, what, when, how)."""
    authorize(request, Action.NOTIFICATIONS_MANAGE, location_id)
    return Notification.objects.select_related("user").order_by("-created_at")[:limit]
