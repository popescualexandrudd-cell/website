from django.contrib import admin

from jungle.core.admin_site import ReadOnlyAdmin, emergency_admin_site
from jungle.league.models import (
    LeagueEvent,
    LeaguePlayer,
    LeagueSeason,
    LevelQuestionnaire,
    Standing,
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
