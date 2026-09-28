from typing import Any

from django.contrib import admin
from django.http import HttpRequest

from jungle.core.admin_site import ReadOnlyAdmin, emergency_admin_site
from jungle.league.models import (
    Badge,
    Challenge,
    Fixture,
    LeagueEvent,
    LeagueMatch,
    LeaguePlayer,
    LeagueSeason,
    LevelQuestionnaire,
    MatchOfTheDay,
    MatchPlayer,
    MatchTransition,
    SeasonAward,
    Standing,
    Tournament,
    TournamentEntry,
)


@admin.register(LeagueSeason, site=emergency_admin_site)
class LeagueSeasonAdmin(ReadOnlyAdmin):
    list_display = ("name", "number", "location", "status", "starts_at", "ends_at")
    list_filter = ("status", "location")
    exclude = ("base_state",)


@admin.register(LeaguePlayer, site=emergency_admin_site)
class LeaguePlayerAdmin(ReadOnlyAdmin):
    list_display = ("user", "status", "joined_at", "left_at")
    list_filter = ("status",)


@admin.register(LevelQuestionnaire, site=emergency_admin_site)
class LevelQuestionnaireAdmin(ReadOnlyAdmin):
    list_display = ("user", "estimated_level", "validated_level", "submitted_at", "validated_at")


@admin.register(LeagueEvent, site=emergency_admin_site)
class LeagueEventAdmin(ReadOnlyAdmin):
    list_display = ("season", "kind", "ref", "at", "created_at")
    list_filter = ("kind", "season")


@admin.register(Standing, site=emergency_admin_site)
class StandingAdmin(ReadOnlyAdmin):
    list_display = ("season", "ladder", "position", "competitor_id", "tier", "division", "lp")
    list_filter = ("season", "ladder")


class MatchPlayerInline(admin.TabularInline):  # type: ignore[type-arg]
    model = MatchPlayer
    extra = 0
    can_delete = False
    readonly_fields = ("user", "side", "response", "responded_at", "device")

    def has_add_permission(self, request: HttpRequest, obj: Any = None) -> bool:
        return False


@admin.register(LeagueMatch, site=emergency_admin_site)
class LeagueMatchAdmin(ReadOnlyAdmin):
    list_display = ("finished_at", "location", "kind", "status", "applied_at")
    list_filter = ("status", "kind", "location")
    inlines = (MatchPlayerInline,)


@admin.register(MatchTransition, site=emergency_admin_site)
class MatchTransitionAdmin(ReadOnlyAdmin):
    list_display = ("match", "status", "at", "reason")
    list_filter = ("status",)


@admin.register(Challenge, site=emergency_admin_site)
class ChallengeAdmin(ReadOnlyAdmin):
    list_display = ("created_at", "ladder", "status", "respond_by", "play_by", "refusal_outcome")
    list_filter = ("status", "ladder", "season")


@admin.register(SeasonAward, site=emergency_admin_site)
class SeasonAwardAdmin(ReadOnlyAdmin):
    list_display = ("season", "kind", "tier", "position", "user")
    list_filter = ("season", "kind")


@admin.register(Badge, site=emergency_admin_site)
class BadgeAdmin(ReadOnlyAdmin):
    list_display = ("user", "code", "key", "awarded_at")
    list_filter = ("code",)


@admin.register(MatchOfTheDay, site=emergency_admin_site)
class MatchOfTheDayAdmin(ReadOnlyAdmin):
    list_display = ("day", "location", "booking", "chosen_by", "reason")


@admin.register(Tournament, site=emergency_admin_site)
class TournamentAdmin(ReadOnlyAdmin):
    list_display = ("name", "format", "status", "starts_at", "entry_fee")
    list_filter = ("status", "format")


@admin.register(TournamentEntry, site=emergency_admin_site)
class TournamentEntryAdmin(ReadOnlyAdmin):
    list_display = ("tournament", "seed", "status", "position", "bonus_lp")


@admin.register(Fixture, site=emergency_admin_site)
class FixtureAdmin(ReadOnlyAdmin):
    list_display = ("tournament", "phase", "round", "slot", "status", "winner")
    list_filter = ("status",)
