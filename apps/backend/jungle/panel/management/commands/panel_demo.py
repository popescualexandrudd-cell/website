"""DEMO data for trying the admin panel (Stage 10): the demo manager and reception get a password
(from `$JUNGLE_DEMO_PASSWORD`) and no two-factor authentication yet, so their first sign-in goes
through the setup; two demo customers get bookings tomorrow on the padel courts. Everything is
marked demo. Needs `seed_initial --demo` first. Refused in staging and production. Prints (or
writes to `--output`) what was created, as JSON.
"""

from __future__ import annotations

import json
import os
from datetime import datetime, time, timedelta
from pathlib import Path
from typing import Any

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError, CommandParser
from django.db import transaction

from jungle.accounts.models import User
from jungle.bookings.models import Booking, SessionType
from jungle.core import clock
from jungle.locations.models import Location, Resource, ResourceKind

STAFF = ("manager@demo.invalid", "receptie@demo.invalid")
CUSTOMERS = ("alexandru.popescu@demo.invalid", "rares.mosteanu@demo.invalid")


class Command(BaseCommand):
    help = "DEMO: staff passwords and bookings for trying the admin panel (not in production)."

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument("--password-env", default="JUNGLE_DEMO_PASSWORD")
        parser.add_argument("--output", default="", help="write the JSON here instead of stdout")

    def handle(self, *args: Any, **options: Any) -> None:
        if settings.IS_PRODUCTION_LIKE:
            raise CommandError("panel_demo is for development and demos only")
        password = os.environ.get(options["password_env"], "")
        if len(password) < 12:
            raise CommandError(
                f"Set a demo password of 12+ characters in ${options['password_env']}."
            )
        location = Location.objects.filter(slug="jungle-padel").first()
        staff = list(User.objects.filter(email__in=STAFF, is_demo=True))
        people = [User.objects.filter(email=e, is_demo=True).first() for e in CUSTOMERS]
        customers = [p for p in people if p is not None]
        if location is None or len(staff) != len(STAFF) or len(customers) != len(CUSTOMERS):
            raise CommandError("run `seed_initial --demo` first")
        courts = list(
            Resource.objects.filter(location=location, kind=ResourceKind.PADEL_COURT).order_by(
                "sort_order", "name"
            )
        )
        tomorrow = clock.today_local() + timedelta(days=1)
        bookings = []
        with transaction.atomic():
            for user in staff:
                user.set_password(password)
                user.totp_secret = ""
                user.totp_confirmed_at = None
                user.save(update_fields=["password", "totp_secret", "totp_confirmed_at"])
                user.recovery_codes.all().delete()
            slots = ((10, courts[0]), (12, courts[1]))
            for (hour, court), person in zip(slots, customers, strict=True):
                start = datetime.combine(tomorrow, time(hour), clock.BUSINESS_TZ)
                booking, _ = Booking.objects.get_or_create(
                    resource=court,
                    starts_at=start,
                    defaults={
                        "location": location,
                        "organizer": person,
                        "created_by": person,
                        "ends_at": start + timedelta(minutes=90),
                        "session_type": SessionType.FREE_RENTAL,
                        "price_total": 0,
                        "price_provisional": True,
                    },
                )
                bookings.append(
                    {
                        "id": str(booking.pk),
                        "court": court.name,
                        "starts_at": clock.local(booking.starts_at).isoformat(),
                        "organizer": f"{person.first_name} {person.last_name}",
                    }
                )
        data = {
            "location_id": str(location.pk),
            "day": tomorrow.isoformat(),
            "staff": list(STAFF),
            "courts": [c.name for c in courts],
            "bookings": bookings,
        }
        text = json.dumps(data, ensure_ascii=False, indent=2)
        if options["output"]:
            Path(options["output"]).write_text(text, encoding="utf-8")
        else:
            self.stdout.write(text)
