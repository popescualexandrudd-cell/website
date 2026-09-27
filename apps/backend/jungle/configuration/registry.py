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


def _hhmm(value: Any) -> bool:
    if not isinstance(value, str) or len(value) != 5 or value[2] != ":":
        return False
    hh, mm = value[:2], value[3:]
    if not (hh.isdigit() and mm.isdigit()):
        return False
    return (0 <= int(hh) <= 23 and mm in ("00", "30")) or value == "24:00"


def durations(value: Any) -> bool:
    """Booking durations in minutes: 60…180, multiples of 30 (R-041)."""
    return (
        isinstance(value, list)
        and len(value) > 0
        and all(
            isinstance(v, int) and not isinstance(v, bool) and 60 <= v <= 180 and v % 30 == 0
            for v in value
        )
    )


def opening_hours(value: Any) -> bool:
    """{"weekday": ["08:00", "23:00"], "weekend": [...]} in club time (Q3)."""
    return (
        isinstance(value, dict)
        and set(value) == {"weekday", "weekend"}
        and all(
            isinstance(v, list) and len(v) == 2 and _hhmm(v[0]) and _hhmm(v[1]) and v[0] < v[1]
            for v in value.values()
        )
    )


BANDS = ("peak", "semi_peak", "off_peak")


def time_bands(value: Any) -> bool:
    """Price bands per day type: [["08:00", "12:00", "semi_peak"], …], contiguous (R-050)."""
    if not isinstance(value, dict) or set(value) != {"weekday", "weekend"}:
        return False
    for rows in value.values():
        if not isinstance(rows, list) or not rows:
            return False
        previous_end = "00:00"
        for row in rows:
            if not (isinstance(row, list) and len(row) == 3 and row[2] in BANDS):
                return False
            if not (_hhmm(row[0]) and _hhmm(row[1]) and row[0] == previous_end < row[1]):
                return False
            previous_end = row[1]
        if previous_end != "24:00":
            return False
    return True


def season_dates(value: Any) -> bool:
    """{"summer_start": "04-01", "winter_start": "10-01"} (MM-DD, R-051)."""
    if not isinstance(value, dict) or set(value) != {"summer_start", "winter_start"}:
        return False
    for v in value.values():
        if not (isinstance(v, str) and len(v) == 5 and v[2] == "-"):
            return False
        month, day = v[:2], v[3:]
        if not (
            month.isdigit() and day.isdigit() and 1 <= int(month) <= 12 and 1 <= int(day) <= 28
        ):
            return False
    return bool(value["summer_start"] != value["winter_start"])


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
            "waitlist.confirmation_ttl_days",
            7,
            Marker.DEFAULT,
            "Zile pentru confirmarea înscrierii pe lista de așteptare (apoi datele se șterg).",
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
            "bookings.durations_minutes",
            [60, 90, 120, 150, 180],
            Marker.TO_CONFIRM,
            "Duratele permise la rezervare, în minute (R-041).",
            durations,
            question="Q2",
        ),
        ConfigSpec(
            "bookings.opening_hours",
            {"weekday": ["08:00", "23:00"], "weekend": ["08:00", "23:00"]},
            Marker.TO_CONFIRM,
            "Programul de funcționare, ora României (rezervările trebuie să încapă în el).",
            opening_hours,
            question="Q3",
        ),
        ConfigSpec(
            "bookings.free_cancellation_hours",
            24,
            Marker.CONFIRMED,
            "Anulare gratuită (recuperare) cu cel puțin atâtea ore înainte (R-070, R-071).",
            positive_int,
        ),
        ConfigSpec(
            "bookings.no_show_grace_minutes",
            15,
            Marker.DEFAULT,
            "Minute după start fără nicio scanare până la „neprezentare” (R-072).",
            positive_int,
        ),
        ConfigSpec(
            "bookings.no_show_window_days",
            90,
            Marker.TO_CONFIRM,
            "Fereastra în care se numără neprezentările (R-073).",
            positive_int,
            question="Q15",
        ),
        ConfigSpec(
            "bookings.no_show_block_threshold",
            3,
            Marker.CONFIRMED,
            "La a câta neprezentare se blochează rezervările până la decizia antrenorului (R-073).",
            positive_int,
        ),
        ConfigSpec(
            "bookings.promotion_free_cancel_hours",
            2,
            Marker.TO_CONFIRM,
            "Ore în care cine a intrat de pe lista de așteptare poate anula gratuit (R-074).",
            positive_int,
            question="Q16",
        ),
        ConfigSpec(
            "pricing.time_bands",
            {
                "weekday": [
                    ["00:00", "08:00", "off_peak"],
                    ["08:00", "12:00", "semi_peak"],
                    ["12:00", "15:00", "off_peak"],
                    ["15:00", "22:00", "peak"],
                    ["22:00", "24:00", "off_peak"],
                ],
                "weekend": [
                    ["00:00", "08:00", "off_peak"],
                    ["08:00", "12:00", "semi_peak"],
                    ["12:00", "15:00", "off_peak"],
                    ["15:00", "22:00", "peak"],
                    ["22:00", "24:00", "off_peak"],
                ],
            },
            Marker.TO_CONFIRM,
            "Benzile orare de preț (R-050): 13–15, după 22 și weekendul sunt implicite.",
            time_bands,
            question="Q3",
        ),
        ConfigSpec(
            "pricing.seasons",
            {"summer_start": "04-01", "winter_start": "10-01"},
            Marker.TO_CONFIRM,
            "Datele de schimbare a sezonului de preț, vară și iarnă (R-051).",
            season_dates,
            question="Q21",
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
