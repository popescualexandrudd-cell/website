from django.contrib import admin

from jungle.core.admin_site import AuditedAdmin, emergency_admin_site
from jungle.devices.models import Device


@admin.register(Device, site=emergency_admin_site)
class DeviceAdmin(AuditedAdmin):
    list_display = ("name", "kind", "location", "is_active", "last_seen_at")
    list_filter = ("kind", "location", "is_active")
    readonly_fields = ("last_seen_at",)
