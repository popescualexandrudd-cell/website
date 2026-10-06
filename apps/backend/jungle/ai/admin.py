from django.contrib import admin

from jungle.ai.models import AIDraft, AIInteraction
from jungle.core.admin_site import ReadOnlyAdmin, emergency_admin_site


@admin.register(AIInteraction, site=emergency_admin_site)
class AIInteractionAdmin(ReadOnlyAdmin):
    list_display = ("created_at", "context", "outcome", "model", "steps", "cost_micro_usd")
    list_filter = ("context", "outcome")


@admin.register(AIDraft, site=emergency_admin_site)
class AIDraftAdmin(ReadOnlyAdmin):
    list_display = ("created_at", "kind", "language", "status", "requested_by")
    list_filter = ("kind", "status")
