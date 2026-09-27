from django.contrib import admin

from jungle.core.admin_site import ReadOnlyAdmin, emergency_admin_site
from jungle.waitlist.models import WaitlistEntry


@admin.register(WaitlistEntry, site=emergency_admin_site)
class WaitlistEntryAdmin(ReadOnlyAdmin):
    list_display = ("email", "name", "status", "language", "source", "created_at", "confirmed_at")
    list_filter = ("status", "language")
    search_fields = ("email", "name")
    exclude = ("email_sha256", "consent_user_agent")
