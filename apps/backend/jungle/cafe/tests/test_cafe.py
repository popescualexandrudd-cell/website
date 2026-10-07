"""The café (R-111, R-112, Q33): menu, paid orders, the bar queue, the lobby numbers."""

from __future__ import annotations

import threading
from typing import Any

import pytest
from django.db import connection
from django.test import Client

from jungle.audit.services import SYSTEM
from jungle.cafe import services
from jungle.cafe.models import CafeCategory, CafeOrder, CafeProduct
from jungle.configuration import web
from jungle.conftest import Api, error_code
from jungle.core.errors import DomainError
from jungle.core.permissions import Role
from jungle.ledger import services as ledger
from jungle.ledger.models import AccountKind, TransactionKind

pytestmark = pytest.mark.django_db


@pytest.fixture
def menu(club: Any) -> dict[str, CafeProduct]:
    drinks = CafeCategory.objects.create(
        location=club.location, name_ro="Băuturi", name_en="Drinks"
    )
    return {
        "espresso": CafeProduct.objects.create(
            location=club.location,
            category=drinks,
            name_ro="Espresso",
            name_en="Espresso",
            price=1200,
        ),
        "water": CafeProduct.objects.create(
            location=club.location, category=drinks, name_ro="Apă", name_en="Water", price=800
        ),
        "gone": CafeProduct.objects.create(
            location=club.location,
            category=drinks,
            name_ro="Limonadă",
            name_en="Lemonade",
            price=1500,
            is_available=False,
        ),
        "free": CafeProduct.objects.create(
            location=club.location,
            category=drinks,
            name_ro="Apă de la robinet",
            name_en="Tap water",
            price=0,
        ),
    }


def order_body(club: Any, lines: list[tuple[CafeProduct, int]], **extra: Any) -> dict[str, Any]:
    return {
        "location_id": str(club.location.id),
        "lines": [{"product_id": str(p.id), "quantity": q} for p, q in lines],
        "method": "cash",
        "tendered": 5000,
        "reason": "Chioșcul e oprit",
        **extra,
    }


def test_r112_public_menu_shows_only_available(api: Api, club: Any, menu: Any) -> None:
    body = api.get("/cafe/menu?location=jungle-padel").json()
    names = [p["name_en"] for p in body[0]["products"]]
    assert "Lemonade" not in names and "Espresso" in names
    assert body[0]["products"][0]["marker"] == "to_set"  # Q21: prices DE_STABILIT


def test_r111_order_paid_in_cash_with_numbers_per_day(
    api: Api, club: Any, menu: Any, staff: Any
) -> None:
    staff(Role.RECEPTION, club.location)
    assert (
        api.post(
            "/staff/cafe/orders",
            order_body(club, [(menu["espresso"], 1)]),
            HTTP_IDEMPOTENCY_KEY="a",
        ).status_code
        == 403
    )
    staff(Role.MANAGER, club.location)
    first = api.post(
        "/staff/cafe/orders",
        order_body(club, [(menu["espresso"], 2), (menu["water"], 1)]),
        HTTP_IDEMPOTENCY_KEY="a",
    )
    assert first.status_code == 201, first.json()
    assert (first.json()["number"], first.json()["total"]) == (1, 3200)
    retry = api.post(
        "/staff/cafe/orders",
        order_body(club, [(menu["espresso"], 2), (menu["water"], 1)]),
        HTTP_IDEMPOTENCY_KEY="a",
    )
    assert retry.json()["id"] == first.json()["id"]  # R-067
    conflict = api.post(
        "/staff/cafe/orders", order_body(club, [(menu["water"], 1)]), HTTP_IDEMPOTENCY_KEY="a"
    )
    assert error_code(conflict) == "payments.idempotency_conflict"
    second = api.post(
        "/staff/cafe/orders", order_body(club, [(menu["water"], 1)]), HTTP_IDEMPOTENCY_KEY="b"
    )
    assert second.json()["number"] == 2
    order = CafeOrder.objects.get(pk=first.json()["id"])
    assert order.transaction.kind == TransactionKind.SALE
    payment = order.transaction.payment
    assert (payment.tendered, payment.change) == (5000, 1800) and payment.fiscal_receipt.startswith(
        "SIM-"
    )
    revenue = ledger.account(AccountKind.REVENUE, location=club.location, category="cafe")
    assert ledger.balance(revenue) == -(3200 + 800)


@pytest.mark.parametrize(
    ("change", "code"),
    [
        ({"tendered": 100}, "payments.insufficient_cash"),
        ({"method": "card"}, "payments.method_unavailable"),
        ({"method": "balance"}, "payments.method_unavailable"),  # needs a customer
        ({"reason": " "}, "validation.invalid"),
    ],
)
def test_cafe_order_refusals(
    api: Api, club: Any, menu: Any, staff: Any, change: dict[str, Any], code: str
) -> None:
    staff(Role.MANAGER, club.location)
    response = api.post(
        "/staff/cafe/orders",
        order_body(club, [(menu["espresso"], 1)], **change),
        HTTP_IDEMPOTENCY_KEY="k",
    )
    assert error_code(response) == code
    assert not CafeOrder.objects.exists()


def test_cafe_order_products_and_customer(
    api: Api, club: Any, menu: Any, staff: Any, make_user: Any
) -> None:
    staff(Role.MANAGER, club.location)
    gone = api.post(
        "/staff/cafe/orders", order_body(club, [(menu["gone"], 1)]), HTTP_IDEMPOTENCY_KEY="1"
    )
    assert error_code(gone) == "cafe.product_unavailable"
    free = api.post(
        "/staff/cafe/orders", order_body(club, [(menu["free"], 1)]), HTTP_IDEMPOTENCY_KEY="2"
    )
    assert error_code(free) == "payments.invalid_amount"
    ghost = api.post(
        "/staff/cafe/orders",
        order_body(club, [(menu["water"], 1)], customer_id=str(club.location.id)),
        HTTP_IDEMPOTENCY_KEY="3",
    )
    assert ghost.status_code == 404
    assert (
        api.post(
            "/staff/cafe/orders",
            {**order_body(club, [(menu["water"], 1)]), "location_id": str(club.court1.id)},
            HTTP_IDEMPOTENCY_KEY="4",
        ).status_code
        == 404
    )


def test_service_guards(club: Any, menu: Any) -> None:
    for data in (
        services.OrderData(
            lines=[services.OrderLine(menu["water"].id, 1)], method="cash", tendered=800
        ),
        services.OrderData(lines=[], method="cash", idempotency_key="x"),
        services.OrderData(
            lines=[services.OrderLine(menu["water"].id, 21)],
            method="cash",
            tendered=99999,
            idempotency_key="y",
        ),
    ):
        with pytest.raises(DomainError):
            services.place_order(SYSTEM, club.location, data)


@pytest.mark.django_db(transaction=True)
def test_r067_the_same_order_sent_twice_at_once_is_taken_once(club: Any, menu: Any) -> None:
    """Two copies of one order arrive together (a retry): one order, one receipt, one answer."""
    data = services.OrderData(
        lines=[services.OrderLine(menu["espresso"].id, 2)],
        method="cash",
        tendered=5000,
        idempotency_key="twice",
    )
    barrier = threading.Barrier(2)
    results: list[Any] = []

    def attempt() -> None:
        try:
            barrier.wait()
            results.append(services.place_order(SYSTEM, club.location, data).pk)
        except Exception as exc:
            results.append(repr(exc))
        finally:
            connection.close()

    threads = [threading.Thread(target=attempt) for _ in range(2)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    assert len(set(results)) == 1, results
    assert CafeOrder.objects.count() == 1 and results[0] == CafeOrder.objects.get().pk


def test_paid_from_credit(club: Any, menu: Any, make_user: Any) -> None:
    customer = make_user()
    credit = ledger.account(AccountKind.CUSTOMER_BALANCE, user=customer)
    revenue = ledger.account(AccountKind.REVENUE, location=club.location, category="padel")
    ledger.post(
        TransactionKind.CREDIT,
        [(revenue, 1000), (credit, -1000)],
        description="credit",
        actor=SYSTEM,
    )
    too_much = services.OrderData(
        lines=[services.OrderLine(menu["espresso"].id, 1)],
        method="balance",
        customer_id=customer.pk,
        idempotency_key="c1",
    )
    with pytest.raises(DomainError) as exc:
        services.place_order(SYSTEM, club.location, too_much)
    assert exc.value.code.value == "payments.insufficient_balance"
    water = services.OrderData(
        lines=[services.OrderLine(menu["water"].id, 1)],
        method="balance",
        customer_id=customer.pk,
        idempotency_key="c2",
    )
    order = services.place_order(SYSTEM, club.location, water)
    assert ledger.customer_credit(customer) == 200
    assert order.customer == customer and str(order) and str(order.lines.first())


def test_the_bar_queue_and_lobby_numbers(
    api: Api, club: Any, menu: Any, staff: Any, client: Client
) -> None:
    staff(Role.MANAGER, club.location)
    order_id = api.post(
        "/staff/cafe/orders", order_body(club, [(menu["espresso"], 1)]), HTTP_IDEMPOTENCY_KEY="q"
    ).json()["id"]
    staff(Role.RECEPTION, club.location)  # the bar (the café display device from Stage 8)
    queue = api.get(f"/staff/cafe/queue?location_id={club.location.id}").json()
    assert [o["status"] for o in queue] == ["new"] and queue[0]["lines"][0]["name"] == "Espresso"
    step = f"/staff/cafe/orders/{order_id}/status"
    assert error_code(api.post(step, {"status": "ready"})) == "cafe.invalid_transition"
    assert api.post(step, {"status": "preparing"}).json()["status"] == "preparing"
    assert api.post(step, {"status": "ready"}).json()["ready_at"] is not None
    lobby = Api(Client()).get("/cafe/ready?location=jungle-padel").json()
    assert lobby == {"numbers": [1]}  # numbers only (R-012)
    assert api.post(step, {"status": "picked_up"}).json()["status"] == "picked_up"
    assert Api(Client()).get("/cafe/ready?location=jungle-padel").json() == {"numbers": []}
    assert api.get(f"/staff/cafe/queue?location_id={club.location.id}").json() == []
    assert (
        api.post(
            "/staff/cafe/orders/00000000-0000-0000-0000-000000000000/status", {"status": "ready"}
        ).status_code
        == 404
    )


def test_cancelling_an_order_returns_the_money(api: Api, club: Any, menu: Any, staff: Any) -> None:
    staff(Role.MANAGER, club.location)
    order_id = api.post(
        "/staff/cafe/orders", order_body(club, [(menu["water"], 2)]), HTTP_IDEMPOTENCY_KEY="x"
    ).json()["id"]
    url = f"/staff/cafe/orders/{order_id}/cancel"
    assert error_code(api.post(url, {"reason": " "})) == "validation.invalid"
    assert api.post(url, {"reason": "Client a plecat"}).json()["status"] == "cancelled"
    cash = ledger.account(AccountKind.CASH, location=club.location)
    assert ledger.balance(cash) == 0
    assert error_code(api.post(url, {"reason": "din nou"})) == "cafe.invalid_transition"


def test_menu_management(api: Api, club: Any, staff: Any, monkeypatch: pytest.MonkeyPatch) -> None:
    """R-112; every change of the menu asks the website to show it (§9.2.13, tag "cafe")."""
    refreshes: list[list[str]] = []
    monkeypatch.setattr(web, "revalidate_after_commit", refreshes.append)
    staff(Role.RECEPTION, club.location)
    body = {"location_id": str(club.location.id), "name_ro": "Gustări", "name_en": "Snacks"}
    assert api.post("/staff/cafe/categories", body).status_code == 403
    staff(Role.MANAGER, club.location)
    category = api.post("/staff/cafe/categories", body).json()
    product = {
        "location_id": str(club.location.id),
        "category_id": category["id"],
        "name_ro": "Covrig",
        "name_en": "Pretzel",
        "price": 500,
    }
    created = api.post("/staff/cafe/products", product)
    assert created.status_code == 201 and created.json()["marker"] == "to_set"
    url = f"/staff/cafe/products/{created.json()['id']}"
    changed = api.put(url, {**product, "price": 600, "confirmed": True, "is_available": False})
    assert changed.json()["price"] == 600 and changed.json()["marker"] == "confirmed"
    assert api.get("/cafe/menu?location=jungle-padel").json() == []  # not available
    assert refreshes == [["cafe"], ["cafe"], ["cafe"]]  # the category, the product, the change
    assert (
        api.post(
            "/staff/cafe/products", {**product, "category_id": str(club.location.id)}
        ).status_code
        == 404
    )
    assert (
        api.put("/staff/cafe/products/00000000-0000-0000-0000-000000000000", product).status_code
        == 404
    )
    assert (
        api.post("/staff/cafe/categories", {**body, "location_id": str(club.court1.id)}).status_code
        == 404
    )
    rows = [CafeCategory.objects.first(), CafeProduct.objects.first()]
    assert all(str(r) for r in rows)
