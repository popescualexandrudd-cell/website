"""DEMO data for trying the League Kiosk (Stage 7): an enrolled kiosk, four demo players in the
league with a match just finished (score window open, everyone scanned in), and a fifth demo
player who has not signed the league consent yet. Everything is marked demo.

Needs `seed_initial --demo` first. Refused in staging and production. Prints (or writes to
`--output`) the device token and the demo cards' codes as JSON, for the bridge's `.env` and
for the simulator.
"""

from __future__ import annotations

import json
from datetime import date, timedelta
from decimal import Decimal
from pathlib import Path
from typing import Any

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError, CommandParser
from django.db import IntegrityError, transaction
from django.test import RequestFactory

from jungle.accounts.models import AccountType, User
from jungle.accounts.services.authz import MFA_SESSION_KEY
from jungle.attendance.models import Scan, ScanKind
from jungle.audit import services as audit
from jungle.audit.services import SYSTEM
from jungle.bookings.models import Booking, SessionType
from jungle.cards import services as cards
from jungle.core import clock
from jungle.core.errors import DomainError
from jungle.devices import auth, bridge
from jungle.devices.models import Device, DeviceKind
from jungle.league import services
from jungle.league.models import LeagueSeason, LevelQuestionnaire, SeasonStatus
from jungle.locations.models import Location, Resource, ResourceKind
from jungle.privacy import league_consent

DEVICE_NAME = "Chioșc Ligă DEMO"
PLAYERS = [("Demo", f"Jucător {n}", f"kiosk-demo-{n}@demo.invalid") for n in range(1, 5)]
NEWCOMER = ("Demo", "Nou", "kiosk-demo-nou@demo.invalid")
MANAGER_EMAIL = "manager@demo.invalid"


class Command(BaseCommand):
    help = "DEMO: prepares a League Kiosk, demo players and a finished match (not in production)."

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument("--public-key", default="", help="the Hardware Bridge's public key")
        parser.add_argument("--output", default="", help="write the JSON here instead of stdout")

    def handle(self, *args: Any, **options: Any) -> None:
        if settings.IS_PRODUCTION_LIKE:
            raise CommandError("kiosk_demo is for development and demos only")
        location = Location.objects.filter(slug="jungle-padel").first()
        manager = User.objects.filter(email=MANAGER_EMAIL).first()
        if location is None or manager is None:
            raise CommandError("run `seed_initial --demo` first")
        try:
            with transaction.atomic():
                result = self._prepare(location, manager, str(options["public_key"]).strip())
        except DomainError as exc:
            raise CommandError(f"kiosk_demo: {exc.code.value}") from exc
        text = json.dumps(result, ensure_ascii=False, indent=2)
        if options["output"]:
            Path(options["output"]).write_text(text + "\n", encoding="utf-8")
        else:
            self.stdout.write(text)
        self.stderr.write(self.style.WARNING("Date DEMO pentru Chioșcul Ligii (marcate DEMO)."))

    # ------------------------------------------------------------ steps
    def _prepare(self, location: Location, manager: User, public_key: str) -> dict[str, Any]:
        staff = RequestFactory().post("/", REMOTE_ADDR="127.0.0.1")
        staff.user = manager
        staff.session = {MFA_SESSION_KEY: True}  # type: ignore[assignment]
        device, token = self._kiosk(location, public_key)
        season = self._season(location, staff)
        players = [self._player(device, season, *names, sign=True) for names in PLAYERS]
        newcomer = self._player(device, season, *NEWCOMER, sign=False)
        booking = self._finished_match(location, players)
        return {
            "device_id": str(device.pk),
            "device_token": token,
            "season": season.name,
            "booking": {"id": str(booking.pk), "court": booking.resource.name},
            "players": [self._card(p) for p in players],
            "newcomer": self._card(newcomer),
        }

    def _kiosk(self, location: Location, public_key: str) -> tuple[Device, str]:
        if public_key:
            bridge.public_key(public_key)  # refuses an invalid key
        device, _ = Device.objects.get_or_create(
            location=location,
            name=DEVICE_NAME,
            defaults={"kind": DeviceKind.LEAGUE_KIOSK},
        )
        secret = auth.new_secret()
        device.token_hash = auth.hash_secret(secret)
        device.public_key = public_key
        device.certificate_fingerprint = ""
        device.is_active = True
        device.enrolled_at = clock.now()
        device.save()
        audit.record(
            SYSTEM,
            "devices.enrolled",
            target=device,
            after={"bridge_key": bool(public_key), "certificate": False, "demo": True},
        )
        return device, f"{device.pk}.{secret}"

    def _season(self, location: Location, staff: Any) -> LeagueSeason:
        active = LeagueSeason.objects.filter(location=location, status=SeasonStatus.ACTIVE).first()
        if active is not None:
            return active
        last = LeagueSeason.objects.filter(location=location).order_by("-number").first()
        number = (last.number if last else 0) + 1
        now = clock.now()
        season = services.create_season(
            staff,
            services.SeasonData(
                location_id=location.id,
                number=number,
                name=f"Sezon DEMO {number}",
                starts_at=now - timedelta(days=1),
                ends_at=now + timedelta(days=90),
            ),
        )
        return services.activate_season(staff, season.id)

    def _player(
        self, device: Device, season: LeagueSeason, first: str, last: str, email: str, sign: bool
    ) -> User:
        user = User.objects.filter(email=email).first()
        if user is None:
            user = User.objects.create_user(
                email,
                None,
                first_name=first,
                last_name=last,
                date_of_birth=date(1990, 1, 1),
                account_type=AccountType.FULL,
                is_demo=True,
            )
        if not LevelQuestionnaire.objects.filter(user=user, validated_at__isnull=False).exists():
            LevelQuestionnaire.objects.create(
                user=user,
                answers={"demo": True},
                estimated_level=Decimal("3.00"),
                submitted_at=clock.now(),
                validated_level=Decimal("3.00"),
                validated_at=clock.now(),
            )
        if cards.active_card(user) is None:
            cards.issue_card(SYSTEM, user, reason="Card DEMO")
        if sign:
            # In the league from the start of the demo season, so the match that just ended
            # counts (a real player joining after a match cannot make it count).
            services.register_in_season(season, user, at=season.starts_at)
            kiosk_call = RequestFactory().post("/", REMOTE_ADDR="127.0.0.1")
            league_consent.sign(kiosk_call, user, device, "ro")
        return user

    def _finished_match(self, location: Location, players: list[User]) -> Booking:
        """A 90-minute official match that ended on the last half hour (bookings sit on the
        half-hour grid), so its 30-minute score window is open; everyone scanned in."""
        now = clock.now()
        end = now.replace(minute=now.minute - now.minute % 30, second=0, microsecond=0)
        start = end - timedelta(minutes=90)
        courts = Resource.objects.filter(
            location=location, kind=ResourceKind.PADEL_COURT, is_active=True
        ).order_by("sort_order")
        for court in courts:
            try:
                with transaction.atomic():
                    booking = Booking.objects.create(
                        location=location,
                        resource=court,
                        organizer=players[0],
                        created_by=players[0],
                        starts_at=start,
                        ends_at=end,
                        session_type=SessionType.OFFICIAL_MATCH,
                        price_total=0,
                    )
            except IntegrityError:
                continue  # that court is taken at this time: the next one
            for player in players:
                Scan.objects.create(
                    user=player,
                    location=location,
                    kind=ScanKind.COURT_ENTRY,
                    resource=court,
                    booking=booking,
                    scanned_at=start,
                )
            return booking
        raise CommandError("every court is taken right now; try again in a few minutes")

    @staticmethod
    def _card(user: User) -> dict[str, str]:
        card = cards.active_card(user)
        assert card is not None  # noqa: S101 - issued above
        name = f"{user.first_name} {user.last_name}"
        return {"id": str(user.pk), "name": name, "card": card.token}
