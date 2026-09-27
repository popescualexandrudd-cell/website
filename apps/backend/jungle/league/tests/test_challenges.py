"""Direct challenges (§6.11, LG-110 … LG-113), issued and answered at the League Kiosk."""

from __future__ import annotations

import uuid
from collections.abc import Callable
from datetime import timedelta
from typing import Any

import pytest
from django.core import mail
from django.test import Client

from jungle.accounts.models import User
from jungle.attendance.models import StaffNotice
from jungle.audit.models import AuditLog
from jungle.audit.services import SYSTEM
from jungle.bookings.models import SessionType
from jungle.cards import services as cards
from jungle.conftest import Api, login_as
from jungle.core import clock
from jungle.core.errors import DomainError
from jungle.devices.models import Device
from jungle.league import challenges, matches
from jungle.league.models import (
    Challenge,
    ChallengeStatus,
    LeagueMatch,
    LeagueSeason,
    MatchKind,
    MatchStatus,
)
from jungle.league.tests.conftest import placed
from jungle.league.tests.test_matches import PRICE, book, kiosk_call, scan
from jungle.ledger import payments
from jungle.ledger.models import PaymentMethod
from jungle.locations.models import Location, Resource, ResourceKind

pytestmark = pytest.mark.django_db

Join = Callable[..., User]


class Club:
    """Two groups of four after placement: pairs (a,b) and (e,f) are Gold I, (c,d) and (g,h)
    two divisions lower."""

    def __init__(self, season: LeagueSeason, join: Join):
        self.season = season
        self.a, self.b, self.c, self.d = placed(season, join)
        self.e, self.f, self.g, self.h = placed(season, join)
        everyone = (self.a, self.b, self.c, self.d, self.e, self.f, self.g, self.h)
        self.cards = {p.pk: cards.issue_card(SYSTEM, p).token for p in everyone}

    def tokens(self, *people: User) -> tuple[str, ...]:
        return tuple(self.cards[p.pk] for p in people)

    def challenge(self, by: tuple[User, ...], of: tuple[User, ...], device: Device) -> Challenge:
        return challenges.issue(
            kiosk_call(),
            device,
            challenges.ChallengeData(self.tokens(*by), tuple(p.pk for p in of)),
        )


@pytest.fixture
def club(season: LeagueSeason, join: Join, now: Any) -> Club:
    built = Club(season, join)
    now.move_to("2027-04-06T13:00:00+03:00", tick=False)
    return built


def refused(exc: pytest.ExceptionInfo[DomainError]) -> tuple[str, int]:
    return exc.value.code.value, exc.value.status


def test_lg110_lg113_a_challenge_from_the_kiosk_to_the_court(
    club: Club,
    kiosk: Device,
    now: Any,
    location: Location,
    django_capture_on_commit_callbacks: Any,
) -> None:
    with django_capture_on_commit_callbacks(execute=True):
        challenge = club.challenge((club.e, club.f), (club.a, club.b), kiosk)
    assert (challenge.ladder, challenge.status) == ("pairs", ChallengeStatus.PENDING)
    assert challenge.respond_by == clock.now() + timedelta(hours=72)
    assert sorted(m.to[0] for m in mail.outbox) == sorted(str(p.email) for p in (club.a, club.b))
    assert "te-au provocat" in mail.outbox[0].body

    with pytest.raises(DomainError) as exc:
        challenges.answer(kiosk_call(), kiosk, challenge.pk, club.cards[club.e.pk], True)
    assert refused(exc) == ("league.challenge_not_target", 403)
    challenges.answer(kiosk_call(), kiosk, challenge.pk, club.cards[club.b.pk], True)
    challenge.refresh_from_db()
    assert challenge.status == ChallengeStatus.ACCEPTED and challenge.responded_by == club.b
    assert challenge.play_by is not None and (challenge.play_by - clock.now()).days == 7

    court = Resource.objects.create(
        location=location, slug="teren-3", name="Teren 3", kind=ResourceKind.PADEL_COURT
    )
    booking = book(
        court,
        club.e,
        "2027-04-07 18:00",
        "2027-04-07 19:30",
        session_type=SessionType.CHALLENGE,
    )
    for player in (club.a, club.b, club.e, club.f):
        scan(booking, player)
    payments.pay(
        SYSTEM,
        payments.due_for_booking(booking),
        payments.PaymentData(
            payer_id=club.e.pk,
            amount=PRICE,
            method=PaymentMethod.CASH,
            tendered=PRICE,
            idempotency_key="challenge-booking",
        ),
    )
    now.move_to("2027-04-07T19:35:00+03:00")
    match = matches.propose(
        kiosk_call(),
        kiosk,
        matches.Proposal(
            booking_id=booking.pk,
            card_token=club.cards[club.a.pk],
            team_a=(club.a.pk, club.b.pk),
            team_b=(club.e.pk, club.f.pk),
            score={"sets": [{"a": 3, "b": 6}, {"a": 4, "b": 6}]},
        ),
    )
    assert match.kind == MatchKind.CHALLENGE and match.challenge == challenge
    for player in (club.b, club.e, club.f):
        matches.respond(kiosk_call(), kiosk, match.pk, club.cards[player.pk], True)
    match.refresh_from_db()
    assert match.status == MatchStatus.APPLIED and match.event is not None
    assert (
        match.event.payload["challenger"] == "b"
        and match.event.payload["match_type"] == "challenge"
    )
    challenge.refresh_from_db()
    assert challenge.status == ChallengeStatus.PLAYED


def test_lg110_only_the_same_division_or_one_above(club: Club, kiosk: Device) -> None:
    for by, of in (
        ((club.c, club.d), (club.a, club.b)),  # two divisions above
        ((club.a, club.b), (club.c, club.d)),  # below
    ):
        with pytest.raises(DomainError) as exc:
            club.challenge(by, of, kiosk)
        assert refused(exc) == ("league.challenge_not_allowed", 400)
    with pytest.raises(DomainError) as exc:  # singles: nobody has finished placement
        club.challenge((club.a,), (club.e,), kiosk)
    assert refused(exc) == ("league.challenge_not_ranked", 400)
    with pytest.raises(DomainError) as exc:  # a pair that never played together
        club.challenge((club.a, club.e), (club.b, club.f), kiosk)
    assert refused(exc) == ("league.challenge_not_ranked", 400)


def test_challenge_input_errors(club: Club, kiosk: Device, make_user: Callable[..., User]) -> None:
    outsider = make_user(first_name="Ion", last_name="Străin")
    attempts: list[tuple[tuple[str, ...], tuple[Any, ...], tuple[str, int]]] = [
        (club.tokens(club.e, club.f), (club.a.pk,), ("league.team_size", 400)),
        (club.tokens(club.e, club.f), (club.a.pk, club.e.pk), ("league.duplicate_player", 400)),
        (
            club.tokens(club.e, club.f),
            (club.a.pk, outsider.pk),
            ("league.player_not_in_league", 403),
        ),
        (club.tokens(club.e, club.f), (club.a.pk, uuid.uuid4()), ("league.unknown_player", 404)),
        (
            club.tokens(club.e, club.f, club.g),
            (club.a.pk, club.b.pk, club.c.pk),
            ("league.team_size", 400),
        ),
    ]
    for tokens, targets, expected in attempts:
        with pytest.raises(DomainError) as exc:
            challenges.issue(kiosk_call(), kiosk, challenges.ChallengeData(tokens, targets))
        assert refused(exc) == expected
    club.challenge((club.e, club.f), (club.a, club.b), kiosk)
    for by, of in (((club.e, club.f), (club.a, club.b)), ((club.a, club.b), (club.e, club.f))):
        with pytest.raises(DomainError) as exc:
            club.challenge(by, of, kiosk)
        assert refused(exc) == ("league.challenge_exists", 409)


def test_invariant_2_challenges_only_at_the_kiosk(club: Club, kiosk: Device) -> None:
    with pytest.raises(DomainError) as exc:
        club.challenge((club.e, club.f), (club.a, club.b), None)  # type: ignore[arg-type]
    assert refused(exc) == ("league.score_kiosk_only", 403)
    challenge = club.challenge((club.e, club.f), (club.a, club.b), kiosk)
    with pytest.raises(DomainError) as exc:
        challenges.answer(kiosk_call("8.8.8.8"), kiosk, challenge.pk, club.cards[club.a.pk], True)
    assert refused(exc) == ("league.score_kiosk_only", 403)
    assert AuditLog.objects.filter(action="league.score_refused").count() == 2
    with pytest.raises(DomainError) as exc:
        challenges.answer(kiosk_call(), kiosk, uuid.uuid4(), club.cards[club.a.pk], True)
    assert refused(exc) == ("league.challenge_not_found", 404)


@pytest.mark.parametrize("policy", ["nothing", "technical_loss"])
def test_lg111_two_refusals_a_season_then_the_admins_policy(
    club: Club, kiosk: Device, policy: str
) -> None:
    LeagueSeason.objects.filter(pk=club.season.pk).update(
        config={"challenge_third_refusal": policy}
    )
    outcomes = []
    for _ in range(3):
        challenge = club.challenge((club.e, club.f), (club.a, club.b), kiosk)
        challenges.answer(kiosk_call(), kiosk, challenge.pk, club.cards[club.a.pk], False)
        challenge.refresh_from_db()
        assert challenge.status == ChallengeStatus.REFUSED
        outcomes.append(challenge.refusal_outcome)
    third = "technical_loss" if policy == "technical_loss" else "recorded"
    assert outcomes == ["allowed", "allowed", third]
    notices = StaffNotice.objects.filter(kind=challenges.NOTICE_TECHNICAL_LOSS)
    assert notices.count() == (1 if policy == "technical_loss" else 0)
    with pytest.raises(DomainError) as exc:  # already answered
        challenges.answer(kiosk_call(), kiosk, challenge.pk, club.cards[club.a.pk], True)
    assert refused(exc) == ("league.challenge_not_found", 409)


def test_lg111_lg112_deadlines(club: Club, kiosk: Device, now: Any) -> None:
    unanswered = club.challenge((club.e, club.f), (club.a, club.b), kiosk)
    accepted = club.challenge((club.g, club.h), (club.c, club.d), kiosk)
    challenges.answer(kiosk_call(), kiosk, accepted.pk, club.cards[club.c.pk], True)
    now.move_to("2027-04-09T13:00:00+03:00")  # 72 hours later
    with pytest.raises(DomainError) as exc:
        challenges.answer(kiosk_call(), kiosk, unanswered.pk, club.cards[club.a.pk], True)
    assert refused(exc) == ("league.challenge_not_found", 409)
    assert challenges.expire_challenges() == challenges.ChallengeExpiry(1, 0)
    unanswered.refresh_from_db()
    assert (unanswered.status, unanswered.refusal_outcome) == ("expired", "allowed")
    now.move_to("2027-04-13T13:01:00+03:00")  # 7 days after the acceptance
    assert challenges.expire_challenges() == challenges.ChallengeExpiry(0, 1)
    accepted.refresh_from_db()
    assert (accepted.status, accepted.refusal_outcome) == ("expired", "")


def test_a_challenge_booking_needs_an_accepted_challenge(
    club: Club, kiosk: Device, now: Any, location: Location
) -> None:
    court = Resource.objects.create(
        location=location, slug="teren-4", name="Teren 4", kind=ResourceKind.PADEL_COURT
    )
    booking = book(
        court, club.a, "2027-04-06 14:00", "2027-04-06 15:00", session_type=SessionType.CHALLENGE
    )
    for player in (club.a, club.b, club.e, club.f):
        scan(booking, player)
    now.move_to("2027-04-06T15:05:00+03:00")
    with pytest.raises(DomainError) as exc:
        matches.propose(
            kiosk_call(),
            kiosk,
            matches.Proposal(
                booking_id=booking.pk,
                card_token=club.cards[club.a.pk],
                team_a=(club.a.pk, club.b.pk),
                team_b=(club.e.pk, club.f.pk),
                score={"sets": [{"a": 6, "b": 3}, {"a": 6, "b": 4}]},
            ),
        )
    assert refused(exc) == ("league.challenge_required", 400)
    assert not LeagueMatch.objects.exists()


def test_players_see_their_challenges(api: Api, client: Client, club: Club, kiosk: Device) -> None:
    challenge = club.challenge((club.e, club.f), (club.a, club.b), kiosk)
    login_as(client, club.a, mfa=False)
    mine = api.get("/league/me/challenges").json()
    assert [(c["id"], c["status"], c["mine"]) for c in mine] == [
        (str(challenge.pk), "pending", "target")
    ]
    assert [p["last_name"] for p in mine[0]["challengers"]] == sorted(
        [club.e.last_name, club.f.last_name]
    )
    assert str(challenge).startswith("Așteaptă răspunsul")
    login_as(client, club.e, mfa=False)
    assert api.get("/league/me/challenges").json()[0]["mine"] == "challenger"
    login_as(client, club.g, mfa=False)
    assert api.get("/league/me/challenges").json() == []
