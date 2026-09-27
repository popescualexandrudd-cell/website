"""Every feature flag and configuration key the system knows, with its safe default.

Values that are not decided yet are marked TO_CONFIRM (DE_CONFIRMAT) or TO_SET
(DE_STABILIT) and listed in the admin page "Ce mai trebuie confirmat" (ADR-0022).
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

from jungle.configuration.models import Marker


@dataclass(frozen=True)
class FlagSpec:
    key: str
    default: bool
    description: str


@dataclass(frozen=True)
class ConfigSpec:
    key: str
    default: Any
    marker: Marker
    description: str
    validator: Callable[[Any], bool]
    question: str = ""


def positive_int(value: Any) -> bool:
    return isinstance(value, int) and not isinstance(value, bool) and value > 0


def optional_str(value: Any) -> bool:
    return value is None or (isinstance(value, str) and len(value) <= 250)


COMPANY_FIELDS = (
    "legal_name",
    "registration_code",
    "trade_register_number",
    "address",
    "privacy_contact_email",
    "phone",
)


def company_details(value: Any) -> bool:
    return (
        isinstance(value, dict)
        and set(value) == set(COMPANY_FIELDS)
        and all(optional_str(v) for v in value.values())
    )


FLAGS: dict[str, FlagSpec] = {
    spec.key: spec
    for spec in [
        FlagSpec("parkour", False, "Traseul de parkour pentru copii (R-110): ascuns la lansare."),
        FlagSpec(
            "tennis_court_on_site", False, "Teren de tenis pe amplasamentul Jungle Padel (§2.2)."
        ),
        FlagSpec("junior_league", False, "Liga de juniori, doar cu acordul părinților (R-006)."),
        FlagSpec(
            "child_accounts",
            False,
            "Conturi de copii gestionate de părinți (Q7: pregătit, activabil).",
        ),
        FlagSpec("guest_quick_accounts", True, "Cont rapid pentru invitați (Q8, confirmat)."),
        FlagSpec("whatsapp", False, "Notificări WhatsApp (R-130: nu la lansare)."),
        FlagSpec("sms", False, "Notificări SMS (Q17)."),
        FlagSpec("online_payments", False, "Plata online cu card (Q9)."),
        FlagSpec("card_pos", False, "POS cu card la chioșc (R-062)."),
        FlagSpec("founding_members", False, "Membri fondatori (Q36: pregătit, dezactivat)."),
        FlagSpec("apple_wallet", False, "Apple Wallet (Q24: amânat)."),
        FlagSpec("google_wallet", False, "Google Wallet (Etapa 5)."),
        FlagSpec("ai", False, "Oprirea globală a funcțiilor AI (ADR-0019)."),
    ]
}

CONFIG: dict[str, ConfigSpec] = {
    spec.key: spec
    for spec in [
        ConfigSpec(
            "club.company",
            dict.fromkeys(COMPANY_FIELDS),
            Marker.TO_CONFIRM,
            "Datele firmei (denumire, CUI, nr. Registrul Comerțului, adresă, email GDPR, telefon).",
            company_details,
            question="Q26",
        ),
        ConfigSpec(
            "club.domain",
            None,
            Marker.TO_CONFIRM,
            "Domeniul site-ului (§4.6).",
            optional_str,
            question="Q39",
        ),
        ConfigSpec(
            "accounts.min_self_registration_age",
            14,
            Marker.CONFIRMED,
            "Vârsta minimă pentru a-și crea singur cont (sub ea: cont gestionat de părinte).",
            positive_int,
            question="Q43",
        ),
        ConfigSpec(
            "accounts.email_verification_ttl_hours",
            48,
            Marker.DEFAULT,
            "Valabilitatea linkului de verificare a emailului (ore).",
            positive_int,
        ),
        ConfigSpec(
            "auth.login_max_failures",
            5,
            Marker.DEFAULT,
            "Încercări greșite înainte de blocarea temporară a contului.",
            positive_int,
        ),
        ConfigSpec(
            "auth.lockout_minutes",
            15,
            Marker.DEFAULT,
            "Durata blocării temporare după prea multe încercări (minute).",
            positive_int,
        ),
        ConfigSpec(
            "auth.ip_max_failures",
            50,
            Marker.DEFAULT,
            "Încercări greșite de pe aceeași adresă IP în fereastra de blocare.",
            positive_int,
        ),
        ConfigSpec(
            "auth.staff_session_hours",
            8,
            Marker.DEFAULT,
            "Durata maximă a unei sesiuni de personal (ore).",
            positive_int,
        ),
    ]
}
