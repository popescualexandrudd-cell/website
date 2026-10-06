"""Subscriptions (R-080 … R-089), make-up sessions (Q14), Start rule (R-087, Q13),
freezing (R-086) and corporate accounts (R-088, Q35)."""

from __future__ import annotations

from datetime import date
from typing import Any

import pytest
from django.test import Client
from hypothesis import given
from hypothesis import strategies as st

from jungle.conftest import Api, error_code, login_as, set_config
from jungle.core.errors import DomainError
from jungle.core.permissions import Role
from jungle.ledger import services as ledger
from jungle.subscriptions import services
from jungle.subscriptions.models import (
    Period,
    Subscription,
    SubscriptionMakeup,
    SubscriptionRate,
    SubscriptionStatus,
    SubscriptionUse,
)
from jungle.subscriptions.pricing import package_price, round_to_leu

pytestmark = pytest.mark.django_db

RATES = {"padel": {4: 36000, 8: 64000, 12: 90000}, "pilates": {4: 30000, 8: 52000}}


@pytest.fixture
def rates(club: Any) -> None:
    for sport, levels in RATES.items():
        for sessions, price in levels.items():
            SubscriptionRate.objects.create(
                location=club.location,
                sport=sport,
                sessions_per_month=sessions,
                monthly_price=price,
            )


@pytest.fixture
def customer(make_user: Any, client: Client) -> Any:
    user = make_user()
    login_as(client, user, mfa=False)
    return user


def order_body(
    club: Any,
    selections: list[dict[str, Any]],
    period: str = "monthly",
    starts_on: str = "2027-03-15",
) -> dict[str, Any]:
    return {
        "location_id": str(club.location.id),
        "selections": selections,
        "period": period,
        "starts_on": starts_on,
    }


def pay_all(api: Api, subscription_id: str, payer: Any, amount: int, key: str = "sub") -> Any:
    body = {
        "subscription_id": subscription_id,
        "payer_id": str(payer.pk),
        "amount": amount,
        "method": "cash",
        "tendered": amount,
        "reason": "Plată la recepție (chioșcul vine în Etapa 8)",
    }
    return api.post("/staff/payments", body, HTTP_IDEMPOTENCY_KEY=key)


def active_subscription(
    api: Api,
    club: Any,
    customer: Any,
    staff: Any,
    client: Client,
    selections: list[dict[str, Any]],
    period: str = "monthly",
) -> Subscription:
    login_as(client, customer, mfa=False)
    created = api.post("/subscriptions", order_body(club, selections, period))
    assert created.status_code == 201, created.json()
    staff(Role.MANAGER, club.location)
    assert (
        pay_all(api, created.json()["id"], customer, created.json()["price_total"]).status_code
        == 201
    )
    login_as(client, customer, mfa=False)
    return Subscription.objects.get(pk=created.json()["id"])


# ---------------------------------------------------------------- the price (R-084)
def test_r084_example_is_multiplicative_and_rounded_to_whole_leu() -> None:
    """Padel Activ 640 + Pilates Start 300 lei, quarterly: 940 × 3 × 0.90 × 0.95 = 2 411.10 lei."""
    price = package_price([64000, 30000], 3, [10, 5])
    assert (price.gross, price.total, price.rounding) == (282000, 241100, -10)


@pytest.mark.parametrize(
    ("numerator", "denominator", "lei"),
    [(150, 1, 200), (149, 1, 100), (50, 1, 100), (49, 1, 0), (0, 1, 0), (24115, 10, 2400)],
)
def test_r084_rounding_half_up_to_leu(numerator: int, denominator: int, lei: int) -> None:
    assert round_to_leu(numerator, denominator) == lei


@pytest.mark.parametrize(
    ("prices", "months", "discounts"), [([-1], 1, []), ([100], 0, []), ([100], 1, [95])]
)
def test_r084_invalid_packages(prices: list[int], months: int, discounts: list[int]) -> None:
    with pytest.raises(ValueError, match="invalid package"):
        package_price(prices, months, discounts)
    with pytest.raises(ValueError, match="non-negative"):
        round_to_leu(-1, 1)


@given(
    st.lists(st.integers(min_value=0, max_value=5_000_000), min_size=1, max_size=3),
    st.sampled_from([1, 3, 12]),
    st.lists(st.integers(min_value=0, max_value=90), max_size=3),
)
def test_r084_total_is_whole_lei_within_half_a_leu(
    prices: list[int], months: int, discounts: list[int]
) -> None:
    price = package_price(prices, months, discounts)
    exact: float = sum(prices) * months
    for d in discounts:
        exact = exact * (100 - d) / 100
    assert price.total % 100 == 0 and abs(price.total - exact) <= 50.0001
    assert isinstance(price.total, int)


# ---------------------------------------------------------------- configurator (R-081 … R-083)
def test_r081_options_and_quote(api: Api, club: Any, rates: None) -> None:
    options = api.get("/subscriptions/options?location=jungle-padel").json()
    assert options["intensities"] == {"start": 4, "active": 8, "pro": 12}
    assert options["bundle_discounts"]["2"] == 10 and options["period_discounts"]["annual"] == 15
    quote = api.post(
        "/subscriptions/quote",
        {
            "location": "jungle-padel",
            "period": "quarterly",
            "selections": [
                {"sport": "padel", "intensity": "active"},
                {"sport": "pilates", "intensity": "start"},
            ],
        },
    )
    assert quote.status_code == 200, quote.json()
    body = quote.json()
    assert body["total"] == 241100 and body["discounts"] == [10, 5] and body["provisional"] is True
    assert [c["peak_allowed"] for c in body["components"]] == [True, False]  # R-087: Start


@pytest.mark.parametrize(
    ("selections", "period", "status", "code"),
    [
        (
            [{"sport": "padel", "intensity": "active"}, {"sport": "padel", "intensity": "pro"}],
            "monthly",
            400,
            "subscriptions.invalid_selection",
        ),
        ([{"sport": "padel", "intensity": ""}], "monthly", 400, "subscriptions.invalid_selection"),
        ([{"sport": "pilates", "intensity": "pro"}], "monthly", 409, "pricing.rate_missing"),
        ([{"sport": "golf", "intensity": "pro"}], "monthly", 422, "validation.invalid"),
        ([{"sport": "padel", "intensity": "pro"}], "weekly", 422, "validation.invalid"),
    ],
)
def test_configurator_refusals(
    api: Api, club: Any, rates: None, selections: Any, period: str, status: int, code: str
) -> None:
    response = api.post(
        "/subscriptions/quote",
        {"location": "jungle-padel", "period": period, "selections": selections},
    )
    assert response.status_code == status and error_code(response) == code


def test_quote_service_guards(club: Any, rates: None) -> None:
    for selections, period in (
        ([services.Selection("golf", "pro")], "monthly"),
        ([services.Selection("padel", "mega")], "monthly"),
        ([services.Selection("padel", "pro")], "weekly"),
        ([], "monthly"),
    ):
        with pytest.raises(DomainError):
            services.quote(club.location, selections, period)


# ---------------------------------------------------------------- buying (R-089)
def test_r089_order_pay_and_activate(
    api: Api, club: Any, rates: None, customer: Any, staff: Any, client: Client, time_machine: Any
) -> None:
    created = api.post(
        "/subscriptions", order_body(club, [{"sport": "padel", "intensity": "active"}])
    )
    assert created.status_code == 201 and created.json()["status"] == "pending_payment"
    assert created.json()["ends_on"] == "2027-04-15"
    subscription_id = created.json()["id"]
    time_machine.move_to("2027-03-17T10:00:00+02:00", tick=False)  # paid two days later
    staff(Role.MANAGER, club.location)
    assert pay_all(api, subscription_id, customer, 30000, "a").status_code == 201
    assert Subscription.objects.get(pk=subscription_id).status == SubscriptionStatus.PENDING_PAYMENT
    assert pay_all(api, subscription_id, customer, 34000, "b").status_code == 201
    subscription = Subscription.objects.get(pk=subscription_id)
    assert subscription.status == SubscriptionStatus.ACTIVE
    assert (subscription.starts_on, subscription.ends_on) == (date(2027, 3, 17), date(2027, 4, 17))
    assert ledger.customer_debt(customer) == 0
    login_as(client, customer, mfa=False)
    mine = api.get("/subscriptions/mine").json()
    assert mine[0]["usage"] == [
        {
            "sport": "padel",
            "sessions_per_month": 8,
            "used_this_month": 0,
            "makeups_available": 0,
            "peak_allowed": True,
        }
    ]


@pytest.mark.parametrize("starts_on", ["2027-03-14", "2027-05-20"])
def test_order_start_date_limits(
    api: Api, club: Any, rates: None, customer: Any, starts_on: str
) -> None:
    response = api.post(
        "/subscriptions",
        order_body(club, [{"sport": "padel", "intensity": "start"}], starts_on=starts_on),
    )
    assert error_code(response) == "subscriptions.invalid_start"


def test_order_needs_verified_email_and_location(
    api: Api, club: Any, rates: None, make_user: Any, client: Client
) -> None:
    login_as(client, make_user(email_verified_at=None), mfa=False)
    body = order_body(club, [{"sport": "padel", "intensity": "start"}])
    assert error_code(api.post("/subscriptions", body)) == "booking.email_not_verified"
    login_as(client, make_user(), mfa=False)
    assert (
        api.post("/subscriptions", {**body, "location_id": str(club.court1.id)}).status_code == 404
    )


def test_cancel_pending_order(
    api: Api, club: Any, rates: None, customer: Any, make_user: Any, staff: Any, client: Client
) -> None:
    body = order_body(club, [{"sport": "padel", "intensity": "start"}])
    first = api.post("/subscriptions", body).json()["id"]
    second = api.post("/subscriptions", body).json()["id"]
    assert api.post(f"/subscriptions/{first}/cancel").json()["status"] == "cancelled"
    assert error_code(api.post(f"/subscriptions/{first}/cancel")) == "subscriptions.not_cancellable"
    login_as(client, make_user(), mfa=False)
    assert api.post(f"/subscriptions/{second}/cancel").status_code == 403
    staff(Role.MANAGER, club.location)
    pay_all(api, second, customer, 1000)
    assert (
        error_code(api.post(f"/subscriptions/{second}/cancel")) == "subscriptions.not_cancellable"
    )  # money paid
    assert api.post("/subscriptions/00000000-0000-0000-0000-000000000000/cancel").status_code == 404


# ---------------------------------------------------------------- using sessions
def lesson(api: Api, club: Any, when: str, resource: Any = None) -> Any:
    return api.post(
        "/bookings",
        {
            "resource_id": str((resource or club.court1).id),
            "starts_at": when,
            "duration_minutes": 60,
            "session_type": "lesson",
            "coach_id": str(club.coach.id),
        },
    )


def test_r083_lessons_use_sessions_rental_does_not(
    api: Api, club: Any, rates: None, customer: Any, staff: Any, client: Client
) -> None:
    active_subscription(
        api, club, customer, staff, client, [{"sport": "padel", "intensity": "start"}]
    )
    covered = lesson(api, club, "2027-03-16T10:00:00+02:00").json()
    status = api.get(f"/account/payment-status?booking_id={covered['id']}").json()
    assert status["to_pay"] == 0
    rental = api.post(
        "/bookings",
        {
            "resource_id": str(club.court2.id),
            "starts_at": "2027-03-16T10:00:00+02:00",
            "duration_minutes": 60,
            "session_type": "training",
        },
    ).json()
    assert (
        api.get(f"/account/payment-status?booking_id={rental['id']}").json()["to_pay"]
        == rental["price_total"]
    )
    assert SubscriptionUse.objects.count() == 1


def test_r087_start_is_not_valid_in_peak_hours(
    api: Api, club: Any, rates: None, customer: Any, staff: Any, client: Client
) -> None:
    active_subscription(
        api, club, customer, staff, client, [{"sport": "padel", "intensity": "start"}]
    )
    peak = lesson(api, club, "2027-03-16T18:00:00+02:00").json()  # Q3: peak 17–22
    assert api.get(f"/account/payment-status?booking_id={peak['id']}").json()["to_pay"] == 9000 * 2
    semi = lesson(api, club, "2027-03-17T09:00:00+02:00").json()  # Q13: semi-peak is allowed
    assert api.get(f"/account/payment-status?booking_id={semi['id']}").json()["to_pay"] == 0


def test_r085_quota_per_month_and_q14_makeups(
    api: Api, club: Any, rates: None, customer: Any, staff: Any, client: Client, time_machine: Any
) -> None:
    subscription = active_subscription(
        api, club, customer, staff, client, [{"sport": "padel", "intensity": "start"}]
    )
    ids = [lesson(api, club, f"2027-03-{16 + n}T10:00:00+02:00").json()["id"] for n in range(5)]
    to_pay = [api.get(f"/account/payment-status?booking_id={i}").json()["to_pay"] for i in ids]
    assert to_pay == [0, 0, 0, 0, 18000]  # 4 sessions this month, the fifth is paid

    assert api.post(f"/bookings/{ids[0]}/cancel", {}).json()["cancellation_outcome"] == "free"
    makeup = SubscriptionMakeup.objects.get()
    assert makeup.expires_on == subscription.ends_on  # Q14: valid until the end
    extra = lesson(api, club, "2027-03-25T10:00:00+02:00").json()
    assert (
        api.get(f"/account/payment-status?booking_id={extra['id']}").json()["to_pay"] == 0
    )  # the make-up

    time_machine.move_to("2027-03-16T20:00:00+02:00", tick=False)  # 14 h before: late
    assert api.post(f"/bookings/{ids[1]}/cancel", {}).json()["cancellation_outcome"] == "charged"
    assert SubscriptionMakeup.objects.count() == 1  # a late cancellation uses the session
    assert ledger.customer_debt(customer) == 0  # but costs nothing more (R-071 with subscription)

    # R-085: next month starts fresh; nothing carries over.
    april = lesson(api, club, "2027-04-15T10:00:00+02:00").json()
    assert (
        api.get(f"/account/payment-status?booking_id={april['id']}").json()["to_pay"] == 18000
    )  # after the end


def test_pilates_classes_use_sessions(
    api: Api, club: Any, rates: None, customer: Any, staff: Any, client: Client
) -> None:
    active_subscription(
        api, club, customer, staff, client, [{"sport": "pilates", "intensity": "active"}]
    )
    staff(Role.COACH, club.location)
    session = api.post(
        "/staff/classes",
        {
            "studio_id": str(club.studio.id),
            "instructor_id": str(club.coach.id),
            "kind": "group",
            "starts_at": "2027-03-17T18:00:00+02:00",
            "duration_minutes": 60,
            "capacity": 4,
        },
    ).json()
    login_as(client, customer, mfa=False)
    enrollment = api.post(f"/classes/{session['id']}/enroll").json()
    assert (
        api.get(f"/account/payment-status?enrollment_id={enrollment['id']}").json()["to_pay"] == 0
    )
    assert (
        api.post(f"/classes/enrollments/{enrollment['id']}/cancel").json()["cancellation_outcome"]
        == "free"
    )
    assert SubscriptionMakeup.objects.count() == 1


def test_waitlisted_promotion_uses_a_session(club: Any, rates: None, make_user: Any) -> None:
    from datetime import datetime, timedelta

    from jungle.bookings.classes import promote_class_waitlist
    from jungle.bookings.models import ClassEnrollment, ClassSession
    from jungle.core import clock

    person = make_user()
    start = datetime.fromisoformat("2027-03-17T18:00:00+02:00")
    subscription = Subscription.objects.create(
        user=person,
        location=club.location,
        period=Period.MONTHLY,
        starts_on=date(2027, 3, 15),
        ends_on=date(2027, 4, 15),
        status=SubscriptionStatus.ACTIVE,
        price_total=1,
        created_by=person,
        created_at=clock.now(),
    )
    subscription.components.create(
        sport="pilates", sessions_per_month=8, peak_allowed=True, monthly_price=1
    )
    session = ClassSession.objects.create(
        location=club.location,
        studio=club.studio,
        instructor=club.coach,
        kind="group",
        starts_at=start,
        ends_at=start + timedelta(hours=1),
        capacity=1,
        price_total=4000,
    )
    waiting = ClassEnrollment.objects.create(session=session, user=person, status="waitlisted")
    assert promote_class_waitlist(session, clock.now()) == waiting
    assert SubscriptionUse.objects.filter(enrollment=waiting).exists()


# ---------------------------------------------------------------- freezing (R-086)
def test_r086_freeze_two_weeks_a_year(
    api: Api, club: Any, rates: None, customer: Any, staff: Any, client: Client
) -> None:
    subscription = active_subscription(
        api, club, customer, staff, client, [{"sport": "padel", "intensity": "active"}]
    )
    url = f"/subscriptions/{subscription.pk}/freeze"
    booked = lesson(api, club, "2027-03-20T10:00:00+02:00").json()
    assert (
        error_code(api.post(url, {"starts_on": "2027-03-19", "days": 5}))
        == "subscriptions.freeze_conflict"
    )
    api.post(f"/bookings/{booked['id']}/cancel", {})
    response = api.post(url, {"starts_on": "2027-03-19", "days": 10})
    assert response.status_code == 201 and response.json()["ends_on"] == "2027-03-29"
    subscription.refresh_from_db()
    assert subscription.ends_on == date(2027, 4, 25)
    assert (
        error_code(api.post(url, {"starts_on": "2027-03-20", "days": 2}))
        == "subscriptions.freeze_overlap"
    )
    limit = api.post(url, {"starts_on": "2027-04-01", "days": 5})
    assert error_code(limit) == "subscriptions.freeze_limit" and limit.json()["error"][
        "params"
    ] == {"remaining": 4}
    assert (
        error_code(api.post(url, {"starts_on": "2027-03-10", "days": 1}))
        == "subscriptions.invalid_start"
    )
    frozen = lesson(api, club, "2027-03-21T10:00:00+02:00").json()
    assert (
        api.get(f"/account/payment-status?booking_id={frozen['id']}").json()["to_pay"] > 0
    )  # no session while frozen
    assert (
        api.post(
            "/subscriptions/00000000-0000-0000-0000-000000000000/freeze",
            {"starts_on": "2027-04-01", "days": 1},
        ).status_code
        == 404
    )


def test_freeze_needs_an_active_subscription(
    api: Api, club: Any, rates: None, customer: Any
) -> None:
    pending = api.post(
        "/subscriptions", order_body(club, [{"sport": "padel", "intensity": "start"}])
    ).json()
    response = api.post(
        f"/subscriptions/{pending['id']}/freeze", {"starts_on": "2027-03-20", "days": 3}
    )
    assert error_code(response) == "subscriptions.not_active"


# ---------------------------------------------------------------- dates
@pytest.mark.parametrize(
    ("day", "months", "expected"),
    [
        (date(2027, 1, 31), 1, date(2027, 2, 28)),
        (date(2027, 11, 30), 3, date(2028, 2, 29)),
        (date(2027, 3, 15), 12, date(2028, 3, 15)),
    ],
)
def test_add_months(day: date, months: int, expected: date) -> None:
    assert services.add_months(day, months) == expected


def test_cycles_count_from_the_start_and_freeze_days_join_the_last(
    club: Any, make_user: Any
) -> None:
    user = make_user()
    annual = Subscription(
        user=user,
        location=club.location,
        period="annual",
        starts_on=date(2027, 3, 15),
        ends_on=date(2028, 3, 25),
    )
    assert services.cycle_index(annual, date(2027, 4, 14)) == 0
    assert services.cycle_index(annual, date(2027, 4, 15)) == 1
    assert services.cycle_index(annual, date(2028, 3, 20)) == 11  # extended by a freeze


# ---------------------------------------------------------------- staff: custom and corporate
def test_q12_custom_intensity_by_staff(
    api: Api, club: Any, rates: None, make_user: Any, staff: Any
) -> None:
    customer = make_user()
    staff(Role.MANAGER, club.location)
    body = {
        **order_body(club, [{"sport": "tennis", "sessions": 6, "monthly_price": 45000}]),
        "user_id": str(customer.pk),
    }
    response = api.post("/staff/subscriptions", body)
    assert response.status_code == 201, response.json()
    assert response.json()["custom"] is True and response.json()["status"] == "pending_payment"
    assert response.json()["usage"][0]["peak_allowed"] is False  # Q12: under 8 = Start rule
    assert response.json()["price_total"] == 45000
    unknown = api.post("/staff/subscriptions", {**body, "user_id": str(club.location.id)})
    assert unknown.status_code == 404
    staff(Role.RECEPTION, club.location)
    assert api.post("/staff/subscriptions", body).status_code == 403


def test_r088_corporate_accounts(
    api: Api, club: Any, rates: None, make_user: Any, staff: Any, client: Client, time_machine: Any
) -> None:
    employee, outsider = make_user(first_name="Radu"), make_user()
    staff(Role.MANAGER, club.location)
    company = api.post(
        "/staff/corporate",
        {
            "location_id": str(club.location.id),
            "name": "Firma SRL",
            "registration_code": "RO123",
        },
    )
    assert company.status_code == 201
    account_id = company.json()["id"]
    assert (
        api.post(
            f"/staff/corporate/{account_id}/members", {"user_id": str(employee.pk)}
        ).status_code
        == 201
    )
    again = api.post(f"/staff/corporate/{account_id}/members", {"user_id": str(employee.pk)})
    assert again.status_code == 409 and error_code(again) == "corporate.already_member"
    assert (
        api.post(
            f"/staff/corporate/{account_id}/members", {"user_id": str(club.location.id)}
        ).status_code
        == 404
    )

    body = {
        **order_body(club, [{"sport": "padel", "intensity": "active"}]),
        "user_id": str(employee.pk),
        "corporate_id": account_id,
    }
    outsider_body = {**body, "user_id": str(outsider.pk)}
    assert error_code(api.post("/staff/subscriptions", outsider_body)) == "corporate.not_member"
    assert (
        api.post(
            "/staff/subscriptions", {**body, "corporate_id": str(club.location.id)}
        ).status_code
        == 404
    )
    created = api.post("/staff/subscriptions", body)
    assert created.status_code == 201
    assert (
        created.json()["status"] == "active" and created.json()["price_total"] == 51200
    )  # 640 × 0.8
    assert ledger.customer_debt(employee) == 0  # the company owes it, not the employee

    login_as(client, employee, mfa=False)
    lesson(api, club, "2027-03-16T10:00:00+02:00")
    staff(Role.MANAGER, club.location)
    report = api.get(f"/staff/corporate/{account_id}/report?year=2027&month=3").json()
    assert report["billed"] == 51200
    assert report["members"] == [
        {
            "user_id": str(employee.pk),
            "name": f"Radu {employee.last_name}",
            "sessions": {"padel": 1},
        }
    ]
    assert api.get(f"/staff/corporate/{account_id}/report?year=2027&month=13").status_code == 400
    assert (
        api.post(f"/staff/corporate/{account_id}/members/{employee.pk}/remove").status_code == 200
    )
    assert (
        error_code(api.post(f"/staff/corporate/{account_id}/members/{employee.pk}/remove"))
        == "corporate.not_member"
    )
    assert (
        api.get(
            "/staff/corporate/00000000-0000-0000-0000-000000000000/report?year=2027&month=3"
        ).status_code
        == 404
    )


def test_q35_single_company_package_discount(
    api: Api, club: Any, rates: None, make_user: Any, staff: Any
) -> None:
    """Q35 (owner, 27.09.2026): one company package, 20% off; the percentage is a setting."""
    staff(Role.MANAGER, club.location)
    account_id = api.post(
        "/staff/corporate", {"location_id": str(club.location.id), "name": "Alta SRL"}
    ).json()["id"]
    employee = make_user()
    api.post(f"/staff/corporate/{account_id}/members", {"user_id": str(employee.pk)})
    body = {
        **order_body(club, [{"sport": "padel", "intensity": "start"}]),
        "user_id": str(employee.pk),
        "corporate_id": account_id,
    }
    assert api.post("/staff/subscriptions", body).json()["price_total"] == 28800  # 360 × 0.8
    set_config("corporate.discount_percent", 10)
    assert api.post("/staff/subscriptions", body).json()["price_total"] == 32400  # 360 × 0.9


def _staff_request(api: Api) -> Any:
    """A request carrying the logged-in manager's session (for service-level checks)."""
    from django.contrib.auth import get_user
    from django.test import RequestFactory

    request = RequestFactory().get("/")
    request.session = api.client.session
    request.user = get_user(request)
    return request


def test_subscription_rates_are_set_by_manager(api: Api, club: Any, staff: Any) -> None:
    body = {
        "location_id": str(club.location.id),
        "sport": "tennis",
        "sessions_per_month": 8,
        "monthly_price": 50000,
        "confirmed": True,
    }
    staff(Role.RECEPTION, club.location)
    assert api.put("/staff/subscriptions/rates", body).status_code == 403
    staff(Role.MANAGER, club.location)
    assert api.put("/staff/subscriptions/rates", body).json()["marker"] == "confirmed"
    assert (
        api.put(
            "/staff/subscriptions/rates", {**body, "monthly_price": 52000, "confirmed": False}
        ).json()["monthly_price"]
        == 52000
    )
    assert (
        api.put(
            "/staff/subscriptions/rates", {**body, "location_id": str(club.court1.id)}
        ).status_code
        == 404
    )


def test_coach_role_is_not_enough_for_corporate(api: Api, club: Any, staff: Any) -> None:
    staff(Role.COACH, club.location)
    assert (
        api.post(
            "/staff/corporate", {"location_id": str(club.location.id), "name": "X"}
        ).status_code
        == 403
    )


def test_service_level_guards_and_readable_rows(
    api: Api, club: Any, rates: None, make_user: Any, staff: Any
) -> None:
    staff(Role.MANAGER, club.location)
    request = _staff_request(api)
    for sport, sessions, price in (("golf", 8, 1), ("padel", 0, 1), ("padel", 8, -1)):
        with pytest.raises(DomainError):
            services.set_rate(request, club.location, sport, sessions, price, False)
    body = {
        "subscription_id": str(club.location.id),
        "payer_id": str(make_user().pk),
        "amount": 100,
        "method": "cash",
        "tendered": 100,
        "reason": "x",
    }
    assert (
        error_code(api.post("/staff/payments", body, HTTP_IDEMPOTENCY_KEY="z"))
        == "subscriptions.not_found"
    )
    employee = make_user()
    account = services.create_corporate(request, services.CorporateData(club.location.id, "Firma"))
    member = services.add_member(request, account.pk, employee.pk)
    subscription = services.staff_create(
        request,
        services.Order(
            club.location.id, [services.Selection("padel", "pro")], "monthly", date(2027, 3, 15)
        ),
        employee.pk,
        account.pk,
    )
    lesson_use = services.cover(employee, "padel", subscription.created_at)
    freeze = services.freeze(request, subscription.pk, date(2027, 3, 20), 2)
    services.on_cancelled("free", booking=None, enrollment=None)
    rows = [
        SubscriptionRate.objects.first(),
        account,
        member,
        subscription,
        subscription.components.first(),
        freeze,
        lesson_use,
    ]
    assert all(str(row) for row in rows)
    makeup = SubscriptionMakeup.objects.create(
        component=subscription.components.get(),
        expires_on=date(2027, 5, 1),
        created_at=subscription.created_at,
    )
    assert str(makeup)


def test_s11_bought_sessions_left_frozen_and_expiring(
    api: Api,
    club: Any,
    rates: None,
    customer: Any,
    staff: Any,
    client: Client,
    django_capture_on_commit_callbacks: Any,
) -> None:
    from django.core import mail

    def subjects() -> list[str]:
        return [
            str(m.subject)
            for m in mail.outbox
            if m.to == [customer.email] and not m.subject.startswith("Rezervarea")
        ]

    def body(subject: str) -> str:
        return next(str(m.body) for m in reversed(mail.outbox) if m.subject == subject)

    with django_capture_on_commit_callbacks(execute=True):
        subscription = active_subscription(
            api, club, customer, staff, client, [{"sport": "padel", "intensity": "start"}]
        )
    assert subjects() == ["Abonamentul e activ"]
    assert "Abonamentul lunar e activ între 15.03.2027 și 14.04.2027" in body(subjects()[-1])
    assert "https://www.example.test/ro/cont/plati" in body(subjects()[-1])

    with django_capture_on_commit_callbacks(execute=True):
        lesson(api, club, "2027-03-16T10:00:00+02:00")  # 3 left: nothing yet
    assert len(subjects()) == 1
    with django_capture_on_commit_callbacks(execute=True):
        lesson(api, club, "2027-03-17T10:00:00+02:00")  # 2 left (the default threshold)
    assert subjects()[-1] == "Mai ai 2 sesiuni luna aceasta"
    assert "Mai ai 2 sesiuni de padel luna aceasta" in body(subjects()[-1])

    with django_capture_on_commit_callbacks(execute=True):
        frozen = api.post(
            f"/subscriptions/{subscription.pk}/freeze", {"starts_on": "2027-03-19", "days": 10}
        )
    assert frozen.status_code == 201
    assert subjects()[-1] == "Abonamentul e înghețat"
    assert "între 19.03.2027 și 28.03.2027" in body(subjects()[-1])

    subscription.refresh_from_db()  # ends on 25.04 (exclusive): the last day is 24.04
    assert services.remind_expiring(date(2027, 4, 16)) == 0
    with django_capture_on_commit_callbacks(execute=True):
        assert services.remind_expiring(date(2027, 4, 17)) == 1
        assert services.remind_expiring(date(2027, 4, 17)) == 1  # the same day again
    assert subjects()[-1] == "Abonamentul expiră pe 24.04.2027"
    assert subjects().count("Abonamentul expiră pe 24.04.2027") == 1


def test_s11_the_daily_command_sends_the_expiring_reminders(time_machine: Any) -> None:
    from io import StringIO

    from django.core.management import call_command

    time_machine.move_to("2027-04-17T07:00:00+03:00", tick=False)
    out = StringIO()
    call_command("notifications_daily", stdout=out)
    assert out.getvalue().splitlines() == [
        "Abonamente care expiră curând: 0.",
        "Întrebați după primul meci (NPS): 0.",
    ]
