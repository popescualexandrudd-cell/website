from django.contrib import admin

from jungle.ai.models import AIInteraction
from jungle.core.admin_site import ReadOnlyAdmin, emergency_admin_site


@admin.register(AIInteraction, site=emergency_admin_site)
class AIInteractionAdmin(ReadOnlyAdmin):
    list_display = ("created_at", "context", "outcome", "model", "steps", "cost_micro_usd")
    list_filter = ("context", "outcome")
