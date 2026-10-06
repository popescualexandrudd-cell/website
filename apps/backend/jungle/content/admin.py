from django.contrib import admin

from jungle.content.models import TextOverride
from jungle.core.admin_site import ReadOnlyAdmin, emergency_admin_site


@admin.register(TextOverride, site=emergency_admin_site)
class TextOverrideAdmin(ReadOnlyAdmin):
    list_display = ("key", "language", "published_at", "updated_at")
    list_filter = ("language",)
