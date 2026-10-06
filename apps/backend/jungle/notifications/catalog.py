"""The club's notifications (§11): every event, its category, its channels and whether the client
may turn it off.

Channels (Q17, Q18, DE_CONFIRMAT): email and push (the installable site); SMS is prepared and off
(`sms` switch); never WhatsApp at the launch (invariant 14). What is about the account's security,
a booking, money or a decision taken about the client cannot be turned off; the rest can, from the
account (`notifications.preferences`). The café order is announced on the café display (§8.4),
not here.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum


class Category(StrEnum):
    ACCOUNT = "account"
    BOOKINGS = "bookings"
    REMINDERS = "reminders"
    CLASSES = "classes"
    LEAGUE = "league"
    SUBSCRIPTIONS = "subscriptions"
    MONEY = "money"
    CLUB = "club"
    STAFF = "staff"


class Channel(StrEnum):
    EMAIL = "email"
    PUSH = "push"
    SMS = "sms"


BOTH = (Channel.EMAIL, Channel.PUSH)
PUSH_ONLY = (Channel.PUSH,)


@dataclass(frozen=True)
class Event:
    key: str
    category: Category
    channels: tuple[Channel, ...] = BOTH
    # Cannot be turned off: security, bookings, money, decisions about the client (§11).
    mandatory: bool = False


EVENTS: dict[str, Event] = {
    e.key: e
    for e in (
        # the account
        Event("account.email_confirm", Category.ACCOUNT, (Channel.EMAIL,), mandatory=True),
        Event("account.level_validated", Category.ACCOUNT, mandatory=True),
        Event("account.card_issued", Category.ACCOUNT, mandatory=True),
        # bookings
        Event("booking.confirmed", Category.BOOKINGS, mandatory=True),
        Event("booking.changed", Category.BOOKINGS, mandatory=True),
        Event("booking.cancelled", Category.BOOKINGS, mandatory=True),
        Event("booking.reminder_24h", Category.REMINDERS),
        Event("booking.reminder_2h", Category.REMINDERS, PUSH_ONLY),
        Event("waitlist.promoted", Category.CLASSES, mandatory=True),
        Event("classes.absences", Category.CLASSES),
        Event("booking.fee", Category.MONEY, mandatory=True),
        Event("booking.blocked", Category.BOOKINGS, mandatory=True),
        # the league
        Event("league.score_window", Category.LEAGUE, PUSH_ONLY),
        Event("league.score_proposed", Category.LEAGUE),
        Event("league.score_validated", Category.LEAGUE),
        Event("league.rank_changed", Category.LEAGUE),
        Event("league.diamond", Category.LEAGUE),
        Event("league.challenge_received", Category.LEAGUE),
        Event("league.challenge_answered", Category.LEAGUE),
        Event("league.decay_risk", Category.LEAGUE),
        Event("league.matches_needed", Category.LEAGUE),
        Event("league.season_end", Category.LEAGUE),
        Event("league.match_of_the_day", Category.LEAGUE, PUSH_ONLY),
        Event("league.inactive", Category.LEAGUE),
        Event("league.weekly_report", Category.LEAGUE),
        # subscriptions and money
        Event("subscription.bought", Category.SUBSCRIPTIONS, mandatory=True),
        Event("subscription.expiring", Category.SUBSCRIPTIONS),
        Event("subscription.frozen", Category.SUBSCRIPTIONS, mandatory=True),
        Event("subscription.sessions_left", Category.SUBSCRIPTIONS),
        Event("voucher.received", Category.MONEY),
        # the club
        Event("club.new_event", Category.CLUB),
        Event("club.feedback", Category.CLUB, (Channel.EMAIL,)),  # Q71, once after the 1st game
        # staff (sent to the managers and admins of the location)
        Event("staff.cash_low", Category.STAFF, mandatory=True),
        Event("staff.device_offline", Category.STAFF, mandatory=True),
        Event("staff.dispute", Category.STAFF, mandatory=True),
        Event("staff.backup_failed", Category.STAFF, mandatory=True),
    )
}

# Off until the client turns them on (news about the club is marketing: it needs consent,
# Law 506/2004 art. 12 and GDPR art. 6(1)(a)).
OPT_IN_CATEGORIES = (Category.CLUB,)

# What a client can turn off, by category (the account page lists these).
OPTIONAL_CATEGORIES = tuple(
    c for c in Category if any(e.category == c and not e.mandatory for e in EVENTS.values())
)


def event(key: str) -> Event:
    try:
        return EVENTS[key]
    except KeyError as exc:
        raise ValueError(f"unknown notification {key!r}") from exc
