"""DEMO data for the court and lobby screens (Stage 9), with the example of §8.5, names
included: on "Teren 4", an official league match now (90 minutes, 47 minutes left when it
starts on the hour), four players in the league with the ranks, LP and levels of the example,
the Match of the day, then a training session; an enrolled court screen for that court and a
lobby screen. Everything is marked demo; refused in staging and production.

The four players enter the demo season's starting state with those values (like players coming
from a previous season); the season is then recomputed from zero, so standings and history
stay consistent (§6.16). Prints (or writes to `--output`) the screens' tokens as JSON.
"""

from __future__ import annotations

import json
from dataclasses import replace
from datetime import date, timedelta
from decimal import Decimal
from pathlib import Path
from typing import Any

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError, CommandParser
from django.db import IntegrityError, transaction
from django.test import RequestFactory
from jungle_league.engine import Competitor, Ladder
from jungle_league.levels import mu_from_level
from jungle_league.ranks import RankState
from jungle_league.rating import Rating

from jungle.accounts.models import AccountType, User
from jungle.accounts.services.authz import MFA_SESSION_KEY
from jungle.attendance.models import Scan, ScanKind
from jungle.audit.services import SYSTEM
from jungle.bookings.models import Booking, BookingStatus, SessionType
from jungle.cards import services as cards
from jungle.checkout.management.commands.payments_demo import Command as PaymentsDemo
from jungle.core import clock
from jungle.core.errors import DomainError
from jungle.devices.models import Device, DeviceKind
from jungle.league import state as state_json
from jungle.league import store
from jungle.league.management.commands.kiosk_demo import MANAGER_EMAIL
from jungle.league.management.commands.kiosk_demo import Command as KioskDemo
from jungle.league.models import LeagueSeason, LevelQuestionnaire, MatchOfTheDay
from jungle.locations.models import Location, Resource, ResourceKind
from jungle.privacy import league_consent

COURT = "Teren 4"
# §8.5, exactly: surname, first names, rank index (Bronze IV = 0 … Diamond I = 19), LP, level.
PLAYERS = [
    ("Popescu", "Alexandru Daniel", 18, 67, 5.2),  # Diamant II
    ("Moșteanu", "Rareș", 17, 12, 5.0),  # Diamant III
    ("Jucător", "3", 15, 88, 4.8),  # Platină I
    ("Jucător", "4", 16, 40, 4.9),  # Diamant IV
]
DEVICES = [("Ecran Teren 4 DEMO", True), ("Ecran lobby DEMO", False)]


def email_of(index: int) -> str:
    return f"ecrane-demo-{index + 1}@demo.invalid"


class Command(BaseCommand):
    help = "DEMO: the court and lobby screens with the example of §8.5 (not in production)."

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument("--court-key", default="", help="the court screen's bridge key")
        parser.add_argument("--lobby-key", default="", help="the lobby screen's bridge key")
        parser.add_argument("--output", default="", help="write the JSON here instead of stdout")
        parser.add_argument(
            "--rental",
            default="",
            help="only: a DEMO rental starting now on this court (to see the screens change live)",
        )

    def handle(self, *args: Any, **options: Any) -> None:
        if settings.IS_PRODUCTION_LIKE:
            raise CommandError("screens_demo is for development and demos only")
        location = Location.objects.filter(slug="jungle-padel").first()
        manager = User.objects.filter(email=MANAGER_EMAIL).first()
        court = Resource.objects.filter(
            location=location, name=COURT, kind=ResourceKind.PADEL_COURT
        ).first()
        if location is None or manager is None or court is None:
            raise CommandError("run `seed_initial --demo` first")
        keys = [str(options["court_key"]).strip(), str(options["lobby_key"]).strip()]
        try:
            with transaction.atomic():
                if options["rental"]:
                    result = self._rental(location, str(options["rental"]))
                else:
                    result = self._prepare(location, manager, court, keys)
        except DomainError as exc:
            raise CommandError(f"screens_demo: {exc.code.value}") from exc
        text = json.dumps(result, ensure_ascii=False, indent=2)
        if options["output"]:
            Path(options["output"]).write_text(text + "\n", encoding="utf-8")
        else:
            self.stdout.write(text)
        self.stderr.write(self.style.WARNING("Date DEMO pentru ecrane (marcate DEMO)."))

    # ------------------------------------------------------------ steps
    def _prepare(
        self, location: Location, manager: User, court: Resource, keys: list[str]
    ) -> dict[str, Any]:
        staff = RequestFactory().post("/", REMOTE_ADDR="127.0.0.1")
        staff.user = manager
        staff.session = {MFA_SESSION_KEY: True}  # type: ignore[assignment]
        season = KioskDemo()._season(location, staff)
        players = [
            self._player(i, surname, first) for i, (surname, first, *_) in enumerate(PLAYERS)
        ]
        self._seed_ranks(season, players)
        kiosk = Device.objects.filter(
            location=location, kind=DeviceKind.LEAGUE_KIOSK, is_active=True
        ).first() or Device.objects.create(
            location=location, kind=DeviceKind.LEAGUE_KIOSK, name="Chioșc Ligă DEMO"
        )
        signing = RequestFactory().post("/", REMOTE_ADDR="127.0.0.1")
        for player in players:
            if league_consent.status(player, "ro").signed is False:
                league_consent.sign(signing, player, kiosk, "ro")
        booking = self._match(location, court, players, manager)
        screens = []
        for (name, on_court), key in zip(DEVICES, keys, strict=True):
            device, token = PaymentsDemo()._device(location, DeviceKind.SCREEN, name, key)
            device.resource = court if on_court else None
            device.save(update_fields=["resource"])
            screens.append({"device_id": str(device.pk), "device_token": token})
        return {
            "court": screens[0],
            "lobby": screens[1],
            "booking": {
                "id": str(booking.pk),
                "court": court.name,
                # The screen shows the next booking of today only (§8.5): after 23:00 the
                # training that follows the demo match starts tomorrow.
                "next_today": clock.local(booking.ends_at).date() == clock.today_local(),
            },
            "players": [f"{p.last_name} {p.first_name}" for p in players],
        }

    def _rental(self, location: Location, court_name: str) -> dict[str, Any]:
        """A DEMO rental from the current half hour, for an hour: the screens hear the change
        at once (after the commit) and show the court busy."""
        court = Resource.objects.filter(
            location=location, name=court_name, kind=ResourceKind.PADEL_COURT
        ).first()
        organizer = User.objects.filter(email=email_of(0)).first()
        if court is None or organizer is None:
            raise CommandError("run screens_demo first, with a court of the club")
        now = clock.now()
        start = now.replace(minute=now.minute - now.minute % 30, second=0, microsecond=0)
        try:
            with transaction.atomic():
                booking = Booking.objects.create(
                    location=location,
                    resource=court,
                    organizer=organizer,
                    created_by=organizer,
                    starts_at=start,
                    ends_at=start + timedelta(minutes=60),
                    session_type=SessionType.FREE_RENTAL,
                    price_total=0,
                )
        except IntegrityError as exc:
            raise CommandError(f"{court.name} is taken now") from exc
        return {"booking": {"id": str(booking.pk), "court": court.name}}

    def _player(self, index: int, surname: str, first: str) -> User:
        email = email_of(index)
        user = User.objects.filter(email=email).first()
        if user is None:
            user = User.objects.create_user(
                email,
                None,
                first_name=first,
                last_name=surname,
                date_of_birth=date(1990, 1, 1),
                account_type=AccountType.FULL,
                is_demo=True,
            )
        level = Decimal(str(PLAYERS[index][4]))
        if not LevelQuestionnaire.objects.filter(user=user, validated_at__isnull=False).exists():
            LevelQuestionnaire.objects.create(
                user=user,
                answers={"demo": True},
                estimated_level=level,
                submitted_at=clock.now(),
                validated_level=level,
                validated_at=clock.now(),
            )
        if cards.active_card(user) is None:
            cards.issue_card(SYSTEM, user, reason="Card DEMO")
        return user

    def _seed_ranks(self, season: LeagueSeason, players: list[User]) -> None:
        """The example's ranks, LP and levels as the season's starting state (§6.16)."""
        config = store.config_for(season)
        base = state_json.from_json(season.base_state or state_json.to_json(state_json.empty()))
        tables = {ladder: dict(table) for ladder, table in base.competitors.items()}
        for user, (_, _, index, lp, level) in zip(players, PLAYERS, strict=True):
            tables[Ladder.DOUBLES][str(user.pk)] = Competitor(
                rating=Rating(mu_from_level(level, config), 2.5),
                rank=RankState(index, lp),
                placement_left=0,
                placement_cap=config.placement_cap_index,
                matches_played=12,
                reached_at=season.starts_at,
                last_match_at=season.starts_at,
            )
        season.base_state = state_json.to_json(replace(base, competitors=tables))
        season.save(update_fields=["base_state"])
        store.rebuild(season)

    def _match(
        self, location: Location, court: Resource, players: list[User], manager: User
    ) -> Booking:
        """90 minutes on the half-hour grid, started 30–60 minutes ago; then a training."""
        now = clock.now()
        start = now.replace(minute=now.minute - now.minute % 30, second=0, microsecond=0)
        start -= timedelta(minutes=30)
        end = start + timedelta(minutes=90)
        Booking.objects.filter(
            resource=court,
            status=BookingStatus.CONFIRMED,
            starts_at__lt=end + timedelta(minutes=60),
            ends_at__gt=start,
            organizer__is_demo=True,
        ).update(status=BookingStatus.CANCELLED, cancelled_at=now)
        try:
            with transaction.atomic():
                match = Booking.objects.create(
                    location=location,
                    resource=court,
                    organizer=players[0],
                    created_by=players[0],
                    starts_at=start,
                    ends_at=end,
                    session_type=SessionType.OFFICIAL_MATCH,
                    price_total=0,
                )
                Booking.objects.create(
                    location=location,
                    resource=court,
                    organizer=players[2],
                    created_by=players[2],
                    starts_at=end,
                    ends_at=end + timedelta(minutes=60),
                    session_type=SessionType.TRAINING,
                    price_total=0,
                )
        except IntegrityError as exc:
            raise CommandError(f"{court.name} is taken now by a real booking") from exc
        for offset, player in enumerate(players):  # in pairs, as the example shows them
            Scan.objects.create(
                user=player,
                location=location,
                kind=ScanKind.COURT_ENTRY,
                resource=court,
                booking=match,
                scanned_at=start + timedelta(seconds=offset),
            )
        MatchOfTheDay.objects.update_or_create(
            location=location,
            day=clock.local(start).date(),
            defaults={
                "booking": match,
                "chosen_by": manager,
                "reason": "DEMO (§8.5)",
                "created_at": now,
            },
        )
        return match
