from django.contrib import admin

from jungle.core.admin_site import AuditedAdmin, emergency_admin_site
from jungle.locations.models import Location, Resource


@admin.register(Location, site=emergency_admin_site)
class LocationAdmin(AuditedAdmin):
    list_display = ("name", "slug", "city", "is_active")


@admin.register(Resource, site=emergency_admin_site)
class ResourceAdmin(AuditedAdmin):
    list_display = ("name", "kind", "location", "parent", "capacity", "is_active", "sort_order")
    list_filter = ("location", "kind", "is_active")
