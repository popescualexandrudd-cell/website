"""Initial data: the Jungle Padel location and its resources (idempotent).

`--demo` also adds clearly marked demo data: placeholder legal documents (not legal
texts), demo people, including the names required by §8.5, and two demo events on the
calendar (§9.2.12), a few days ahead.
"""

from __future__ import annotations

from datetime import datetime, time, timedelta
from typing import Any

from django.conf import settings
from django.core.management.base import BaseCommand, CommandParser
from django.db import transaction

from jungle.accounts.models import AccountType, User, UserRole
from jungle.audit.services import SYSTEM
from jungle.cafe.models import CafeCategory, CafeProduct
from jungle.configuration.models import Marker
from jungle.configuration.services import ensure_flag_rows
from jungle.core import clock
from jungle.core.permissions import Role
from jungle.events.models import ClubEvent, EventKind
from jungle.legal.management.commands.publish_legal_document import read_public_text
from jungle.legal.models import DocumentKind, LegalDocument
from jungle.legal.services import publish_document
from jungle.locations.models import Location, Resource, ResourceKind
from jungle.pricing.models import Band, PriceRate, Product
from jungle.subscriptions.models import Sport, SubscriptionRate

# Legal texts drafted in docs/ (Q41); published as demo while they contain DE_CONFIRMAT (Q26).
LEGAL_FILES = {
    DocumentKind.TERMS: "termeni-si-conditii",
    DocumentKind.PRIVACY: "politica-confidentialitate",
    DocumentKind.REFUNDS: "politica-rambursare",
    DocumentKind.COOKIES: "politica-cookies",
    DocumentKind.WAITLIST_NOTICE: "nota-informare-lista-asteptare",
    DocumentKind.LEAGUE_GDPR: "formular-gdpr-liga",
}
# (kind, weekday: Monday = 0, start, end, RO title, EN title): the calendar's demo, marked as such.
DEMO_EVENTS = [
    (EventKind.DJ_NIGHT, 4, time(20), time(23), "Seară cu DJ (demo)", "DJ night (demo)"),
    (
        EventKind.SOCIAL,
        5,
        time(10),
        time(13),
        "Americano de sâmbătă (demo)",
        "Saturday Americano (demo)",
    ),
]
DEMO_EVENT_TEXT = (
    "Exemplu: evenimentele reale le publică clubul din panou.",
    "An example: the real events are published by the club from the panel.",
)
# (first name, last name, email, role) — §8.5 names first; all addresses are non-deliverable.
DEMO_PEOPLE = [
    ("Alexandru Daniel", "Popescu", "alexandru.popescu@demo.invalid", None),
    ("Rareș", "Moșteanu", "rares.mosteanu@demo.invalid", None),
    ("Ana", "Recepție", "receptie@demo.invalid", Role.RECEPTION),
    ("Mihai", "Antrenor", "antrenor@demo.invalid", Role.COACH),
    ("Ioana", "Manager", "manager@demo.invalid", Role.MANAGER),
]
# DEMO rates in bani per 30 minutes, so bookings can be tried out. They are NOT prices of the
# club: marked DE_STABILIT (Q21) until the owner sets them in the admin.
INDICATIVE_NOTE = "Preț orientativ (Q21, 27.09.2026), de confirmat de proprietar"
INDICATIVE_RATES: list[tuple[str, str, dict[str, int]]] = [
    (
        ResourceKind.PADEL_COURT,
        Product.RENTAL,
        {Band.PEAK: 9000, Band.SEMI_PEAK: 7500, Band.OFF_PEAK: 6000},  # 180 / 150 / 120 lei/h
    ),
    (
        ResourceKind.PADEL_COURT,
        Product.LESSON,
        {Band.PEAK: 11000, Band.SEMI_PEAK: 10000, Band.OFF_PEAK: 10000},  # 220 / 200 lei/h
    ),
    (ResourceKind.REFORMER, Product.LESSON, dict.fromkeys(Band.values, 9000)),  # 180 lei/h
    (ResourceKind.PILATES_STUDIO, Product.CLASS, dict.fromkeys(Band.values, 4000)),  # 80 lei/h
    (ResourceKind.EVENT_ROOM, Product.EVENT, dict.fromkeys(Band.values, 10000)),  # 200 lei/h
]
# Café menu (R-112): generic items, indicative prices (Q21, Q33), names RO/EN.
INDICATIVE_CAFE = {
    ("Cafea", "Coffee"): [("Espresso", "Espresso", 1200), ("Cappuccino", "Cappuccino", 1600)],
    ("Băuturi reci", "Cold drinks"): [("Apă plată 0,5 l", "Still water 0.5 l", 800)],
}
# Monthly subscription prices (bani) per sport and sessions per month (R-082), indicative.
INDICATIVE_SUBSCRIPTION_RATES = {
    Sport.PADEL: {4: 40000, 8: 72000, 12: 96000},
    Sport.TENNIS: {4: 36000, 8: 64000, 12: 86000},
    Sport.PILATES: {4: 32000, 8: 56000, 12: 78000},
}


class Command(BaseCommand):
    help = "Creates the Jungle Padel location and its resources; --demo adds demo data."

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument("--demo", action="store_true", help="also create marked demo data")

    @transaction.atomic
    def handle(self, *args: Any, **options: Any) -> None:
        ensure_flag_rows()
        location, _ = Location.objects.get_or_create(
            slug="jungle-padel",
            defaults={
                "name": "Jungle Padel",
                "address": "Șoseaua Biruinței, lângă Selgros Pantelimon",
                "city": "Pantelimon, Ilfov",
            },
        )

        def resource(slug: str, **fields: Any) -> Resource:
            obj, _ = Resource.objects.get_or_create(location=location, slug=slug, defaults=fields)
            return obj

        for n in range(1, 5):
            resource(
                f"teren-{n}",
                kind=ResourceKind.PADEL_COURT,
                name=f"Teren {n}",
                sort_order=n,
                attributes={"indoor": True, "heated": True, "cooled": True},
            )
        studio = resource(
            "sala-pilates",
            kind=ResourceKind.PILATES_STUDIO,
            name="Sala de pilates",
            capacity=6,
            attributes={"heated": True, "cooled": True},
        )
        for n in range(1, 7):  # 4 at launch, up to 6 later (R-100)
            resource(
                f"reformer-{n}",
                kind=ResourceKind.REFORMER,
                name=f"Reformer {n}",
                parent=studio,
                sort_order=n,
                is_active=n <= 4,
            )
        resource(
            "sala-evenimente",
            kind=ResourceKind.EVENT_ROOM,
            name="Sala de evenimente",
            capacity=20,
            attributes={"heated": True, "cooled": True},
        )
        self.stdout.write(
            self.style.SUCCESS(f"Locația {location.name}: {location.resources.count()} resurse.")
        )

        self._indicative_prices(location)
        if options["demo"]:
            self._demo()
            self._demo_events(location)

    def _demo_events(self, location: Location) -> None:
        """The next Friday night and Saturday morning (never today), unless some are still ahead."""
        if ClubEvent.objects.filter(
            location=location, is_demo=True, ends_at__gt=clock.now()
        ).exists():
            return
        today = clock.today_local()
        for kind, weekday, start, end, title_ro, title_en in DEMO_EVENTS:
            day = today + timedelta(days=(weekday - today.weekday()) % 7 or 7)
            ClubEvent.objects.create(
                location=location,
                kind=kind,
                title_ro=title_ro,
                title_en=title_en,
                text_ro=DEMO_EVENT_TEXT[0],
                text_en=DEMO_EVENT_TEXT[1],
                starts_at=datetime.combine(day, start, tzinfo=clock.BUSINESS_TZ),
                ends_at=datetime.combine(day, end, tzinfo=clock.BUSINESS_TZ),
                published=True,
                is_demo=True,
            )

    def _demo(self) -> None:
        texts = settings.REPO_ROOT / "docs/07-securitate-gdpr-legal/texte"
        for kind, stem in LEGAL_FILES.items():
            for language in ("ro", "en"):
                if not LegalDocument.objects.filter(kind=kind, language=language).exists():
                    title, body = read_public_text(texts / f"{stem}.{language}.md")
                    is_demo = "DE_CONFIRMAT" in body
                    publish_document(SYSTEM, kind, language, title, body, is_demo=is_demo)
        for first, last, email, role in DEMO_PEOPLE:
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
            if role is not None:
                UserRole.objects.get_or_create(user=user, role=role, location=None)
        self.stdout.write(self.style.WARNING("Date DEMO create (marcate is_demo / DEMO)."))

    def _indicative_prices(self, location: Location) -> None:
        """Q21 (owner, 27.09.2026): indicative prices, DE_STABILIT until confirmed in the admin."""
        for resource_kind, product, bands in INDICATIVE_RATES:
            for band, amount in bands.items():
                PriceRate.objects.get_or_create(
                    location=location,
                    resource_kind=resource_kind,
                    product=product,
                    band=band,
                    defaults={
                        "amount_per_half_hour": amount,
                        "marker": Marker.TO_SET,
                        "note": INDICATIVE_NOTE,
                    },
                )
        for order, ((cat_ro, cat_en), items) in enumerate(INDICATIVE_CAFE.items()):
            category, _ = CafeCategory.objects.get_or_create(
                location=location,
                name_ro=cat_ro,
                defaults={"name_en": cat_en, "sort_order": order},
            )
            for name_ro, name_en, price in items:
                CafeProduct.objects.get_or_create(
                    location=location,
                    category=category,
                    name_ro=name_ro,
                    defaults={"name_en": name_en, "price": price, "marker": Marker.TO_SET},
                )
        for sport, levels in INDICATIVE_SUBSCRIPTION_RATES.items():
            for sessions, monthly in levels.items():
                SubscriptionRate.objects.get_or_create(
                    location=location,
                    sport=sport,
                    sessions_per_month=sessions,
                    defaults={
                        "monthly_price": monthly,
                        "marker": Marker.TO_SET,
                        "note": INDICATIVE_NOTE,
                    },
                )
