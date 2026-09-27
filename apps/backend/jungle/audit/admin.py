from django.contrib import admin

from jungle.audit.models import AuditLog
from jungle.core.admin_site import ReadOnlyAdmin, emergency_admin_site


@admin.register(AuditLog, site=emergency_admin_site)
class AuditLogAdmin(ReadOnlyAdmin):
    list_display = (
        "occurred_at",
        "action",
        "actor_kind",
        "actor_label",
        "target_type",
        "target_id",
        "reason",
    )
    list_filter = ("actor_kind", "action", "target_type")
    search_fields = ("action", "actor_label", "target_id", "request_id")
    date_hierarchy = "occurred_at"
