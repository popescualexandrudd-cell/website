"""Initial data: the Jungle Padel location and its resources (idempotent).

`--demo` also adds clearly marked demo data: placeholder legal documents (not legal
texts) and demo people, including the names required by §8.5.
"""

from __future__ import annotations

from typing import Any

from django.conf import settings
from django.core.management.base import BaseCommand, CommandParser
from django.db import transaction

from jungle.accounts.models import AccountType, User, UserRole
from jungle.audit.services import SYSTEM
from jungle.cafe.models import CafeCategory, CafeProduct
from jungle.configuration.models import Marker
from jungle.configuration.services import ensure_flag_rows
from jungle.core.permissions import Role
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
}
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
DEMO_RATES: list[tuple[str, str, dict[str, int]]] = [
    (
        ResourceKind.PADEL_COURT,
        Product.RENTAL,
        {Band.PEAK: 6000, Band.SEMI_PEAK: 5000, Band.OFF_PEAK: 4000},
    ),
    (
        ResourceKind.PADEL_COURT,
        Product.LESSON,
        {Band.PEAK: 9000, Band.SEMI_PEAK: 8000, Band.OFF_PEAK: 7000},
    ),
    (ResourceKind.REFORMER, Product.LESSON, dict.fromkeys(Band.values, 7500)),
    (ResourceKind.PILATES_STUDIO, Product.CLASS, dict.fromkeys(Band.values, 4000)),
    (ResourceKind.EVENT_ROOM, Product.EVENT, dict.fromkeys(Band.values, 10000)),
]
# DEMO café menu (R-112): generic items, prices DE_STABILIT (Q21, Q33), names RO/EN.
DEMO_CAFE = {
    ("Cafea", "Coffee"): [("Espresso", "Espresso", 1200), ("Cappuccino", "Cappuccino", 1600)],
    ("Băuturi reci", "Cold drinks"): [("Apă plată 0,5 l", "Still water 0.5 l", 800)],
}
# DEMO monthly subscription prices (bani) per sport and sessions per month (R-082), DE_STABILIT.
DEMO_SUBSCRIPTION_RATES = {
    Sport.PADEL: {4: 36000, 8: 64000, 12: 90000},
    Sport.TENNIS: {4: 32000, 8: 56000, 12: 78000},
    Sport.PILATES: {4: 30000, 8: 52000, 12: 72000},
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

        if options["demo"]:
            self._demo()

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
        location = Location.objects.get(slug="jungle-padel")
        for resource_kind, product, bands in DEMO_RATES:
            for band, amount in bands.items():
                PriceRate.objects.get_or_create(
                    location=location,
                    resource_kind=resource_kind,
                    product=product,
                    band=band,
                    defaults={
                        "amount_per_half_hour": amount,
                        "marker": Marker.TO_SET,
                        "note": "DEMO — nu este un preț al clubului (Q21)",
                    },
                )
        for order, ((cat_ro, cat_en), items) in enumerate(DEMO_CAFE.items()):
            category, _ = CafeCategory.objects.get_or_create(
                location=location,
                name_ro=f"{cat_ro} (DEMO)",
                defaults={"name_en": f"{cat_en} (DEMO)", "sort_order": order},
            )
            for name_ro, name_en, price in items:
                CafeProduct.objects.get_or_create(
                    location=location,
                    category=category,
                    name_ro=name_ro,
                    defaults={"name_en": name_en, "price": price, "marker": Marker.TO_SET},
                )
        for sport, levels in DEMO_SUBSCRIPTION_RATES.items():
            for sessions, monthly in levels.items():
                SubscriptionRate.objects.get_or_create(
                    location=location,
                    sport=sport,
                    sessions_per_month=sessions,
                    defaults={
                        "monthly_price": monthly,
                        "marker": Marker.TO_SET,
                        "note": "DEMO — nu este un preț al clubului (Q21)",
                    },
                )
        self.stdout.write(self.style.WARNING("Date DEMO create (marcate is_demo / DEMO)."))
