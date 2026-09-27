"""The ledger itself (R-061, R-064, R-065, R-067, ADR-0009): double entry, append-only,
integers only, corrections by reversal."""

from __future__ import annotations

from typing import Any

import pytest
from django.db import IntegrityError, connection, transaction
from django.db.utils import InternalError
from hypothesis import given
from hypothesis import strategies as st

from jungle.audit.services import SYSTEM
from jungle.conftest import Api, error_code
from jungle.core.errors import DomainError
from jungle.core.permissions import Role
from jungle.ledger import services
from jungle.ledger.models import (
    AccountKind,
    LedgerAccount,
    LedgerEntry,
    LedgerTransaction,
    TransactionKind,
)

pytestmark = pytest.mark.django_db


@pytest.fixture
def accounts(location: Any) -> tuple[LedgerAccount, LedgerAccount]:
    cash = services.account(AccountKind.CASH, location=location)
    revenue = services.account(AccountKind.REVENUE, location=location, category="padel")
    return cash, revenue


def sale(
    cash: LedgerAccount, revenue: LedgerAccount, amount: int = 5000, **kw: Any
) -> LedgerTransaction:
    return services.post(
        TransactionKind.SALE,
        [(cash, amount), (revenue, -amount)],
        description="test",
        actor=SYSTEM,
        **kw,
    )


# ---------------------------------------------------------------- accounts
def test_accounts_are_created_once(location: Any, make_user: Any) -> None:
    user = make_user()
    first = services.account(AccountKind.CUSTOMER_BALANCE, user=user)
    assert services.account(AccountKind.CUSTOMER_BALANCE, user=user) == first
    assert first.code == f"customer_balance:-:{user.pk}:-"
    other = services.account(AccountKind.RECEIVABLE, user=user, location=location)
    assert other != first and other.currency == "RON"


def test_account_created_concurrently_is_reused(location: Any, monkeypatch: Any) -> None:
    """Two requests create the same account at once: the loser reads the winner's row."""
    existing = services.account(AccountKind.CASH, location=location)

    class Nothing:
        def first(self) -> None:
            return None

    real_filter = LedgerAccount.objects.filter
    calls = {"n": 0}

    def filter_once(*args: Any, **kwargs: Any) -> Any:
        calls["n"] += 1
        return Nothing() if calls["n"] == 1 else real_filter(*args, **kwargs)

    monkeypatch.setattr(LedgerAccount.objects, "filter", filter_once)
    assert services.account(AccountKind.CASH, location=location) == existing


# ---------------------------------------------------------------- posting
def test_r064_post_is_balanced_and_merges_lines(accounts: Any) -> None:
    cash, revenue = accounts
    tx = services.post(
        TransactionKind.SALE,
        [(cash, 3000), (cash, 2000), (revenue, -5000)],
        description="x",
        actor=SYSTEM,
    )
    assert sorted(e.amount for e in tx.entries.all()) == [-5000, 5000]
    assert services.balance(cash) == 5000 and services.balance(revenue) == -5000
    assert tx.actor["kind"] == "system"


@pytest.mark.parametrize(
    "lines",
    [
        lambda c, r: [(c, 100)],  # one line
        lambda c, r: [(c, 100), (r, -99)],  # does not balance
        lambda c, r: [(c, 100), (c, -100), (r, 0)],  # nothing left after merging
    ],
)
def test_r064_unbalanced_transactions_are_refused(accounts: Any, lines: Any) -> None:
    with pytest.raises(ValueError, match="sum to zero"):
        services.post(TransactionKind.SALE, lines(*accounts), description="x", actor=SYSTEM)
    assert not LedgerTransaction.objects.exists()


@pytest.mark.parametrize("amount", [50.0, True])
def test_adr0009_amounts_are_integers_never_float(accounts: Any, amount: Any) -> None:
    cash, revenue = accounts
    with pytest.raises(TypeError):
        services.post(
            TransactionKind.SALE, [(cash, amount), (revenue, -50)], description="x", actor=SYSTEM
        )


def test_r064_database_refuses_unbalanced_transaction(accounts: Any) -> None:
    """The deferred trigger checks the sum when the database transaction commits."""
    cash, revenue = accounts
    tx = sale(cash, revenue)
    with transaction.atomic():
        LedgerEntry.objects.create(transaction=tx, account=cash, amount=1)
        with pytest.raises(IntegrityError), connection.cursor() as cursor:
            cursor.execute("SET CONSTRAINTS ALL IMMEDIATE")
        transaction.set_rollback(True)


def test_r064_ledger_is_append_only(accounts: Any) -> None:
    cash, revenue = accounts
    tx = sale(cash, revenue)
    entry = tx.entries.first()
    assert entry is not None
    for action in (
        lambda: LedgerEntry.objects.filter(pk=entry.pk).update(amount=1),
        lambda: LedgerEntry.objects.filter(pk=entry.pk).delete(),
        lambda: LedgerTransaction.objects.filter(pk=tx.pk).update(description="changed"),
    ):
        with pytest.raises((IntegrityError, InternalError)), transaction.atomic():
            action()


def test_r067_idempotency_key(accounts: Any) -> None:
    cash, revenue = accounts
    tx = sale(cash, revenue, idempotency_key="k1", fingerprint="a")
    assert services.existing("k1", "a") == tx
    assert services.existing("k2", "a") is None
    with pytest.raises(DomainError) as exc:
        services.existing("k1", "b")
    assert exc.value.code.value == "payments.idempotency_conflict"
    with pytest.raises(IntegrityError), transaction.atomic():
        sale(cash, revenue, idempotency_key="k1")
    assert services.request_hash({"a": 1, "b": 2}) == services.request_hash({"b": 2, "a": 1})


def test_r065_customer_credit_and_debt(location: Any, make_user: Any, accounts: Any) -> None:
    user = make_user()
    _cash, revenue = accounts
    credit = services.account(AccountKind.CUSTOMER_BALANCE, user=user)
    debt = services.account(AccountKind.RECEIVABLE, user=user, location=location)
    services.post(
        TransactionKind.CREDIT, [(revenue, 2500), (credit, -2500)], description="c", actor=SYSTEM
    )
    services.post(
        TransactionKind.CHARGE, [(debt, 4000), (revenue, -4000)], description="d", actor=SYSTEM
    )
    assert services.customer_credit(user) == 2500
    assert services.customer_debt(user) == 4000
    assert services.customer_credit(make_user()) == 0


# ---------------------------------------------------------------- splitting the hour
@pytest.mark.parametrize(
    ("total", "parts", "shares"),
    [
        (10001, 3, [3335, 3333, 3333]),  # R-061: 100,01 / 3
        (12000, 4, [3000, 3000, 3000, 3000]),
        (5, 4, [2, 1, 1, 1]),
        (0, 2, [0, 0]),
        (12000, 1, [12000]),
    ],
)
def test_r061_split_examples(total: int, parts: int, shares: list[int]) -> None:
    assert services.split_amount(total, parts) == shares


@given(st.integers(min_value=0, max_value=10**9), st.integers(min_value=1, max_value=8))
def test_r061_split_never_creates_or_loses_money(total: int, parts: int) -> None:
    shares = services.split_amount(total, parts)
    assert sum(shares) == total and len(shares) == parts
    assert shares[0] >= max(shares) and max(shares) - min(shares) < parts
    assert all(isinstance(s, int) for s in shares)


@pytest.mark.parametrize(("total", "parts"), [(100, 0), (-1, 2)])
def test_r061_split_refuses_nonsense(total: int, parts: int) -> None:
    with pytest.raises(DomainError):
        services.split_amount(total, parts)


# ---------------------------------------------------------------- corrections
def test_r064_reversal_by_manager_with_reason(
    api: Api, accounts: Any, staff: Any, location: Any
) -> None:
    cash, revenue = accounts
    tx = sale(cash, revenue, location=location)
    url = f"/staff/ledger/transactions/{tx.pk}/reverse"

    staff(Role.RECEPTION, location)
    assert api.post(url, {"reason": "greșit"}).status_code == 403
    staff(Role.MANAGER, location)
    assert api.post(url, {"reason": ""}).status_code == 422
    assert error_code(api.post(url, {"reason": "   "})) == "validation.invalid"
    response = api.post(url, {"reason": "Sumă greșită"})
    assert response.status_code == 201, response.json()
    assert response.json()["reverses_id"] == str(tx.pk)
    assert services.balance(cash) == 0 and services.balance(revenue) == 0

    again = api.post(url, {"reason": "din nou"})
    assert again.status_code == 409 and error_code(again) == "ledger.already_reversed"
    of_reversal = api.post(
        f"/staff/ledger/transactions/{response.json()['id']}/reverse", {"reason": "x"}
    )
    assert of_reversal.status_code == 409 and error_code(of_reversal) == "ledger.cannot_reverse"
    missing = api.post(
        "/staff/ledger/transactions/00000000-0000-0000-0000-000000000000/reverse", {"reason": "x"}
    )
    assert missing.status_code == 404 and error_code(missing) == "ledger.not_found"
