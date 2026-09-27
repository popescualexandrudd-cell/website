from django.contrib import admin

from jungle.attendance.models import BookingRestriction, Scan, StaffNotice
from jungle.core.admin_site import ReadOnlyAdmin, emergency_admin_site


@admin.register(Scan, site=emergency_admin_site)
class ScanAdmin(ReadOnlyAdmin):
    list_display = ("scanned_at", "kind", "location", "resource")
    list_filter = ("kind", "location")


@admin.register(BookingRestriction, site=emergency_admin_site)
class BookingRestrictionAdmin(ReadOnlyAdmin):
    list_display = ("user", "no_show_count", "created_at", "lifted_at")


@admin.register(StaffNotice, site=emergency_admin_site)
class StaffNoticeAdmin(ReadOnlyAdmin):
    list_display = ("created_at", "kind", "recipient_role", "read_at")
