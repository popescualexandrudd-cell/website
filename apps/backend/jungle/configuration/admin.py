from django.contrib import admin

from jungle.configuration.models import ConfigVersion, FeatureFlag
from jungle.configuration.registry import FLAGS
from jungle.core.admin_site import AuditedAdmin, ReadOnlyAdmin, emergency_admin_site


@admin.register(FeatureFlag, site=emergency_admin_site)
class FeatureFlagAdmin(AuditedAdmin):
    list_display = ("key", "enabled", "description", "updated_at")
    fields = ("key", "enabled")
    readonly_fields = ("key",)

    @admin.display(description="descriere")
    def description(self, obj: FeatureFlag) -> str:
        spec = FLAGS.get(obj.key)
        return spec.description if spec else "—"

    def has_add_permission(self, request, obj=None):  # type: ignore[no-untyped-def]
        return False


@admin.register(ConfigVersion, site=emergency_admin_site)
class ConfigVersionAdmin(ReadOnlyAdmin):
    list_display = ("key", "version", "marker", "effective_from", "created_at")
    list_filter = ("key", "marker")
