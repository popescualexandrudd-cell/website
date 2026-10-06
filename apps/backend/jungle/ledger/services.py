"""Posting to the ledger (R-064, R-067, ADR-0009).

`post` is the only way money moves. It checks the double entry in code (the database
checks it again at commit), and makes every operation with an idempotency key safe to
retry: the same key with the same request returns the first transaction; the same key
with a different request is refused.
"""

from __future__ import annotations

import dataclasses
import hashlib
import json
import uuid
from collections.abc import Sequence
from typing import Any

from django.db import IntegrityError, transaction
from django.db.models import Sum
from django.http import HttpRequest

from jungle.accounts.models import User
from jungle.accounts.services.authz import authorize
from jungle.audit import services as audit
from jungle.core import clock
from jungle.core.ai_origin import refuse_ai
from jungle.core.errors import DomainError, ErrorCode
from jungle.core.permissions import Action
from jungle.ledger.models import (
    AccountKind,
    LedgerAccount,
    LedgerEntry,
    LedgerTransaction,
    TransactionKind,
)
from jungle.locations.models import Location

Line = tuple[LedgerAccount, int]


def account(
    kind: str,
    *,
    user: User | None = None,
    location: Location | None = None,
    category: str = "",
) -> LedgerAccount:
    """The ledger account for (kind, location, person, category), created on first use."""
    code = ":".join(
        [
            kind,
            str(location.pk) if location else "-",
            str(user.pk) if user else "-",
            category or "-",
        ]
    )
    found = LedgerAccount.objects.filter(code=code).first()
    if found is not None:
        return found
    try:
        with transaction.atomic():
            return LedgerAccount.objects.create(
                code=code, kind=kind, user=user, location=location, category=category
            )
    except IntegrityError:  # created at the same moment by another request
        return LedgerAccount.objects.get(code=code)


def request_hash(payload: dict[str, Any]) -> str:
    """A stable fingerprint of what a money request asked for (R-067)."""
    text = json.dumps(payload, sort_keys=True, default=str)
    return hashlib.sha256(text.encode()).hexdigest()


def _actor_data(actor: audit.Actor) -> dict[str, Any]:
    return {
        k: (str(v) if isinstance(v, uuid.UUID) else v) for k, v in dataclasses.asdict(actor).items()
    }


def existing(idempotency_key: str, fingerprint: str) -> LedgerTransaction | None:
    """The earlier transaction for this key, or None. A reused key for another request is
    refused (R-067)."""
    found = LedgerTransaction.objects.filter(idempotency_key=idempotency_key).first()
    if found is not None and found.request_hash != fingerprint:
        raise DomainError(ErrorCode.PAYMENTS_IDEMPOTENCY_CONFLICT, status=409)
    return found


def post(
    kind: str,
    lines: Sequence[Line],
    *,
    description: str,
    actor: audit.Actor,
    reason: str = "",
    idempotency_key: str | None = None,
    fingerprint: str = "",
    location: Location | None = None,
    booking_id: uuid.UUID | None = None,
    enrollment_id: uuid.UUID | None = None,
    reverses: LedgerTransaction | None = None,
    metadata: dict[str, Any] | None = None,
    subject: str = "",
) -> LedgerTransaction:
    """Writes one balanced transaction. Lines with the same account are merged."""
    refuse_ai("money")  # ADR-0019, the second barrier
    merged: dict[uuid.UUID, int] = {}
    accounts: dict[uuid.UUID, LedgerAccount] = {}
    for acc, amount in lines:
        if not isinstance(amount, int) or isinstance(amount, bool):
            raise TypeError("ledger amounts are integers in bani")  # invariant 5: never float
        merged[acc.pk] = merged.get(acc.pk, 0) + amount
        accounts[acc.pk] = acc
    entries = [(accounts[pk], amount) for pk, amount in merged.items() if amount != 0]
    if len(entries) < 2 or sum(amount for _, amount in entries) != 0:
        raise ValueError("a ledger transaction needs at least two lines that sum to zero")
    with transaction.atomic():
        tx = LedgerTransaction.objects.create(
            kind=kind,
            idempotency_key=idempotency_key,
            request_hash=fingerprint,
            location=location,
            booking_id=booking_id,
            enrollment_id=enrollment_id,
            reverses=reverses,
            subject=subject,
            description=description[:250],
            reason=reason[:500],
            actor=_actor_data(actor),
            metadata=metadata or {},
            created_at=clock.now(),
        )
        LedgerEntry.objects.bulk_create(
            LedgerEntry(transaction=tx, account=acc, amount=amount) for acc, amount in entries
        )
    return tx


def balance(acc: LedgerAccount) -> int:
    """Debits minus credits (bani)."""
    return int(acc.entries.aggregate(total=Sum("amount"))["total"] or 0)


def _sum_for(user: User, kind: str) -> int:
    total = LedgerEntry.objects.filter(account__user=user, account__kind=kind).aggregate(
        total=Sum("amount")
    )["total"]
    return int(total or 0)


def customer_credit(user: User) -> int:
    """R-065: money the club holds for the customer (credit from cancellations, refunds)."""
    return -_sum_for(user, AccountKind.CUSTOMER_BALANCE)


def customer_debt(user: User) -> int:
    """R-065: what the customer owes (late cancellations, no-shows, unpaid sessions)."""
    return _sum_for(user, AccountKind.RECEIVABLE)


def split_amount(total: int, parts: int) -> list[int]:
    """R-061: the hour split in whole bani; the first participant pays the leftover bani,
    e.g. 10001 / 3 → [3335, 3333, 3333]. The parts always add up to the total."""
    if parts < 1 or total < 0:
        raise DomainError(ErrorCode.PAYMENTS_INVALID_AMOUNT)
    share, rest = divmod(total, parts)
    return [share + rest] + [share] * (parts - 1)


def reverse(request: HttpRequest, transaction_id: uuid.UUID, reason: str) -> LedgerTransaction:
    """R-064: a correction is a new transaction with the opposite entries, a reason and an
    author. A transaction is reversed at most once; reversals themselves are final."""
    original = (
        LedgerTransaction.objects.select_related("location").filter(pk=transaction_id).first()
    )
    if original is None:
        raise DomainError(ErrorCode.LEDGER_NOT_FOUND, status=404)
    authorize(request, Action.LEDGER_CORRECT, original.location_id)
    if not reason.strip():
        raise DomainError(ErrorCode.VALIDATION_INVALID, params={"field": "reason"})
    return reverse_as(audit.actor_from_request(request), original, reason)


def reverse_as(actor: audit.Actor, original: LedgerTransaction, reason: str) -> LedgerTransaction:
    if original.kind == TransactionKind.REVERSAL:
        raise DomainError(ErrorCode.LEDGER_CANNOT_REVERSE, status=409)
    with transaction.atomic():
        locked = LedgerTransaction.objects.select_for_update().get(pk=original.pk)
        if LedgerTransaction.objects.filter(reverses=locked).exists():
            raise DomainError(ErrorCode.LEDGER_ALREADY_REVERSED, status=409)
        lines = [(e.account, -e.amount) for e in locked.entries.select_related("account")]
        tx = post(
            TransactionKind.REVERSAL,
            lines,
            description=f"Corecție: {locked.description}",
            actor=actor,
            reason=reason,
            location=locked.location,
            booking_id=locked.booking_id,
            enrollment_id=locked.enrollment_id,
            reverses=locked,
            subject=locked.subject,
            metadata={**locked.metadata, "reversal_of": str(locked.pk)},
        )
        audit.record(
            actor,
            "ledger.reversed",
            target=tx,
            after={"reverses": str(locked.pk), "kind": locked.kind},
            reason=reason,
        )
    return tx
