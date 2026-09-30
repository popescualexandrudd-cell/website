from django.contrib import admin

from jungle.core.admin_site import ReadOnlyAdmin, emergency_admin_site
from jungle.events.models import ClubEvent


@admin.register(ClubEvent, site=emergency_admin_site)
class ClubEventAdmin(ReadOnlyAdmin):
    list_display = ("title_ro", "kind", "starts_at", "ends_at", "published", "cancelled_at")
    list_filter = ("kind", "published", "location")
    search_fields = ("title_ro", "title_en")
