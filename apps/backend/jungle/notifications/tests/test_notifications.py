"""§11, Stage 12: the outbox (once per event), email and push, the client's choices (Q17, Q18), the
panel's texts and the delivery with retries. The club clock: Monday 15.03.2027, 09:00 (`club`)."""

from __future__ import annotations

from collections.abc import Callable
from datetime import timedelta
from io import StringIO
from typing import Any

import pytest
from django.core import mail
from django.core.management import call_command
from django.test import Client, override_settings

from jungle.accounts.models import AccountType, User
from jungle.audit.models import AuditLog
from jungle.conftest import Api, error_code, login_as
from jungle.core import clock
from jungle.core.permissions import Role
from jungle.notifications import catalog, services, webpush
from jungle.notifications.catalog import Category
from jungle.notifications.models import Notification, Preference, PushSubscription, Status, Template

pytestmark = pytest.mark.django_db

ENDPOINT = "https://push.example.test/send/abc"


@pytest.fixture
def keys() -> Any:
    public, private = webpush.generate_keys()
    with override_settings(
        VAPID_PUBLIC_KEY=public, VAPID_PRIVATE_KEY=private, VAPID_SUBJECT="mailto:c@example.test"
    ):
        yield public


@pytest.fixture
def pushed(monkeypatch: pytest.MonkeyPatch) -> list[tuple[str, dict[str, str]]]:
    """What reached the push service (`webpush.send`), by endpoint."""
    sent: list[tuple[str, dict[str, str]]] = []

    def fake(
        subscription: webpush.Subscription, message: dict[str, str], client: Any = None
    ) -> None:
        if subscription.endpoint.endswith("/gone"):
            raise webpush.PushGone(subscription.endpoint)
        if subscription.endpoint.endswith("/down"):
            raise ConnectionError("push service down")
        sent.append((subscription.endpoint, message))

    monkeypatch.setattr(webpush, "send", fake)
    return sent


@pytest.fixture
def ana(club: Any, make_user: Callable[..., User]) -> User:
    return make_user(email="ana@example.test", first_name="Ana")


def subscribe(user: User, endpoint: str = ENDPOINT) -> PushSubscription:
    return PushSubscription.objects.create(
        user=user, endpoint=endpoint, p256dh="BAAA", auth="AAAA", created_at=clock.now()
    )


BOOKING = {"resource": "Teren 1", "when": "mar., 16 martie, 18:00", "url": "/ro/cont"}


def test_s11_a_booking_confirmed_by_email_once_and_push_needs_a_browser(
    ana: User, django_capture_on_commit_callbacks: Any
) -> None:
    with django_capture_on_commit_callbacks(execute=True):
        written = services.notify(ana, "booking.confirmed", BOOKING, subject="b1")
    assert [n.channel for n in written] == ["email"]  # push: off and no browser
    [message] = mail.outbox
    assert message.to == ["ana@example.test"]
    assert message.subject == "Rezervarea e confirmată"
    assert "Bună, Ana!" in message.body and "Teren 1, mar., 16 martie, 18:00" in message.body
    assert (
        "https://www.example.test/ro/cont" in message.body and "Echipa Jungle Padel" in message.body
    )
    assert Notification.objects.get().status == Status.SENT
    # The same event for the same booking: never a second message.
    with django_capture_on_commit_callbacks(execute=True):
        assert services.notify(ana, "booking.confirmed", BOOKING, subject="b1") == []
    assert len(mail.outbox) == 1


def test_q17_push_to_every_browser_and_a_dead_one_removed(
    ana: User, keys: Any, pushed: list[Any], django_capture_on_commit_callbacks: Any
) -> None:
    subscribe(ana)
    subscribe(ana, "https://push.example.test/send/gone")
    with django_capture_on_commit_callbacks(execute=True):
        written = services.notify(ana, "booking.confirmed", BOOKING, subject="b1")
    assert sorted(n.channel for n in written) == ["email", "push"]
    [(endpoint, message)] = pushed
    assert endpoint == ENDPOINT
    assert message == {
        "title": "Rezervarea e confirmată",
        "body": "Teren 1, mar., 16 martie, 18:00: rezervarea e confirmată.",
        "url": "https://www.example.test/ro/cont",
    }
    assert list(PushSubscription.objects.values_list("endpoint", flat=True)) == [ENDPOINT]
    # Only push for the 2-hour reminder; in English for an English speaker.
    ana.preferred_language = "en"
    ana.save()
    with django_capture_on_commit_callbacks(execute=True):
        [reminder] = services.notify(ana, "booking.reminder_2h", BOOKING, subject="b1")
    assert reminder.channel == "push" and pushed[-1][1]["title"] == "In two hours"
    # Every browser unsubscribed in the meantime: skipped, not retried.
    PushSubscription.objects.all().delete()
    subscribe(ana, "https://push.example.test/send/gone")
    with django_capture_on_commit_callbacks(execute=True):
        [late] = services.notify(ana, "booking.reminder_2h", BOOKING, subject="b2")
    late.refresh_from_db()
    assert late.status == Status.SKIPPED and "unsubscribed" in late.last_error


def test_s11_the_client_turns_off_what_may_be_turned_off(
    api: Api, client: Client, ana: User, keys: Any, django_capture_on_commit_callbacks: Any
) -> None:
    login_as(client, ana)
    choices = api.get("/notifications/preferences").json()["choices"]
    assert "account" not in choices and "staff" not in choices  # never optional
    assert choices["reminders"] == {"email": True, "push": True}
    assert choices["league"] == {"email": True, "push": True}
    # The club's news is marketing: off until the client turns it on (opt-in).
    assert choices["club"] == {"email": False, "push": False}
    assert services.notify(ana, "club.new_event", {"title": "x"}, subject="e1") == []
    assert list(services.opted_in(Category.CLUB)) == []
    turned_on = api.put("/notifications/preferences", {"choices": {"club": {"email": True}}})
    assert turned_on.json()["choices"]["club"] == {"email": True, "push": False}
    assert list(services.opted_in(Category.CLUB)) == [ana]
    response = api.put("/notifications/preferences", {"choices": {"reminders": {"email": False}}})
    assert response.status_code == 200 and response.json()["choices"]["reminders"]["email"] is False
    refused = api.put("/notifications/preferences", {"choices": {"bookings": {"email": False}}})
    assert refused.status_code == 422 and error_code(refused) == "notifications.not_optional"
    unknown = api.put("/notifications/preferences", {"choices": {"reminders": {"sms": False}}})
    assert unknown.status_code == 422
    with django_capture_on_commit_callbacks(execute=True):
        assert services.notify(ana, "booking.reminder_24h", BOOKING, subject="b1") == []
        # A booking's confirmation still arrives: it cannot be turned off.
        assert len(services.notify(ana, "booking.confirmed", BOOKING, subject="b1")) == 1
    assert Preference.objects.get(user=ana, category="reminders").enabled is False


def test_s11_reminders_wait_for_their_time_and_failures_are_retried(
    ana: User, time_machine: Any, monkeypatch: pytest.MonkeyPatch
) -> None:
    later = clock.now() + timedelta(hours=10)
    [reminder] = services.notify(
        ana, "booking.reminder_24h", BOOKING, subject="b1", send_after=later
    )
    assert services.send_due().sent == 0 and mail.outbox == []
    time_machine.move_to(later + timedelta(minutes=1), tick=False)
    calls = {"n": 0}

    def flaky(*args: Any, **kwargs: Any) -> None:
        calls["n"] += 1
        raise OSError("SMTP down")

    monkeypatch.setattr(services, "send_mail", flaky)
    for attempt in range(1, services.MAX_ATTEMPTS + 1):
        outcome = services.send_due()
        assert outcome.failed == 1
        reminder.refresh_from_db()
        assert reminder.attempts == attempt
    assert reminder.status == Status.FAILED and reminder.last_error == "SMTP down"
    assert services.send_due() == services.Outcome()  # given up: no more tries
    out = StringIO()
    call_command("send_notifications", stdout=out)
    assert "Trimise: 0" in out.getvalue()


def test_s11_push_off_or_no_browser_is_skipped_not_retried(ana: User) -> None:
    notification = Notification.objects.create(
        user=ana, event="booking.reminder_2h", channel="push", key="k", context={},
        send_after=clock.now(), created_at=clock.now(),
    )  # fmt: skip
    assert (
        services.send(notification) == Status.SKIPPED and notification.last_error == "push is off"
    )
    with override_settings(VAPID_PUBLIC_KEY="p", VAPID_PRIVATE_KEY="k", VAPID_SUBJECT="mailto:x"):
        notification.status = Status.QUEUED
        assert services.send(notification) == Status.SKIPPED
        assert notification.last_error == "no browser subscribed"


def test_s11_old_texts_are_dropped_after_90_days(ana: User, time_machine: Any) -> None:
    services.notify(ana, "booking.confirmed", BOOKING, subject="b1")
    services.send_due()
    time_machine.move_to(clock.now() + timedelta(days=91), tick=False)
    services.send_due()
    kept = Notification.objects.get()
    assert kept.context == {} and kept.status == Status.SENT  # only the fact remains


def test_s11_no_email_address_no_email(club: Any, make_user: Callable[..., User]) -> None:
    child = User.objects.create_user(
        None, None, first_name="Mic", last_name="Test", account_type=AccountType.CHILD
    )
    assert services.notify(child, "booking.confirmed", BOOKING, subject="b1") == []
    with pytest.raises(ValueError, match="unknown notification"):
        services.notify(child, "nu.exista", {})


def test_s11_staff_alerts_reach_the_managers_and_admins(
    club: Any, staff: Callable[..., User], make_user: Callable[..., User],
    django_capture_on_commit_callbacks: Any,
) -> None:  # fmt: skip
    from jungle.locations.models import Location

    manager = staff(Role.MANAGER, club.location)
    admin = staff(Role.ADMIN)
    staff(Role.RECEPTION, club.location)
    elsewhere = staff(Role.MANAGER, Location.objects.create(slug="alt", name="Alt club"))
    with django_capture_on_commit_callbacks(execute=True):
        services.notify_staff(
            club.location.id, "staff.cash_low", {"device": "Chioșc 1", "detail": "5 lei"}, "c1"
        )
    assert sorted(m.to[0] for m in mail.outbox) == sorted([str(manager.email), str(admin.email)])
    assert elsewhere.email not in [m.to[0] for m in mail.outbox]
    assert mail.outbox[0].subject == "Rest scăzut: Chioșc 1"


def test_q17_push_subscription_from_the_account(
    api: Api, client: Client, ana: User, keys: str
) -> None:
    assert api.get("/notifications/push-key").json() == {"enabled": True, "public_key": keys}
    login_as(client, ana)
    body = {
        "endpoint": ENDPOINT,
        "p256dh": webpush.generate_keys()[0],
        "auth": "MDEyMzQ1Njc4OWFiY2RlZg",
    }
    assert api.post("/notifications/push-subscriptions", body).status_code == 200
    # The same browser, signed in to another account: it moves with the browser.
    other = User.objects.create_user("bo@example.test", "x", first_name="Bo", last_name="Test")
    login_as(client, other)
    assert api.post("/notifications/push-subscriptions", body).status_code == 200
    assert PushSubscription.objects.get().user == other
    for bad in (
        {**body, "endpoint": "http://plain.example.test"},
        {**body, "auth": "%%%"},
        {**body, "p256dh": "BAAA"},
    ):
        assert api.post("/notifications/push-subscriptions", bad).status_code == 422
    assert (
        api.post("/notifications/push-subscriptions/remove", {"endpoint": ENDPOINT}).status_code
        == 200
    )
    assert not PushSubscription.objects.exists()


def test_q17_without_the_keys_push_cannot_be_turned_on(api: Api, client: Client, ana: User) -> None:
    assert api.get("/notifications/push-key").json() == {"enabled": False, "public_key": ""}
    login_as(client, ana)
    body = {"endpoint": ENDPOINT, "p256dh": "BAAA", "auth": "AAAA"}
    response = api.post("/notifications/push-subscriptions", body)
    assert response.status_code == 503 and error_code(response) == "notifications.push_unavailable"


def test_s11_the_clients_latest_messages(
    api: Api, client: Client, ana: User, django_capture_on_commit_callbacks: Any
) -> None:
    with django_capture_on_commit_callbacks(execute=True):
        services.notify(ana, "booking.confirmed", BOOKING, subject="b1")
    login_as(client, ana)
    [item] = api.get("/notifications/mine").json()
    assert (item["event"], item["channel"]) == ("booking.confirmed", "email")


def test_s11_the_panel_edits_a_text_and_can_go_back_to_the_default(
    api: Api, club: Any, staff: Callable[..., User], ana: User,
    django_capture_on_commit_callbacks: Any,
) -> None:  # fmt: skip
    staff(Role.MANAGER, club.location)
    where = f"?location_id={club.location.id}"
    listed = api.get(f"/staff/notifications/templates{where}").json()
    expected = sum(len(e.channels) for e in catalog.EVENTS.values()) * 2
    assert len(listed) == expected and not any(t["edited"] for t in listed)
    text = {
        "location_id": str(club.location.id),
        "event": "booking.confirmed",
        "channel": "email",
        "language": "ro",
    }
    saved = api.put(
        "/staff/notifications/templates",
        {**text, "subject": " Te așteptăm! ", "body": "Salut {{ first_name }}, {{ resource }}."},
    )
    assert saved.status_code == 200
    with django_capture_on_commit_callbacks(execute=True):
        services.notify(ana, "booking.confirmed", BOOKING, subject="b1")
    assert (mail.outbox[0].subject, mail.outbox[0].body) == ("Te așteptăm!", "Salut Ana, Teren 1.")
    edited = [t for t in api.get(f"/staff/notifications/templates{where}").json() if t["edited"]]
    assert [t["subject"] for t in edited] == ["Te așteptăm!"]
    log = AuditLog.objects.get(action="notifications.template_saved")
    assert log.before is None and log.after == {
        "subject": "Te așteptăm!",
        "body": "Salut {{ first_name }}, {{ resource }}.",
    }
    for bad, status, code in [
        ({**text, "body": "{% if %}", "subject": "x"}, 422, "notifications.template_invalid"),
        ({**text, "body": " ", "subject": "x"}, 422, "validation.invalid"),
        ({**text, "event": "nu.exista", "subject": "x", "body": "y"}, 404, "notifications.unknown"),
        (
            {
                **text,
                "channel": "push",
                "event": "account.email_confirm",
                "subject": "x",
                "body": "y",
            },
            404,
            "notifications.unknown",
        ),
        ({**text, "language": "de", "subject": "x", "body": "y"}, 404, "notifications.unknown"),
    ]:
        response = api.put("/staff/notifications/templates", bad)
        assert (response.status_code, error_code(response)) == (status, code), bad
    assert api.post("/staff/notifications/templates/reset", text).status_code == 200
    assert not Template.objects.exists()
    assert AuditLog.objects.filter(action="notifications.template_reset").count() == 1
    [row] = api.get(f"/staff/notifications/outbox{where}").json()
    assert row["user_name"] == "Ana " + ana.last_name and row["status"] == "sent"


def test_s11_only_staff_with_notifications_manage(
    api: Api, club: Any, staff: Callable[..., User]
) -> None:
    staff(Role.RECEPTION, club.location)
    where = f"?location_id={club.location.id}"
    assert api.get(f"/staff/notifications/templates{where}").status_code == 403
    assert api.get(f"/staff/notifications/outbox{where}").status_code == 403


def test_q17_the_vapid_keys_command() -> None:
    out = StringIO()
    call_command("vapid_keys", stdout=out)
    assert "VAPID_PUBLIC_KEY=" in out.getvalue() and "VAPID_PRIVATE_KEY=" in out.getvalue()


def test_s11_every_event_has_texts_in_both_languages() -> None:
    from jungle.notifications.defaults import DEFAULTS

    assert set(DEFAULTS) == set(catalog.EVENTS)
    for key, spec in catalog.EVENTS.items():
        for language in ("ro", "en"):
            texts = DEFAULTS[key][language]
            assert texts.subject, key
            if catalog.Channel.EMAIL in spec.channels:
                assert texts.email, key
            if catalog.Channel.PUSH in spec.channels:
                assert texts.push, key
    assert catalog.Category.STAFF not in catalog.OPTIONAL_CATEGORIES


def test_s11_the_older_email_helper_keeps_working() -> None:
    from jungle.notifications.email import send_templated_email

    send_templated_email("card_issued", "x@example.test", "de", {"first_name": "X", "number": "1"})
    assert mail.outbox[0].to == ["x@example.test"]
    with pytest.raises(ValueError, match="unknown email template"):
        send_templated_email("nu_exista", "x@example.test", "ro", {})


def test_s11_names_in_the_emergency_admin(ana: User) -> None:
    [notification] = services.notify(ana, "booking.confirmed", BOOKING, subject="b1")
    assert str(notification).startswith("booking.confirmed")
    template = Template.objects.create(
        event="booking.confirmed", channel="email", language="ro", subject="s", body="b",
        updated_at=clock.now(),
    )  # fmt: skip
    assert str(template) == "booking.confirmed (email, ro)"
    choice = Preference.objects.create(user=ana, category="league", channel="push", enabled=False)
    assert str(choice).endswith("league/push: False")
    assert str(subscribe(ana)).endswith("push")
