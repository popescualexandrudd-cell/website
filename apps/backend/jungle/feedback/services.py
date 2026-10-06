"""The client's opinion after the first game (Q71, 06.10.2026; the KPI "NPS" in
`docs/11-marketing/04-kpi.md`).

- `ask_after_first_game`: every morning (`manage.py notifications_daily`), the people who played
  on a court for the first time yesterday (their first court-entry scan, R-031) are asked once:
  "would you recommend us to a friend?" (0–10). Only those who turned on the club's news
  (opt-in, `club` category, Q67): the question is not about a booking or money.
- `answer`: the person answers once, from the account.
- `summary`: for the owner's side (`reports.view`), the NPS of a period: the share of promoters
  (9–10) minus the share of detractors (0–6), rounded half away from zero, plus the counts. Only
  scores are kept, never who gave which one on the summary.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta

from django.db import IntegrityError, transaction
from django.db.models import Min
from django.http import HttpRequest

from jungle.accounts.models import User
from jungle.accounts.services.authz import authorize, current_user
from jungle.attendance.models import Scan, ScanKind
from jungle.core import clock
from jungle.core.errors import DomainError, ErrorCode
from jungle.core.permissions import Action
from jungle.feedback.models import Feedback
from jungle.notifications import services as notifications
from jungle.notifications.catalog import Category

EVENT = "club.feedback"
PROMOTER_FROM = 9
DETRACTOR_TO = 6
MAX_DAYS = 366


def _bounds(day: date) -> tuple[datetime, datetime]:
    start = datetime.combine(day, time(0), tzinfo=clock.BUSINESS_TZ)
    return start, datetime.combine(day + timedelta(days=1), time(0), tzinfo=clock.BUSINESS_TZ)


def ask_after_first_game(today: date | None = None) -> int:
    """Asks the people whose first game on a court was yesterday (club time). Returns how many."""
    start, end = _bounds((today or clock.today_local()) - timedelta(days=1))
    firsts = (
        Scan.objects.filter(kind=ScanKind.COURT_ENTRY)
        .values("user_id")
        .annotate(first=Min("scanned_at"))
        .filter(first__gte=start, first__lt=end)
        .values("user_id")
    )
    people = notifications.opted_in(Category.CLUB).filter(pk__in=firsts, feedback__isnull=True)
    first_scans = (
        Scan.objects.filter(kind=ScanKind.COURT_ENTRY, user__in=people)
        .select_related("user", "location", "booking")
        .order_by("user_id", "scanned_at")
        .distinct("user_id")
    )
    return sum(_ask(scan.user, scan) for scan in first_scans)


def _ask(user: User, scan: Scan) -> int:
    with transaction.atomic():
        try:
            with transaction.atomic():
                feedback = Feedback.objects.create(
                    user=user,
                    location=scan.location,
                    booking=scan.booking,
                    asked_at=clock.now(),
                )
        except IntegrityError:  # asked in the meantime (two runs at once)
            return 0
        language = user.preferred_language
        sent = notifications.notify(
            user,
            EVENT,
            {"url": notifications.account_path(language)},
            subject=str(feedback.pk),
        )
        if not sent:  # no channel left (no email, push off): nothing was asked
            feedback.delete()
            return 0
    return 1


@dataclass(frozen=True)
class State:
    asked: bool
    answered: bool


def state(request: HttpRequest) -> State:
    """Whether the account shows the question (asked, not answered yet)."""
    feedback = Feedback.objects.filter(user=current_user(request)).first()
    return State(asked=feedback is not None, answered=bool(feedback and feedback.score is not None))


def answer(request: HttpRequest, score: int) -> State:
    if not 0 <= score <= 10:
        raise DomainError(ErrorCode.VALIDATION_INVALID, params={"field": "score"})
    user = current_user(request)
    with transaction.atomic():
        feedback = Feedback.objects.select_for_update().filter(user=user).first()
        if feedback is None:
            raise DomainError(ErrorCode.FEEDBACK_NOT_ASKED, status=404)
        if feedback.score is not None:
            raise DomainError(ErrorCode.FEEDBACK_ANSWERED, status=409)
        feedback.score = score
        feedback.answered_at = clock.now()
        feedback.save(update_fields=["score", "answered_at"])
    return State(asked=True, answered=True)


@dataclass(frozen=True)
class Summary:
    first: date
    last: date
    asked: int
    answers: int
    promoters: int
    passives: int
    detractors: int
    nps: int | None  # None while nobody answered


def nps(promoters: int, detractors: int, answers: int) -> int | None:
    """100 × (promoters − detractors) / answers, rounded half away from zero (integers only)."""
    if answers == 0:
        return None
    difference = 100 * (promoters - detractors)
    rounded = (2 * abs(difference) + answers) // (2 * answers)
    return rounded if difference >= 0 else -rounded


def summary(request: HttpRequest, location_id: uuid.UUID, days: int = 90) -> Summary:
    authorize(request, Action.REPORTS_VIEW, location_id)
    if not 1 <= days <= MAX_DAYS:
        raise DomainError(ErrorCode.VALIDATION_INVALID, params={"field": "days"})
    last = clock.today_local()
    first = last - timedelta(days=days - 1)
    start, _ = _bounds(first)
    _, end = _bounds(last)
    asked = Feedback.objects.filter(location_id=location_id, asked_at__gte=start, asked_at__lt=end)
    scores = [s for s in asked.values_list("score", flat=True) if s is not None]
    promoters = sum(1 for s in scores if s >= PROMOTER_FROM)
    detractors = sum(1 for s in scores if s <= DETRACTOR_TO)
    return Summary(
        first=first,
        last=last,
        asked=asked.count(),
        answers=len(scores),
        promoters=promoters,
        passives=len(scores) - promoters - detractors,
        detractors=detractors,
        nps=nps(promoters, detractors, len(scores)),
    )
