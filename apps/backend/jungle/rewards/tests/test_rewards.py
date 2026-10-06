"""Vouchers (R-121), "Bring a friend" (R-120, Q32)."""

from __future__ import annotations

from datetime import timedelta
from typing import Any

import pytest
from django.test import Client

from jungle.accounts.models import User
from jungle.conftest import Api, error_code, login_as
from jungle.core import clock
from jungle.core.permissions import Role
from jungle.ledger import services as ledger
from jungle.ledger.models import AccountKind, LedgerEntry
from jungle.rewards import services
from jungle.rewards.models import Referral, Voucher, VoucherKind, VoucherStatus
from jungle.subscriptions.models import SubscriptionRate

pytestmark = pytest.mark.django_db

TUE_10 = "2027-03-16T10:00:00+02:00"  # semi-peak: 2 × 50 RON
TUE_18 = "2027-03-16T18:00:00+02:00"  # peak: 2 × 60 RON


def voucher_for(
    user: Any,
    kind: str = VoucherKind.HOUR,
    value: int = 60,
    target: str = "booking",
    days: int = 90,
    bands: tuple[str, ...] = ("off_peak", "semi_peak"),
) -> Voucher:
    from jungle.audit.services import SYSTEM

    data = services.VoucherData(kind, value, target, days, "test", bands)
    return services.issue_voucher(SYSTEM, user, data, "manual")


def book(
    api: Api,
    club: Any,
    when: str,
    minutes: int = 60,
    session_type: str = "training",
    resource: Any = None,
) -> Any:
    body = {
        "resource_id": str((resource or club.court1).id),
        "starts_at": when,
        "duration_minutes": minutes,
        "session_type": session_type,
    }
    if session_type == "lesson":
        body["coach_id"] = str(club.coach.id)
    response = api.post("/bookings", body)
    assert response.status_code == 201, response.json()
    return response.json()


@pytest.fixture
def player(make_user: Any, client: Client) -> Any:
    user = make_user()
    login_as(client, user, mfa=False)
    return user


# ---------------------------------------------------------------- using vouchers
def test_r120_free_padel_hour_in_allowed_bands(api: Api, club: Any, player: Any) -> None:
    voucher = voucher_for(player)
    booking = book(api, club, TUE_10, 90)  # 30 € more than the hour: 3 × 50 RON
    response = api.post(
        f"/account/vouchers/{voucher.code.lower()}/redeem", {"booking_id": booking["id"]}
    )
    assert response.status_code == 201, response.json()
    assert (
        response.json()["method"] == "voucher" and response.json()["amount"] == 10000
    )  # the first hour
    status = api.get(f"/account/payment-status?booking_id={booking['id']}").json()
    assert status["to_pay"] == 5000
    discount = LedgerEntry.objects.get(account__kind=AccountKind.DISCOUNTS)
    assert discount.amount == 10000  # R-121: the discount is in the ledger
    again = api.post(f"/account/vouchers/{voucher.code}/redeem", {"booking_id": booking["id"]})
    assert again.status_code == 409 and error_code(again) == "vouchers.not_valid"
    assert api.get("/account/vouchers").json()[0]["status"] == "redeemed"


def test_q32_voucher_not_valid_in_peak(api: Api, club: Any, player: Any) -> None:
    voucher = voucher_for(player)
    booking = book(api, club, TUE_18)
    response = api.post(f"/account/vouchers/{voucher.code}/redeem", {"booking_id": booking["id"]})
    assert response.status_code == 400 and error_code(response) == "vouchers.band_not_allowed"
    assert Voucher.objects.get().status == VoucherStatus.ACTIVE


def test_hour_voucher_only_for_padel_rental(api: Api, club: Any, player: Any) -> None:
    voucher = voucher_for(player)
    for kind, resource in (("lesson", None), ("training", club.tennis)):
        booking = book(
            api,
            club,
            "2027-03-17T10:00:00+02:00" if resource else TUE_10,
            session_type=kind,
            resource=resource,
        )
        response = api.post(
            f"/account/vouchers/{voucher.code}/redeem", {"booking_id": booking["id"]}
        )
        assert error_code(response) == "vouchers.wrong_target"


def test_voucher_validity_and_ownership(
    api: Api, club: Any, player: Any, make_user: Any, time_machine: Any
) -> None:
    booking = book(api, club, TUE_10)
    others = voucher_for(make_user())
    assert (
        api.post(
            f"/account/vouchers/{others.code}/redeem", {"booking_id": booking["id"]}
        ).status_code
        == 404
    )
    short = voucher_for(player, days=1)
    time_machine.move_to("2027-03-16T09:00:00+02:00", tick=False)
    assert (
        error_code(
            api.post(f"/account/vouchers/{short.code}/redeem", {"booking_id": booking["id"]})
        )
        == "vouchers.not_valid"
    )
    amount = voucher_for(player, VoucherKind.AMOUNT, 3000, "subscription", days=10)
    assert (
        error_code(
            api.post(f"/account/vouchers/{amount.code}/redeem", {"booking_id": booking["id"]})
        )
        == "vouchers.wrong_target"
    )


def test_amount_and_percent_vouchers_on_a_subscription(
    api: Api, club: Any, player: Any, staff: Any, client: Client
) -> None:
    SubscriptionRate.objects.create(
        location=club.location, sport="padel", sessions_per_month=4, monthly_price=36001
    )
    order = api.post(
        "/subscriptions",
        {
            "location_id": str(club.location.id),
            "period": "monthly",
            "starts_on": "2027-03-15",
            "selections": [{"sport": "padel", "intensity": "start"}],
        },
    ).json()
    assert order["price_total"] == 36000  # rounded to a whole leu
    amount = voucher_for(player, VoucherKind.AMOUNT, 5000, "subscription")
    percent = voucher_for(player, VoucherKind.PERCENT, 15, "any")
    paid = api.post(
        f"/account/vouchers/{amount.code}/redeem", {"subscription_id": order["id"]}
    ).json()
    assert paid["amount"] == 5000
    paid = api.post(
        f"/account/vouchers/{percent.code}/redeem", {"subscription_id": order["id"]}
    ).json()
    assert paid["amount"] == 4650  # 15 % of 310 RON left
    left = api.get(f"/account/payment-status?subscription_id={order['id']}").json()["to_pay"]
    assert left == 36000 - 5000 - 4650
    big = voucher_for(player, VoucherKind.AMOUNT, 100000, "any")
    api.post(f"/account/vouchers/{big.code}/redeem", {"subscription_id": order["id"]})
    assert (
        api.get("/subscriptions/mine").json()[0]["status"] == "active"
    )  # paid in full by vouchers
    spare = voucher_for(player, VoucherKind.AMOUNT, 100, "any")
    nothing = api.post(f"/account/vouchers/{spare.code}/redeem", {"subscription_id": order["id"]})
    assert error_code(nothing) == "payments.nothing_due"


def test_free_cancellation_gives_the_voucher_back_not_credit(
    api: Api, club: Any, player: Any
) -> None:
    voucher = voucher_for(player)
    booking = book(api, club, "2027-03-18T10:00:00+02:00")
    api.post(f"/account/vouchers/{voucher.code}/redeem", {"booking_id": booking["id"]})
    assert (
        api.post(f"/bookings/{booking['id']}/cancel", {}).json()["cancellation_outcome"] == "free"
    )
    voucher.refresh_from_db()
    assert voucher.status == VoucherStatus.ACTIVE and voucher.redeemed_subject == ""
    assert ledger.customer_credit(player) == 0 and ledger.customer_debt(player) == 0
    other = book(api, club, "2027-03-19T10:00:00+02:00")
    assert (
        api.post(
            f"/account/vouchers/{voucher.code}/redeem", {"booking_id": other["id"]}
        ).status_code
        == 201
    )


# ---------------------------------------------------------------- managing vouchers
def test_managers_issue_and_cancel_vouchers(
    api: Api, club: Any, make_user: Any, staff: Any
) -> None:
    holder = make_user()
    body = {
        "location_id": str(club.location.id),
        "holder_id": str(holder.pk),
        "kind": "amount",
        "value": 2000,
        "target": "any",
        "valid_days": 30,
        "reason": "Scuze pentru întârziere",
    }
    staff(Role.RECEPTION, club.location)
    assert api.post("/staff/vouchers", body).status_code == 403
    staff(Role.MANAGER, club.location)
    created = api.post("/staff/vouchers", body)
    assert created.status_code == 201 and created.json()["valid_until"] == "2027-04-13"
    assert (
        api.post("/staff/vouchers", {**body, "holder_id": str(club.location.id)}).status_code == 404
    )
    assert (
        error_code(api.post("/staff/vouchers", {**body, "kind": "percent", "value": 150}))
        == "validation.invalid"
    )
    assert error_code(api.post("/staff/vouchers", {**body, "reason": " "})) == "validation.invalid"
    url = f"/staff/vouchers/{created.json()['id']}/cancel"
    assert (
        error_code(api.post(url, {"location_id": str(club.location.id), "reason": " "}))
        == "validation.invalid"
    )
    assert (
        api.post(url, {"location_id": str(club.location.id), "reason": "Greșeală"}).json()["status"]
        == "cancelled"
    )
    assert (
        api.post(url, {"location_id": str(club.location.id), "reason": "Din nou"}).status_code
        == 409
    )
    missing = "/staff/vouchers/00000000-0000-0000-0000-000000000000/cancel"
    assert (
        api.post(missing, {"location_id": str(club.location.id), "reason": "x"}).status_code == 404
    )


# ---------------------------------------------------------------- "Bring a friend" (R-120)
def subscribe_and_pay(api: Api, club: Any, user: Any, staff: Any, client: Client, key: str) -> None:
    login_as(client, user, mfa=False)
    order = api.post(
        "/subscriptions",
        {
            "location_id": str(club.location.id),
            "period": "monthly",
            "starts_on": "2027-03-15",
            "selections": [{"sport": "padel", "intensity": "start"}],
        },
    ).json()
    staff(Role.MANAGER, club.location)
    body = {
        "subscription_id": order["id"],
        "payer_id": str(user.pk),
        "amount": order["price_total"],
        "method": "cash",
        "tendered": order["price_total"],
        "reason": "La recepție",
    }
    assert api.post("/staff/payments", body, HTTP_IDEMPOTENCY_KEY=key).status_code == 201


def test_r120_both_get_a_free_hour_after_the_first_subscription(
    api: Api, club: Any, make_user: Any, staff: Any, client: Client
) -> None:
    SubscriptionRate.objects.create(
        location=club.location, sport="padel", sessions_per_month=4, monthly_price=36000
    )
    friend, newcomer = make_user(), make_user()
    login_as(client, friend, mfa=False)
    code = api.get("/account/referral-code").json()["code"]
    assert api.get("/account/referral-code").json()["code"] == code  # stable
    login_as(client, newcomer, mfa=False)
    assert api.post("/account/referral", {"code": code.lower()}).status_code == 201
    assert Referral.objects.get().referrer == friend

    subscribe_and_pay(api, club, newcomer, staff, client, "s1")
    for person in (friend, newcomer):
        voucher = Voucher.objects.get(holder=person)
        assert (voucher.kind, voucher.value, voucher.allowed_bands) == (
            "hour",
            60,
            ["off_peak", "semi_peak"],
        )
        assert voucher.valid_until == clock.today_local() + timedelta(days=89)
    subscribe_and_pay(api, club, newcomer, staff, client, "s2")
    assert Voucher.objects.count() == 2  # once per new person


def test_r120_referral_rules(
    api: Api, club: Any, make_user: Any, client: Client, staff: Any, time_machine: Any
) -> None:
    SubscriptionRate.objects.create(
        location=club.location, sport="padel", sessions_per_month=4, monthly_price=36000
    )
    friend = make_user(phone="+40700000001")
    login_as(client, friend, mfa=False)
    code = api.get("/account/referral-code").json()["code"]
    assert error_code(api.post("/account/referral", {"code": code})) == "referrals.self"
    assert api.post("/account/referral", {"code": "NOPE1234"}).status_code == 404

    twin = make_user(phone="+40700000001")  # the friend's own second account
    login_as(client, twin, mfa=False)
    assert error_code(api.post("/account/referral", {"code": code})) == "referrals.self"

    member = make_user(phone="+40700000002")
    subscribe_and_pay(api, club, member, staff, client, "m")
    login_as(client, member, mfa=False)
    assert error_code(api.post("/account/referral", {"code": code})) == "referrals.not_new"
    again = make_user(phone="+40700000002")  # same phone as someone who already subscribed
    login_as(client, again, mfa=False)
    assert error_code(api.post("/account/referral", {"code": code})) == "referrals.not_new"

    newcomer = make_user(phone="+40700000003")
    login_as(client, newcomer, mfa=False)
    assert api.post("/account/referral", {"code": code}).status_code == 201
    assert error_code(api.post("/account/referral", {"code": code})) == "referrals.already_claimed"
    duplicate = make_user(phone="+40700000003")  # the newcomer again, with another email
    login_as(client, duplicate, mfa=False)
    assert error_code(api.post("/account/referral", {"code": code})) == "referrals.not_new"

    late = make_user()
    User.objects.filter(pk=late.pk).update(created_at=clock.now() - timedelta(days=31))
    login_as(client, late, mfa=False)
    assert error_code(api.post("/account/referral", {"code": code})) == "referrals.not_new"


def test_readable_rows(make_user: Any) -> None:
    friend, newcomer = make_user(), make_user()
    referral = Referral.objects.create(referrer=friend, referred=newcomer, created_at=clock.now())
    assert str(referral) and str(voucher_for(friend))


def test_booking_voucher_is_not_for_subscriptions(api: Api, club: Any, player: Any) -> None:
    from jungle.rewards.models import ReferralCode

    SubscriptionRate.objects.create(
        location=club.location, sport="padel", sessions_per_month=4, monthly_price=36000
    )
    order = api.post(
        "/subscriptions",
        {
            "location_id": str(club.location.id),
            "period": "monthly",
            "starts_on": "2027-03-15",
            "selections": [{"sport": "padel", "intensity": "start"}],
        },
    ).json()
    hour = voucher_for(player)
    response = api.post(f"/account/vouchers/{hour.code}/redeem", {"subscription_id": order["id"]})
    assert error_code(response) == "vouchers.wrong_target"
    api.get("/account/referral-code")
    assert str(ReferralCode.objects.get())


def test_s11_the_holder_hears_about_a_new_voucher(
    make_user: Any, django_capture_on_commit_callbacks: Any
) -> None:
    from django.core import mail

    holder = make_user()
    with django_capture_on_commit_callbacks(execute=True):
        voucher = voucher_for(holder, days=30)
    assert len(mail.outbox) == 1
    body = mail.outbox[0].body
    assert mail.outbox[0].subject == "Ai primit un voucher"
    assert "60 de minute gratuite de padel" in body
    assert f"valabil până pe {voucher.valid_until:%d.%m.%Y}" in body
    assert "https://www.example.test/ro/cont/plati" in body


@pytest.mark.parametrize(
    ("kind", "value", "language", "words"),
    [
        (VoucherKind.HOUR, 60, "ro", "60 de minute gratuite de padel"),
        (VoucherKind.HOUR, 100, "ro", "100 de minute gratuite de padel"),
        (VoucherKind.HOUR, 15, "ro", "15 minute gratuite de padel"),
        (VoucherKind.HOUR, 90, "en", "90 free minutes of padel"),
        (VoucherKind.AMOUNT, 5000, "ro", "50 lei"),
        (VoucherKind.AMOUNT, 1250, "en", "12,50 lei"),
        (VoucherKind.PERCENT, 20, "ro", "20% reducere"),
        (VoucherKind.PERCENT, 15, "en", "15% off"),
    ],
)
def test_s11_what_a_voucher_is_worth_in_words(
    kind: str, value: int, language: str, words: str
) -> None:
    voucher = Voucher(kind=kind, value=value)
    assert services.voucher_words(voucher, language) == words
