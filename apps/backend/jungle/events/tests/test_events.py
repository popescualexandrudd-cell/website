"""R-110, §9.2.12: the club's public calendar, managed from the panel, joined with the league's
tournaments (§6.14) on the website. The club clock: Monday 15.03.2027, 09:00 (conftest `club`)."""

from __future__ import annotations

from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from typing import Any

import pytest

from jungle.accounts.models import User
from jungle.audit.models import AuditLog
from jungle.configuration import web
from jungle.conftest import Api, error_code, grant, login_as
from jungle.core.permissions import Role
from jungle.events import services
from jungle.events.models import ClubEvent, EventKind
from jungle.league.models import (
    EntryStatus,
    LeagueSeason,
    SeasonStatus,
    Tournament,
    TournamentEntry,
    TournamentStatus,
)
from jungle.locations.models import Location, Resource, ResourceKind
from jungle.pricing.models import Band, PriceRate

pytestmark = pytest.mark.django_db

STAFF = "/staff/club-events"
CALENDAR = "/events/calendar?location=jungle-padel"


def body(location: Location | None = None, **changes: Any) -> dict[str, Any]:
    fields: dict[str, Any] = {
        "kind": EventKind.DJ_NIGHT,
        "title_ro": "Seară cu DJ",
        "title_en": "DJ night",
        "text_ro": "Muzică pe terenuri.",
        "text_en": "Music on the courts.",
        "starts_at": "2027-03-19T20:00:00+02:00",
        "ends_at": "2027-03-19T23:00:00+02:00",
    }
    if location is not None:
        fields["location_id"] = str(location.id)
    return {**fields, **changes}


@pytest.fixture
def refreshes(monkeypatch: pytest.MonkeyPatch) -> list[list[str]]:
    """The website refreshes the backend asked for (`configuration.web`)."""
    asked: list[list[str]] = []
    monkeypatch.setattr(web, "revalidate_after_commit", asked.append)
    return asked


@pytest.fixture
def manager(club: Any, staff: Callable[..., User]) -> User:
    return staff(Role.MANAGER, club.location)


def create(api: Api, location: Location, **changes: Any) -> dict[str, Any]:
    response = api.post(STAFF, body(location, **changes))
    assert response.status_code == 201, response.content
    return dict(response.json())


def calendar(api: Api) -> list[dict[str, Any]]:
    response = api.get(CALENDAR)
    assert response.status_code == 200
    return list(response.json()["items"])


def season_of(location: Location) -> LeagueSeason:
    return LeagueSeason.objects.create(
        location=location, number=1, name="Sezonul 1", status=SeasonStatus.ACTIVE,
        starts_at="2027-03-01T00:00:00Z", ends_at="2027-06-01T00:00:00Z", config={},
    )  # fmt: skip


def tournament(
    location: Location, season: LeagueSeason, name: str, starts: str, **fields: Any
) -> Tournament:
    values: dict[str, Any] = {
        "format": "americano",
        "team_size": 2,
        "registration_closes_at": datetime.fromisoformat(starts) - timedelta(days=1),
        "entry_fee": 5000,
        "max_entries": 8,
        "created_at": datetime(2027, 3, 1, tzinfo=UTC),
        **fields,
    }
    return Tournament.objects.create(
        season=season, location=location, name=name, starts_at=starts, **values
    )


def test_r110_an_event_reaches_the_website_only_once_published(
    api: Api, club: Any, manager: User, refreshes: list[list[str]]
) -> None:
    draft = create(api, club.location)
    assert draft["published"] is False and draft["cancelled_at"] is None
    assert calendar(api) == [] and refreshes == []  # a draft: nothing for the visitors
    response = api.post(f"{STAFF}/{draft['id']}/publication", {"published": True, "reason": "gata"})
    assert response.status_code == 200 and response.json()["published"] is True
    assert refreshes == [["events"]]
    [item] = calendar(api)
    assert item == {
        "id": draft["id"],
        "kind": "dj_night",
        "title_ro": "Seară cu DJ",
        "title_en": "DJ night",
        "text_ro": "Muzică pe terenuri.",
        "text_en": "Music on the courts.",
        "starts_at": "2027-03-19T18:00:00Z",
        "ends_at": "2027-03-19T21:00:00Z",
        "cancelled": False,
        "demo": False,
        "tournament": None,
    }
    # withdrawn: gone from the website at once
    api.post(f"{STAFF}/{draft['id']}/publication", {"published": False, "reason": "amânat"})
    assert calendar(api) == [] and refreshes == [["events"], ["events"]]
    actions = list(
        AuditLog.objects.filter(target_id=draft["id"])
        .order_by("id")
        .values_list("action", "reason")
    )
    assert actions == [
        ("club_event.created", ""),
        ("club_event.published", "gata"),
        ("club_event.withdrawn", "amânat"),
    ]


def test_r110_published_at_once_and_changed_with_a_reason(
    api: Api, club: Any, manager: User, refreshes: list[list[str]]
) -> None:
    event = create(api, club.location, published=True, title_ro="  Seară cu DJ  ")
    assert event["title_ro"] == "Seară cu DJ" and refreshes == [["events"]]
    changed = api.put(
        f"{STAFF}/{event['id']}",
        body(kind="social", title_ro="Americano", title_en="Americano", text_ro="", text_en="",
             starts_at="2027-03-20T10:00:00+02:00", ends_at="2027-03-20T13:00:00+02:00",
             reason="altă zi"),
    )  # fmt: skip
    assert changed.status_code == 200, changed.content
    assert changed.json()["kind"] == "social" and refreshes == [["events"], ["events"]]
    [item] = calendar(api)
    assert (item["title_ro"], item["starts_at"]) == ("Americano", "2027-03-20T08:00:00Z")
    log = AuditLog.objects.get(target_id=event["id"], action="club_event.changed")
    assert log.reason == "altă zi"
    assert log.before is not None and log.before["title_ro"] == "Seară cu DJ"
    assert log.after is not None and log.after["kind"] == "social"


def test_r110_a_draft_changes_without_refreshing_the_website(
    api: Api, club: Any, manager: User, refreshes: list[list[str]]
) -> None:
    event = create(api, club.location)
    response = api.put(f"{STAFF}/{event['id']}", body(title_ro="Seară cu DJ și lumini"))
    assert response.status_code == 200 and refreshes == []


def test_r110_times_and_titles_are_checked(
    api: Api, club: Any, manager: User, time_machine: Any
) -> None:
    def refused(**changes: Any) -> str:
        response = api.post(STAFF, body(club.location, **changes))
        assert response.status_code == 422, response.content
        return error_code(response)

    assert refused(ends_at="2027-03-19T20:00:00+02:00") == "events.invalid_time"
    assert refused(ends_at="2027-03-20T20:30:00+02:00") == "events.invalid_time"  # over 24 h
    assert refused(starts_at="2027-03-15T08:00:00+02:00", ends_at="2027-03-15T10:00:00+02:00") == (
        "events.invalid_time"  # already started
    )
    assert refused(title_en="   ") == "validation.invalid"
    assert refused(kind="parkour") == "validation.invalid"
    assert refused(starts_at="2027-03-19T20:00:00") == "validation.invalid"  # no offset
    # a full day is fine
    assert (
        api.post(STAFF, body(club.location, ends_at="2027-03-20T20:00:00+02:00")).status_code == 201
    )

    event = create(api, club.location)
    moved_back = body(starts_at="2027-03-14T20:00:00+02:00", ends_at="2027-03-14T23:00:00+02:00")
    response = api.put(f"{STAFF}/{event['id']}", moved_back)
    assert response.status_code == 422 and error_code(response) == "events.invalid_time"
    # once it has started, its text can still be corrected (the time stays)
    time_machine.move_to("2027-03-19T21:00:00+02:00", tick=False)
    fixed = api.put(f"{STAFF}/{event['id']}", body(text_ro="Muzică pe terenuri, până la 23."))
    assert fixed.status_code == 200 and fixed.json()["text_ro"].endswith("până la 23.")


def test_r110_a_cancelled_event_stays_marked_until_its_end(
    api: Api, club: Any, manager: User, time_machine: Any, refreshes: list[list[str]]
) -> None:
    event = create(api, club.location, published=True)
    url = f"{STAFF}/{event['id']}"
    assert api.post(f"{url}/cancel", {"reason": ""}).status_code == 422
    blank = api.post(f"{url}/cancel", {"reason": "   "})
    assert blank.status_code == 422 and error_code(blank) == "validation.invalid"
    cancelled = api.post(f"{url}/cancel", {"reason": "DJ bolnav"})
    assert cancelled.status_code == 200
    assert cancelled.json()["cancel_reason"] == "DJ bolnav" and cancelled.json()["cancelled_at"]
    assert refreshes == [["events"], ["events"]]
    [item] = calendar(api)
    assert item["cancelled"] is True
    for response in (
        api.post(f"{url}/cancel", {"reason": "din nou"}),
        api.put(url, body(reason="încă o dată")),
        api.post(f"{url}/publication", {"published": False}),
    ):
        assert response.status_code == 409 and error_code(response) == "events.already_cancelled"
    time_machine.move_to("2027-03-19T23:00:00+02:00", tick=False)
    assert calendar(api) == []  # over: off the calendar
    # a cancelled draft never asks the website for anything
    draft = create(api, club.location, starts_at="2027-03-26T20:00:00+02:00",
                   ends_at="2027-03-26T23:00:00+02:00")  # fmt: skip
    api.post(f"{STAFF}/{draft['id']}/cancel", {"reason": "nu mai are loc"})
    assert refreshes == [["events"], ["events"]]


def test_r110_only_the_event_managers_of_the_club(
    api: Api, club: Any, staff: Callable[..., User], make_user: Callable[..., User], client: Any
) -> None:
    assert api.get(f"{STAFF}?location_id={club.location.id}").status_code == 401
    staff(Role.RECEPTION, club.location)
    assert api.post(STAFF, body(club.location)).status_code == 403
    elsewhere = Location.objects.create(slug="alt-club", name="Alt club")
    staff(Role.MANAGER, elsewhere)
    assert api.post(STAFF, body(club.location)).status_code == 403
    staff(Role.MANAGER, club.location, mfa=False)
    response = api.post(STAFF, body(club.location))
    assert response.status_code == 403 and error_code(response) == "auth.mfa_required"
    admin = staff(Role.ADMIN)
    missing = api.post(STAFF, {**body(), "location_id": "00000000-0000-0000-0000-000000000000"})
    assert missing.status_code == 404 and error_code(missing) == "locations.not_found"
    event = create(api, club.location)
    for response in (
        api.put(f"{STAFF}/00000000-0000-0000-0000-000000000000", body()),
        api.post(f"{STAFF}/00000000-0000-0000-0000-000000000000/cancel", {"reason": "x"}),
    ):
        assert response.status_code == 404 and error_code(response) == "events.event_not_found"
    # the manager of another club cannot touch this club's event
    other = make_user()
    grant(other, Role.MANAGER, elsewhere)
    login_as(client, other)
    assert api.post(f"{STAFF}/{event['id']}/cancel", {"reason": "nu e al meu"}).status_code == 403
    login_as(client, admin)
    assert ClubEvent.objects.get(pk=event["id"]).cancelled_at is None


def test_r110_the_panel_lists_what_is_coming_and_the_last_month(
    api: Api, club: Any, manager: User, time_machine: Any, client: Any
) -> None:
    old = create(api, club.location, title_ro="Vechi")
    recent = create(api, club.location, title_ro="Recent", starts_at="2027-03-26T20:00:00+02:00",
                    ends_at="2027-03-26T23:00:00+02:00")  # fmt: skip
    coming = create(api, club.location, title_ro="Urmează", starts_at="2027-05-01T20:00:00+03:00",
                    ends_at="2027-05-01T23:00:00+03:00")  # fmt: skip
    time_machine.move_to("2027-04-20T12:00:00+03:00", tick=False)
    login_as(client, manager)  # a month later: a new session
    response = api.get(f"{STAFF}?location_id={club.location.id}")
    assert response.status_code == 200
    assert [e["id"] for e in response.json()] == [recent["id"], coming["id"]]
    assert old["id"] not in {e["id"] for e in response.json()}


def test_r110_the_calendar_joins_the_leagues_open_tournaments_in_time_order(
    api: Api, club: Any, manager: User, make_user: Callable[..., User]
) -> None:
    season = season_of(club.location)
    open_one = tournament(club.location, season, "Cupa de primăvară", "2027-03-20T10:00:00+02:00")
    player = make_user()
    TournamentEntry.objects.create(
        tournament=open_one, player_a=player, registered_at=season.starts_at
    )
    TournamentEntry.objects.create(
        tournament=open_one, player_a=make_user(), registered_at=season.starts_at,
        status=EntryStatus.WITHDRAWN,
    )  # fmt: skip
    running = tournament(club.location, season, "Turneul de azi", "2027-03-15T08:00:00+02:00",
                         status=TournamentStatus.IN_PROGRESS)  # fmt: skip
    # never on the calendar: over, cancelled, not started yet but its day has passed, too far
    tournament(club.location, season, "Încheiat", "2027-03-10T10:00:00+02:00",
               status=TournamentStatus.FINISHED)  # fmt: skip
    tournament(club.location, season, "Anulat", "2027-03-21T10:00:00+02:00",
               status=TournamentStatus.CANCELLED)  # fmt: skip
    tournament(club.location, season, "Uitat", "2027-03-14T10:00:00+02:00")
    tournament(club.location, season, "Departe", "2027-08-01T10:00:00+03:00")
    dj = create(api, club.location, published=True)

    items = calendar(api)
    assert [i["title_ro"] for i in items] == ["Turneul de azi", "Seară cu DJ", "Cupa de primăvară"]
    assert items[0]["id"] == str(running.id) and items[0]["ends_at"] is None
    assert items[1]["id"] == dj["id"]
    cup = items[2]
    assert (cup["kind"], cup["title_en"], cup["text_ro"]) == ("tournament", "Cupa de primăvară", "")
    assert cup["tournament"] == {
        "format": "americano",
        "status": "registration",
        "registration_closes_at": "2027-03-19T08:00:00Z",
        "places_left": 7,
    }


def test_r110_the_calendar_looks_four_months_ahead_and_shows_thirty(
    club: Any, manager: User
) -> None:
    start = datetime(2027, 3, 16, 18, 0, tzinfo=UTC)
    for n in range(32):
        ClubEvent.objects.create(
            location=club.location, kind=EventKind.CLUB, title_ro=f"E{n}", title_en=f"E{n}",
            starts_at=start + timedelta(days=n), ends_at=start + timedelta(days=n, hours=2),
            published=True, is_demo=n == 0,
        )  # fmt: skip
    ClubEvent.objects.create(
        location=club.location, kind=EventKind.CLUB, title_ro="Prea departe", title_en="Too far",
        starts_at=start + timedelta(days=121), ends_at=start + timedelta(days=121, hours=2),
        published=True,
    )  # fmt: skip
    shown = services.calendar(club.location)
    assert len(shown.items) == 30 and shown.items[0].demo is True
    assert [i.title_ro for i in shown.items[:3]] == ["E0", "E1", "E2"]
    assert str(ClubEvent.objects.first()).startswith("E0 (2027-03-16 18:00 UTC)")


def test_r110_the_event_room_with_its_cheapest_hour(api: Api, club: Any) -> None:
    room = api.get(CALENDAR).json()["room"]
    assert room == {"capacity": 20, "price_per_hour": 20000, "provisional": True}
    rate = PriceRate.objects.get(resource_kind=ResourceKind.EVENT_ROOM, band=Band.OFF_PEAK)
    rate.amount_per_half_hour, rate.marker = 7500, "confirmed"
    rate.save()
    assert services.room_of(club.location) == services.EventRoom(20, 15000, False)
    PriceRate.objects.filter(resource_kind=ResourceKind.EVENT_ROOM).delete()
    assert services.room_of(club.location) == services.EventRoom(20, None, False)
    Resource.objects.filter(kind=ResourceKind.EVENT_ROOM).update(is_active=False)
    assert api.get(CALENDAR).json()["room"] is None


def test_r110_an_unknown_club_has_no_calendar(api: Api, club: Any) -> None:
    response = api.get("/events/calendar?location=nu-exista")
    assert response.status_code == 404 and error_code(response) == "locations.not_found"


def test_s11_a_new_event_reaches_only_those_who_asked_for_the_clubs_news(
    api: Api,
    club: Any,
    manager: User,
    make_user: Callable[..., User],
    refreshes: list[list[str]],
    time_machine: Any,
    django_capture_on_commit_callbacks: Any,
) -> None:
    from django.core import mail

    from jungle.notifications.models import Preference

    fan_ro, fan_en, quiet = make_user(), make_user(preferred_language="en"), make_user()
    for fan in (fan_ro, fan_en):
        Preference.objects.create(user=fan, category="club", channel="email", enabled=True)
    Preference.objects.create(user=quiet, category="club", channel="email", enabled=False)

    def sent() -> list[tuple[str, str]]:
        return [
            (m.to[0], str(m.subject)) for m in mail.outbox if m.subject.startswith(("Nou", "New"))
        ]

    with django_capture_on_commit_callbacks(execute=True):
        draft = create(api, club.location)
    assert sent() == []  # a draft is not news
    url = f"{STAFF}/{draft['id']}/publication"
    with django_capture_on_commit_callbacks(execute=True):
        api.post(url, {"published": True, "reason": "gata"})
        api.post(url, {"published": False, "reason": "amânat"})
        api.post(url, {"published": True, "reason": "din nou"})  # once per event
    assert sorted(sent()) == sorted(
        [
            (str(fan_ro.email), "Nou la Jungle Padel: Seară cu DJ"),
            (str(fan_en.email), "New at Jungle Padel: DJ night"),
        ]
    )
    ro = next(m.body for m in mail.outbox if m.to == [fan_ro.email])
    assert "Seară cu DJ, 19.03.2027 20:00. Muzică pe terenuri." in ro
    assert "https://www.example.test/ro/evenimente" in ro

    # demo events and events already over are not announced
    with django_capture_on_commit_callbacks(execute=True):
        demo = create(api, club.location, title_ro="Demo", title_en="Demo")
        ClubEvent.objects.filter(pk=demo["id"]).update(is_demo=True)
        api.post(f"{STAFF}/{demo['id']}/publication", {"published": True, "reason": "demo"})
        late = create(api, club.location, title_ro="Târziu", title_en="Late")
        time_machine.move_to("2027-03-20T09:00:00+02:00")
        api.post(f"{STAFF}/{late['id']}/publication", {"published": True, "reason": "târziu"})
    assert len(sent()) == 2
