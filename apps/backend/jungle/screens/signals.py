"""What makes the screens reload (ADR-0005): bookings, check-ins on court, league changes
(every applied event saves the season's snapshot), the Match of the day, café orders."""

from __future__ import annotations

from typing import Any

from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from jungle.attendance.models import Scan
from jungle.bookings.models import Booking
from jungle.cafe.models import CafeOrder
from jungle.league.models import LeagueSeason, LeagueSnapshot, MatchOfTheDay
from jungle.screens.models import CourtLineup
from jungle.screens.realtime import changed


@receiver([post_save, post_delete], sender=Booking)
def booking_changed(sender: Any, instance: Booking, **kwargs: Any) -> None:
    changed(instance.location_id, "bookings")


@receiver(post_save, sender=Scan)
def scan_changed(sender: Any, instance: Scan, **kwargs: Any) -> None:
    changed(instance.location_id, "players")


@receiver(post_save, sender=CafeOrder)
def cafe_changed(sender: Any, instance: CafeOrder, **kwargs: Any) -> None:
    changed(instance.location_id, "cafe")


@receiver(post_save, sender=MatchOfTheDay)
def spotlight_changed(sender: Any, instance: MatchOfTheDay, **kwargs: Any) -> None:
    changed(instance.location_id, "league")


@receiver(post_save, sender=LeagueSnapshot)
def league_changed(sender: Any, instance: LeagueSnapshot, **kwargs: Any) -> None:
    location = LeagueSeason.objects.filter(pk=instance.season_id).values_list(
        "location_id", flat=True
    )
    changed(location.first(), "league")


@receiver(post_save, sender=CourtLineup)
def lineup_changed(sender: Any, instance: CourtLineup, **kwargs: Any) -> None:
    changed(instance.booking.location_id, "players")
