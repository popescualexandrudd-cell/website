"""Initial data: the Jungle Padel location and its resources (idempotent).

`--demo` also adds clearly marked demo data: placeholder legal documents (not legal
texts) and demo people, including the names required by §8.5.
"""

from __future__ import annotations

from typing import Any

from django.core.management.base import BaseCommand, CommandParser
from django.db import transaction

from jungle.accounts.models import AccountType, User, UserRole
from jungle.audit.services import SYSTEM
from jungle.configuration.services import ensure_flag_rows
from jungle.core.permissions import Role
from jungle.legal.models import DocumentKind, LegalDocument
from jungle.legal.services import publish_document
from jungle.locations.models import Location, Resource, ResourceKind

DEMO_LEGAL_BODY = {
    "ro": "DOCUMENT DEMO — nu este un text legal. Textul real se redactează în etapele următoare "
    "(Q41) și are nevoie de datele firmei (Q26).",
    "en": "DEMO DOCUMENT — not a legal text. The real text is drafted in later stages (Q41) "
    "and needs the company details (Q26).",
}
DEMO_TITLES = {
    (DocumentKind.TERMS, "ro"): "Termeni și condiții (DEMO)",
    (DocumentKind.TERMS, "en"): "Terms and conditions (DEMO)",
    (DocumentKind.PRIVACY, "ro"): "Politica de confidențialitate (DEMO)",
    (DocumentKind.PRIVACY, "en"): "Privacy policy (DEMO)",
}
# (first name, last name, email, role) — §8.5 names first; all addresses are non-deliverable.
DEMO_PEOPLE = [
    ("Alexandru Daniel", "Popescu", "alexandru.popescu@demo.invalid", None),
    ("Rareș", "Moșteanu", "rares.mosteanu@demo.invalid", None),
    ("Ana", "Recepție", "receptie@demo.invalid", Role.RECEPTION),
    ("Mihai", "Antrenor", "antrenor@demo.invalid", Role.COACH),
    ("Ioana", "Manager", "manager@demo.invalid", Role.MANAGER),
]


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
        for (kind, language), title in DEMO_TITLES.items():
            if not LegalDocument.objects.filter(kind=kind, language=language).exists():
                publish_document(
                    SYSTEM, kind, language, title, DEMO_LEGAL_BODY[language], is_demo=True
                )
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
