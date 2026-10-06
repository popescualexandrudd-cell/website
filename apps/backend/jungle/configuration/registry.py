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


def ai_effort(value: Any) -> bool:
    return value in ("low", "medium", "high", "xhigh", "max")


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


def percent_map(keys: tuple[str, ...]) -> Callable[[Any], bool]:
    """{key: whole percent 0–90} for exactly `keys` (R-084 discounts)."""

    def check(value: Any) -> bool:
        return (
            isinstance(value, dict)
            and set(value) == set(keys)
            and all(
                isinstance(v, int) and not isinstance(v, bool) and 0 <= v <= 90
                for v in value.values()
            )
        )

    return check


def intensities(value: Any) -> bool:
    """R-082: {"start": 4, "active": 8, "pro": 12}."""
    return (
        isinstance(value, dict)
        and set(value) == {"start", "active", "pro"}
        and all(positive_int(v) and v <= 31 for v in value.values())
    )


def band_list(value: Any) -> bool:
    return (
        isinstance(value, list)
        and len(value) > 0
        and all(v in BANDS for v in value)
        and len(set(value)) == len(value)
    )


def emblem_list(value: Any) -> bool:
    return (
        isinstance(value, list)
        and 1 <= len(value) <= 30
        and all(isinstance(v, str) and v.isidentifier() and len(v) <= 30 for v in value)
        and len(set(value)) == len(value)
    )


def league_config(value: Any) -> bool:
    """Overrides of the league engine's values (a dict of LeagueConfig fields)."""
    if not isinstance(value, dict):
        return False
    from jungle_league.config import LeagueConfig

    try:
        LeagueConfig(**value)
    except (TypeError, ValueError):
        return False
    return True


def networks(value: Any) -> bool:
    """A non-empty list of IP networks in CIDR form ("192.168.10.0/24")."""
    import ipaddress

    if not isinstance(value, list) or not value:
        return False
    try:
        for v in value:
            ipaddress.ip_network(v)
    except (TypeError, ValueError):
        return False
    return True


def _voucher_rule(value: Any) -> bool:
    return (
        isinstance(value, dict)
        and set(value) == {"kind", "value", "target", "count", "valid_days"}
        and value["kind"] in ("hour", "amount", "percent")
        and value["target"] in ("booking", "subscription", "any")
        and all(positive_int(value[k]) for k in ("value", "count", "valid_days"))
        and (value["kind"] != "percent" or value["value"] <= 100)
    )


def league_rewards(value: Any) -> bool:
    """LG-122: {"ladder", "kings": {...}, "tier_top": {...}}; each with "top", "vouchers" (always
    given), "options" ({name: [vouchers]}: the winner chooses one in the account, Q6; may be
    empty) and "extras" ({"ro", "en"} text handed over at the reception, may be empty)."""

    def vouchers(v: Any) -> bool:
        return isinstance(v, list) and all(_voucher_rule(x) for x in v)

    def rule(r: Any) -> bool:
        return (
            isinstance(r, dict)
            and set(r) == {"top", "vouchers", "options", "extras"}
            and positive_int(r["top"])
            and r["top"] <= 10
            and vouchers(r["vouchers"])
            and isinstance(r["options"], dict)
            and len(r["options"]) != 1
            and all(
                isinstance(k, str) and k.isidentifier() and len(k) <= 30 and vouchers(v) and v
                for k, v in r["options"].items()
            )
            and bool(r["vouchers"] or r["options"])
            and isinstance(r["extras"], dict)
            and set(r["extras"]) == {"ro", "en"}
            and all(isinstance(t, str) and len(t) <= 200 for t in r["extras"].values())
        )

    return (
        isinstance(value, dict)
        and set(value) == {"ladder", "kings", "tier_top"}
        and value["ladder"] in ("doubles", "singles", "pairs")
        and rule(value["kings"])
        and rule(value["tier_top"])
    )


def number_map(keys: tuple[str, ...]) -> Callable[[Any], bool]:
    """{key: positive number} for exactly `keys`."""

    def check(value: Any) -> bool:
        return (
            isinstance(value, dict)
            and set(value) == set(keys)
            and all(
                isinstance(v, int | float) and not isinstance(v, bool) and v > 0
                for v in value.values()
            )
        )

    return check


BADGE_KEYS = (
    "giant_slayer_levels",
    "win_streak",
    "early_bird_before_hour",
    "early_bird_matches",
    "weekly_streak_weeks",
)
SPOTLIGHT_KEYS = (
    "promotion",
    "promotion_margin_lp",
    "top10_duel",
    "top10",
    "challenge",
    "rivalry",
    "rivalry_matches",
    "rivalry_days",
    "level_gap",
    "level_gap_levels",
)


def percent(value: Any) -> bool:
    return isinstance(value, int) and not isinstance(value, bool) and 0 <= value <= 90


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


def boolean(value: Any) -> bool:
    return isinstance(value, bool)


def announcements(value: Any) -> bool:
    """The club's own messages on the screens (§8.5), in both languages."""
    return (
        isinstance(value, list)
        and len(value) <= 20
        and all(
            isinstance(a, dict)
            and set(a) == {"ro", "en"}
            and all(isinstance(t, str) and 0 < len(t.strip()) <= 160 for t in a.values())
            for a in value
        )
    )


def optional_url(value: Any) -> bool:
    return isinstance(value, str) and (
        value == "" or (value.startswith("https://") and len(value) <= 200)
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
        FlagSpec(
            "full_site",
            False,
            "Site-ul complet (Etapa 11); oprit: vizitatorii văd pagina de pre-lansare. Îl pornește "
            "proprietarul când îl publică (Q57, confirmat de proprietar pe 29.09.2026).",
        ),
        FlagSpec(
            "web_effects",
            False,
            "Efectele site-ului complet: apariții la derulare, 3D, „pop”-uri, funcții animate "
            "(ADR-0023). Oprit: site-ul arată exact ca înainte de efecte.",
        ),
        FlagSpec(
            "web_hero_video",
            False,
            "Videoul de prezentare din hero-ul site-ului complet (ADR-0023). Oprit sau fără "
            "video încărcat: hero-ul rămâne randarea de acum.",
        ),
    ]
}

REVENUE_CATEGORIES = (
    "padel",
    "tennis",
    "pilates",
    "lessons",
    "subscriptions",
    "cafe",
    "events",
    "tournaments",
    "fees",
)


def vat_groups(value: Any) -> bool:
    """The fiscal register's VAT group for each revenue category (a letter A … E)."""
    return (
        isinstance(value, dict)
        and set(value) == set(REVENUE_CATEGORIES)
        and all(isinstance(v, str) and v in ("A", "B", "C", "D", "E") for v in value.values())
    )


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
            "club.tennis_club_url",
            "",
            Marker.CONFIRMED,
            "Adresa site-ului Clubului Tenis Elite, legată din secțiunea Tenis a site-ului (Q20). "
            "Goală: fără link (Q58, confirmat de proprietar pe 30.09.2026: nu există încă adresă).",
            optional_url,
            question="Q58",
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
            Marker.CONFIRMED,
            "Duratele permise la rezervare, în minute (R-041).",
            durations,
            question="Q2",
        ),
        ConfigSpec(
            "bookings.opening_hours",
            {"weekday": ["08:00", "23:00"], "weekend": ["08:00", "23:00"]},
            Marker.CONFIRMED,
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
            Marker.CONFIRMED,
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
            Marker.CONFIRMED,
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
                    ["15:00", "17:00", "semi_peak"],
                    ["17:00", "22:00", "peak"],
                    ["22:00", "24:00", "off_peak"],
                ],
                "weekend": [
                    ["00:00", "08:00", "off_peak"],
                    ["08:00", "12:00", "semi_peak"],
                    ["12:00", "15:00", "off_peak"],
                    ["15:00", "17:00", "semi_peak"],
                    ["17:00", "22:00", "peak"],
                    ["22:00", "24:00", "off_peak"],
                ],
            },
            Marker.TO_CONFIRM,
            "Benzile orare de preț (R-050). Vârful 17–22 e confirmat (Q3, 27.09.2026); "
            "semi-vârful 08–12 și 15–17 e implicit.",
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
            "subscriptions.intensities",
            {"start": 4, "active": 8, "pro": 12},
            Marker.CONFIRMED,
            "Sesiuni pe lună pentru fiecare intensitate standard (R-082).",
            intensities,
        ),
        ConfigSpec(
            "subscriptions.bundle_discounts",
            {"1": 0, "2": 10, "3": 15},
            Marker.CONFIRMED,
            "Reducerea (%) după numărul de sporturi din pachet (R-084).",
            percent_map(("1", "2", "3")),
        ),
        ConfigSpec(
            "subscriptions.period_discounts",
            {"monthly": 0, "quarterly": 5, "annual": 15},
            Marker.CONFIRMED,
            "Reducerea (%) după perioadă: lunar, trimestrial, anual (R-084).",
            percent_map(("monthly", "quarterly", "annual")),
        ),
        ConfigSpec(
            "subscriptions.start_rule_below_sessions",
            8,
            Marker.CONFIRMED,
            "Sub atâtea sesiuni pe lună se aplică regula Start: fără ore de vârf (R-087, Q12, "
            "confirmat de proprietar pe 30.09.2026).",
            positive_int,
            question="Q12",
        ),
        ConfigSpec(
            "subscriptions.freeze_days_per_year",
            14,
            Marker.CONFIRMED,
            "Zile de înghețare a abonamentului pe an calendaristic (R-086).",
            positive_int,
        ),
        ConfigSpec(
            "notifications.subscription_expiring_days",
            7,
            Marker.TO_CONFIRM,
            "Cu câte zile înainte de final primește clientul „abonamentul expiră” (§11).",
            positive_int,
            question="Q67",
        ),
        ConfigSpec(
            "ai.monthly_budget_usd",
            50,
            Marker.TO_CONFIRM,
            "Limita lunară de cost a AI-ului, în dolari (ADR-0019): atinsă, AI-ul nu mai răspunde "
            "până luna viitoare.",
            positive_int,
            question="Q68",
        ),
        ConfigSpec(
            "ai.input_usd_per_mtok",
            4,
            Marker.TO_CONFIRM,
            "Prețul modelului din AI_MODEL pentru textul citit, în dolari pe milion de tokeni "
            "(claude-opus-5-5: 4). Se schimbă odată cu modelul.",
            positive_int,
            question="Q68",
        ),
        ConfigSpec(
            "ai.output_usd_per_mtok",
            20,
            Marker.TO_CONFIRM,
            "Prețul modelului din AI_MODEL pentru textul scris, în dolari pe milion de tokeni "
            "(claude-opus-5-5: 20). Se schimbă odată cu modelul.",
            positive_int,
            question="Q68",
        ),
        ConfigSpec(
            "ai.effort",
            "medium",
            Marker.TO_CONFIRM,
            "Cât de mult „gândește” modelul la fiecare întrebare: low, medium, high, xhigh, max "
            "(mai mult = mai bine și mai scump).",
            ai_effort,
            question="Q68",
        ),
        ConfigSpec(
            "notifications.absences_after",
            2,
            Marker.TO_CONFIRM,
            "După câte antrenamente lipsă la rând primește clientul „ne e dor de tine” (§11).",
            positive_int,
            question="Q67",
        ),
        ConfigSpec(
            "notifications.sessions_left_at",
            2,
            Marker.TO_CONFIRM,
            "La câte sesiuni rămase în lună primește clientul „mai ai X sesiuni” (§11).",
            positive_int,
            question="Q67",
        ),
        ConfigSpec(
            "corporate.discount_percent",
            20,
            Marker.CONFIRMED,
            "Pachetul unic de firmă: reducerea (%) la abonamentele angajaților (R-088, Q35).",
            percent,
            question="Q35",
        ),
        ConfigSpec(
            "referrals.voucher_bands",
            ["off_peak", "semi_peak"],
            Marker.TO_CONFIRM,
            "Benzile orare în care e valabil voucherul „Adu un prieten” (R-120).",
            band_list,
            question="Q32",
        ),
        ConfigSpec(
            "referrals.voucher_valid_days",
            90,
            Marker.DEFAULT,
            "Câte zile e valabil voucherul „Adu un prieten” de la emitere.",
            positive_int,
        ),
        ConfigSpec(
            "referrals.claim_window_days",
            30,
            Marker.DEFAULT,
            "Zile de la crearea contului în care un membru nou poate folosi un cod de recomandare.",
            positive_int,
        ),
        ConfigSpec(
            "cards.diamond_emblems",
            ["jaguar", "panther", "toucan", "gorilla", "crocodile", "macaw", "anaconda", "leopard"],
            Marker.TO_CONFIRM,
            "Emblemele de junglă dintre care alege jucătorul promovat în Diamant (R-024).",
            emblem_list,
            question="Q1",
        ),
        ConfigSpec(
            "league.config",
            {},
            Marker.TO_CONFIRM,
            "Valorile ligii care diferă de cele implicite (§6); se aplică de la sezonul următor.",
            league_config,
            question="Q45",
        ),
        ConfigSpec(
            "league.score_window_minutes",
            30,
            Marker.CONFIRMED,
            "Fereastra pentru scor după finalul rezervării (§6.9, LG-093).",
            positive_int,
        ),
        ConfigSpec(
            "league.payment_deadline_hours",
            24,
            Marker.TO_CONFIRM,
            "Cât așteaptă un scor confirmat plata integrală a rezervării (LG-096).",
            positive_int,
            question="Q11",
        ),
        ConfigSpec(
            "league.kiosk_networks",
            ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"],
            Marker.DEFAULT,
            "Rețelele din care Chioșcul Ligii poate trimite scoruri (ADR-0012); "
            "se restrâng la rețeaua clubului la instalare.",
            networks,
        ),
        ConfigSpec(
            "league.rewards",
            {
                "ladder": "doubles",
                "kings": {
                    "top": 3,
                    "vouchers": [
                        {
                            "kind": "hour",
                            "value": 60,
                            "target": "booking",
                            "count": 2,
                            "valid_days": 90,
                        }
                    ],
                    "options": {},
                    "extras": {
                        "ro": "o cutie de mingi și cardul special al Regelui Junglei",
                        "en": "a box of balls and the special King of the Jungle card",
                    },
                },
                "tier_top": {
                    "top": 3,
                    "vouchers": [],
                    "options": {
                        "subscription": [
                            {
                                "kind": "percent",
                                "value": 15,
                                "target": "subscription",
                                "count": 1,
                                "valid_days": 31,
                            }
                        ],
                        "bookings": [
                            {
                                "kind": "percent",
                                "value": 20,
                                "target": "booking",
                                "count": 4,
                                "valid_days": 31,
                            }
                        ],
                    },
                    "extras": {"ro": "", "en": ""},
                },
            },
            Marker.CONFIRMED,
            "Recompensele de sezon (§6.12, Q6 confirmat pe 28.09.2026): Regii Junglei primesc "
            "2 ore, o cutie de mingi și cardul special; top 3 din fiecare rang aleg în cont "
            "15% la abonament sau 4 vouchere de 20% la rezervări. Se fixează la începutul "
            "sezonului.",
            league_rewards,
            question="Q6",
        ),
        ConfigSpec(
            "league.badges",
            {
                "giant_slayer_levels": 1.0,
                "win_streak": 10,
                "early_bird_before_hour": 10,
                "early_bird_matches": 5,
                "weekly_streak_weeks": 4,
            },
            Marker.TO_CONFIRM,
            "Pragurile insignelor (§6.15).",
            number_map(BADGE_KEYS),
        ),
        ConfigSpec(
            "league.match_of_the_day",
            {
                "promotion": 3,
                "promotion_margin_lp": 20,
                "top10_duel": 3,
                "top10": 1,
                "challenge": 2,
                "rivalry": 2,
                "rivalry_matches": 2,
                "rivalry_days": 30,
                "level_gap": 1,
                "level_gap_levels": 1.0,
            },
            Marker.TO_CONFIRM,
            "Scorul de miză pentru Meciul zilei (§6.15): puncte și praguri.",
            number_map(SPOTLIGHT_KEYS),
        ),
        ConfigSpec(
            "league.tournament_bonuses",
            {"winner": 30, "finalist": 20, "semifinal": 10, "quarterfinal": 5},
            Marker.TO_CONFIRM,
            "Bonusul de LP pe fază la turnee (§6.14, LG-141), peste LP × 1,5.",
            number_map(("winner", "finalist", "semifinal", "quarterfinal")),
            question="Q28",
        ),
        ConfigSpec(
            "checkout.max_amount",
            500_000,
            Marker.TO_CONFIRM,
            "Suma maximă a unei plăți în numerar la Chioșcul de Plăți (bani; 5 000 lei).",
            positive_int,
            question="Q53",
        ),
        ConfigSpec(
            "checkout.vat_groups",
            dict.fromkeys(REVENUE_CATEGORIES, "A"),
            Marker.TO_CONFIRM,
            "Grupa de TVA a casei de marcat pentru fiecare categorie de venit "
            "(se confirmă cu contabilul clubului).",
            vat_groups,
            question="Q53",
        ),
        ConfigSpec(
            "checkout.pin_max_failures",
            5,
            Marker.TO_CONFIRM,
            "Câte încercări greșite de PIN la chioșc până la blocare (modul personal).",
            positive_int,
            question="Q54",
        ),
        ConfigSpec(
            "checkout.pin_lock_minutes",
            15,
            Marker.TO_CONFIRM,
            "Cât rămâne blocat PIN-ul după prea multe încercări greșite (minute).",
            positive_int,
            question="Q54",
        ),
        ConfigSpec(
            "screens.pairs_from_scan_order",
            True,
            Marker.CONFIRMED,
            "Ecranul terenului: dacă echipele nu sunt încă știute, 4 jucători apar în perechi, "
            "în ordinea scanării la intrarea pe teren; jucătorii le pot schimba la Chioșcul "
            "Ligii (Q55, confirmat de proprietar pe 29.09.2026).",
            boolean,
            question="Q55",
        ),
        ConfigSpec(
            "screens.announcements",
            [],
            Marker.CONFIRMED,
            "Anunțurile clubului pe ecrane (reclame interne, §8.5), în română și engleză.",
            announcements,
            question="Q55",
        ),
        ConfigSpec(
            "screens.qr_url",
            "",
            Marker.DEFAULT,
            "Adresa din codul QR de pe ecrane (goală: pagina publică a ligii de pe site).",
            optional_url,
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
