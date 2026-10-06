"""Signals for the owner's side of the panel (§10 "detecție de anomalii", Stage 12F).

Each signal is computed here, from the club's own records, with configurable thresholds
(`panel.signals`, Q69); it only points at something worth a look and never decides, blocks or
changes anything (a person looks and acts through the usual modules). Read-only, `reports.view`.

- `league.repeated`: the same four players in many applied matches within a few days (LP farming);
- `league.disputed`: a score disputed and still waiting for the league's director;
- `money.corrections`: many reversing entries by the same person;
- `cash.difference`: a cash count, emptying or day close where the box and the ledger differ;
- `bookings.late_cancellations` / `bookings.no_shows`: the same client again and again.
"""

from __future__ import annotations

import uuid
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any

from django.http import HttpRequest

from jungle.accounts.models import User
from jungle.accounts.services.authz import authorize
from jungle.bookings.models import Booking, BookingStatus, CancellationOutcome
from jungle.checkout.models import CashOperation, OperationKind
from jungle.configuration.services import get_config
from jungle.core import clock
from jungle.core.permissions import Action
from jungle.league.models import LeagueMatch, MatchStatus
from jungle.ledger.models import LedgerTransaction, TransactionKind
from jungle.notifications.services import lei

COUNTED = (OperationKind.COUNT, OperationKind.EMPTY, OperationKind.DAY_CLOSE)


@dataclass(frozen=True)
class Signal:
    kind: str
    # The facts the panel shows next to the kind's text: names, a count, an amount, a time.
    params: dict[str, Any] = field(default_factory=dict)
    at: datetime | None = None


def _names(users: list[User]) -> str:
    return ", ".join(sorted(u.full_name for u in users))


def _repeated(location_id: uuid.UUID, rules: dict[str, Any]) -> list[Signal]:
    days = int(rules["repeat_days"])
    since = clock.now() - timedelta(days=days)
    groups: dict[frozenset[uuid.UUID], list[LeagueMatch]] = defaultdict(list)
    matches = LeagueMatch.objects.filter(
        location_id=location_id, status=MatchStatus.APPLIED, finished_at__gte=since
    ).prefetch_related("players__user")
    for match in matches:
        groups[frozenset(p.user_id for p in match.players.all())].append(match)
    found = []
    for together in groups.values():
        if len(together) >= int(rules["repeat_matches"]):
            players = [p.user for p in together[0].players.all()]
            found.append(
                Signal(
                    "league.repeated",
                    {"names": _names(players), "count": len(together), "days": days},
                    max(m.finished_at for m in together),
                )
            )
    return found


def _disputed(location_id: uuid.UUID) -> list[Signal]:
    matches = LeagueMatch.objects.filter(
        location_id=location_id, status=MatchStatus.DISPUTED
    ).prefetch_related("players__user")
    return [
        Signal(
            "league.disputed",
            {"names": _names([p.user for p in m.players.all()])},
            m.finished_at,
        )
        for m in matches
    ]


def _corrections(location_id: uuid.UUID, since: datetime, rules: dict[str, Any]) -> list[Signal]:
    reversals = LedgerTransaction.objects.filter(
        location_id=location_id, kind=TransactionKind.REVERSAL, created_at__gte=since
    )
    who = Counter(str(t.actor.get("label") or t.actor.get("kind") or "—") for t in reversals)
    return [
        Signal("money.corrections", {"who": person, "count": n, "days": rules["window_days"]})
        for person, n in sorted(who.items())
        if n >= int(rules["corrections"])
    ]


def _cash(location_id: uuid.UUID, since: datetime, rules: dict[str, Any]) -> list[Signal]:
    operations = CashOperation.objects.filter(
        location_id=location_id,
        kind__in=COUNTED,
        completed_at__gte=since,
        difference__isnull=False,
    ).select_related("device", "staff")
    limit = int(rules["cash_difference_bani"])
    found = []
    for op in operations:
        difference = int(op.difference or 0)
        if abs(difference) >= limit:
            sign = "+" if difference > 0 else "−"
            params = {"device": op.device.name, "amount": sign + lei(abs(difference))}
            found.append(
                Signal("cash.difference", params | {"who": op.staff.full_name}, op.completed_at)
            )
    return found


def _clients(location_id: uuid.UUID, since: datetime, rules: dict[str, Any]) -> list[Signal]:
    bookings = Booking.objects.filter(location_id=location_id)
    late = Counter(
        bookings.filter(
            cancellation_outcome=CancellationOutcome.CHARGED, cancelled_at__gte=since
        ).values_list("organizer_id", flat=True)
    )
    absent = Counter(
        bookings.filter(
            status=BookingStatus.NO_SHOW, starts_at__gte=since, starts_at__lt=clock.now()
        ).values_list("organizer_id", flat=True)
    )
    people = {u.pk: u for u in User.objects.filter(pk__in=set(late) | set(absent))}
    found = []
    for kind, counts, needed in (
        ("bookings.late_cancellations", late, int(rules["late_cancellations"])),
        ("bookings.no_shows", absent, int(rules["no_shows"])),
    ):
        for user_id, n in sorted(counts.items(), key=lambda item: people[item[0]].full_name):
            if n >= needed:
                found.append(
                    Signal(
                        kind,
                        {
                            "name": people[user_id].full_name,
                            "count": n,
                            "days": rules["window_days"],
                        },
                    )
                )
    return found


def signals(request: HttpRequest, location_id: uuid.UUID) -> list[Signal]:
    authorize(request, Action.REPORTS_VIEW, location_id)
    rules: dict[str, Any] = dict(get_config("panel.signals"))
    since = clock.now() - timedelta(days=int(rules["window_days"]))
    return [
        *_disputed(location_id),
        *_repeated(location_id, rules),
        *_cash(location_id, since, rules),
        *_corrections(location_id, since, rules),
        *_clients(location_id, since, rules),
    ]
