"""DEMO data for trying the Payments Kiosk and the café display (Stage 8): an enrolled Payments
Kiosk and café display, a demo customer with a card, an unpaid booking later today, some credit
and a voucher, a demo partner (to split the hour) and a demo receptionist with a card and a PIN
(staff mode). Everything is marked demo.

Needs `seed_initial --demo` first. Refused in staging and production. Prints (or writes to
`--output`) the devices' tokens, the cards' codes and the PIN as JSON, for the bridges' `.env`
and the simulator.
"""

from __future__ import annotations

import json
from datetime import timedelta
from pathlib import Path
from typing import Any

from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.core.management.base import BaseCommand, CommandError, CommandParser
from django.db import IntegrityError, transaction

from jungle.accounts.models import AccountType, User, UserRole
from jungle.audit import services as audit
from jungle.audit.services import SYSTEM
from jungle.bookings.models import Booking, BookingStatus, SessionType
from jungle.bookings.services import check_opening_hours
from jungle.cards import services as cards
from jungle.checkout.models import KioskPin
from jungle.core import clock
from jungle.core.errors import DomainError
from jungle.core.permissions import Role
from jungle.devices import auth, bridge
from jungle.devices.models import Device, DeviceKind
from jungle.ledger.models import AccountKind, TransactionKind
from jungle.ledger.services import account, customer_credit, post
from jungle.locations.models import Location, Resource, ResourceKind
from jungle.rewards.models import VoucherKind, VoucherSource, VoucherTarget
from jungle.rewards.services import VoucherData, issue_voucher

KIOSK_NAME = "Chioșc Plăți DEMO"
DISPLAY_NAME = "Afișaj cafenea DEMO"
CUSTOMER = ("Demo", "Client", "plati-demo-client@demo.invalid")
PARTNER = ("Demo", "Partener", "plati-demo-partener@demo.invalid")
RECEPTIONIST = ("Demo", "Recepție", "plati-demo-receptie@demo.invalid")
PIN = "480913"  # DEMO only: every real employee sets their own PIN (Q54)
PRICE = 24000  # 240 RON for 90 minutes: an indicative DEMO price (Q21)
CREDIT = 5000
VOUCHER = 3000


class Command(BaseCommand):
    help = "DEMO: prepares a Payments Kiosk, a café display and demo people (not in production)."

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument("--public-key", default="", help="the kiosk's Hardware Bridge key")
        parser.add_argument("--display-key", default="", help="the café display's bridge key")
        parser.add_argument("--output", default="", help="write the JSON here instead of stdout")

    def handle(self, *args: Any, **options: Any) -> None:
        if settings.IS_PRODUCTION_LIKE:
            raise CommandError("payments_demo is for development and demos only")
        location = Location.objects.filter(slug="jungle-padel").first()
        if location is None:
            raise CommandError("run `seed_initial --demo` first")
        try:
            with transaction.atomic():
                result = self._prepare(
                    location,
                    str(options["public_key"]).strip(),
                    str(options["display_key"]).strip(),
                )
        except DomainError as exc:
            raise CommandError(f"payments_demo: {exc.code.value}") from exc
        text = json.dumps(result, ensure_ascii=False, indent=2)
        if options["output"]:
            Path(options["output"]).write_text(text + "\n", encoding="utf-8")
        else:
            self.stdout.write(text)
        self.stderr.write(self.style.WARNING("Date DEMO pentru Chioșcul de Plăți (marcate DEMO)."))

    def _prepare(self, location: Location, kiosk_key: str, display_key: str) -> dict[str, Any]:
        kiosk, kiosk_token = self._device(
            location, DeviceKind.PAYMENTS_KIOSK, KIOSK_NAME, kiosk_key
        )
        display, display_token = self._device(
            location, DeviceKind.CAFE_DISPLAY, DISPLAY_NAME, display_key
        )
        customer = self._person(*CUSTOMER)
        partner = self._person(*PARTNER)
        receptionist = self._person(*RECEPTIONIST)
        UserRole.objects.get_or_create(user=receptionist, role=Role.RECEPTION, location=location)
        KioskPin.objects.update_or_create(
            user=receptionist,
            defaults={
                "pin_hash": make_password(PIN),
                "failures": 0,
                "locked_until": None,
                "updated_at": clock.now(),
            },
        )
        booking = self._booking(location, customer)
        if customer_credit(customer) < CREDIT:
            post(
                TransactionKind.CREDIT,
                [
                    (account(AccountKind.CASH, location=location), CREDIT),
                    (account(AccountKind.CUSTOMER_BALANCE, user=customer), -CREDIT),
                ],
                description="Credit DEMO",
                actor=SYSTEM,
                reason="DEMO",
                location=location,
            )
        voucher = issue_voucher(
            SYSTEM,
            customer,
            VoucherData(
                kind=VoucherKind.AMOUNT,
                value=VOUCHER,
                target=VoucherTarget.BOOKING,
                valid_days=30,
                reason="DEMO",
            ),
            VoucherSource.MANUAL,
        )
        return {
            "kiosk": {"device_id": str(kiosk.pk), "device_token": kiosk_token},
            "display": {"device_id": str(display.pk), "device_token": display_token},
            "customer": self._card(customer),
            "partner": self._card(partner),
            "receptionist": {**self._card(receptionist), "pin": PIN},
            "booking": {
                "id": str(booking.pk),
                "court": booking.resource.name,
                "price": booking.price_total,
            },
            "credit": customer_credit(customer),
            "voucher": voucher.code,
        }

    def _device(
        self, location: Location, kind: str, name: str, public_key: str
    ) -> tuple[Device, str]:
        if public_key:
            bridge.public_key(public_key)  # refuses an invalid key
        device, _ = Device.objects.get_or_create(
            location=location, name=name, defaults={"kind": kind}
        )
        secret = auth.new_secret()
        device.kind = kind
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

    def _person(self, first: str, last: str, email: str) -> User:
        user = User.objects.filter(email=email).first()
        if user is None:
            user = User.objects.create_user(
                email,
                None,
                first_name=first,
                last_name=last,
                account_type=AccountType.FULL,
                is_demo=True,
            )
        if cards.active_card(user) is None:
            cards.issue_card(SYSTEM, user, reason="Card DEMO")
        return user

    def _card(self, user: User) -> dict[str, str]:
        card = cards.active_card(user)
        if card is None:  # pragma: no cover - `_person` always issues one
            raise CommandError(f"{user.email} has no card")
        return {
            "id": str(user.pk),
            "name": f"{user.first_name} {user.last_name}",
            "card": card.token,
        }

    def _booking(self, location: Location, customer: User) -> Booking:
        """An unpaid 90-minute booking of the customer, on the next free half-hour slot from two
        hours from now (the club's grid), within the opening hours (Q3): late in the evening it is
        the next morning, never past closing time."""
        existing = Booking.objects.filter(
            organizer=customer,
            status=BookingStatus.CONFIRMED,
            starts_at__gt=clock.now(),
            price_total=PRICE,
        ).first()
        if existing is not None:
            return existing
        now = clock.now()
        start = now.replace(minute=0, second=0, microsecond=0) + timedelta(hours=2)
        courts = Resource.objects.filter(
            location=location, kind=ResourceKind.PADEL_COURT, is_active=True
        ).order_by("sort_order")
        for offset in range(0, 48):
            begins = start + timedelta(minutes=30 * offset)
            try:
                check_opening_hours(begins, begins + timedelta(minutes=90))
            except DomainError:
                continue  # outside the opening hours: a later slot
            for court in courts:
                try:
                    with transaction.atomic():
                        return Booking.objects.create(
                            location=location,
                            resource=court,
                            organizer=customer,
                            created_by=customer,
                            starts_at=begins,
                            ends_at=begins + timedelta(minutes=90),
                            session_type=SessionType.FREE_RENTAL,
                            price_total=PRICE,
                        )
                except IntegrityError:
                    continue  # taken at this time: the next court or slot
        raise CommandError("no free court in the next 24 hours")
