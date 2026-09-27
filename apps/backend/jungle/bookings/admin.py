from django.contrib import admin

from jungle.bookings.models import (
    Booking,
    ClassEnrollment,
    ClassSession,
    EventRequest,
    SlotWaitlistEntry,
)
from jungle.core.admin_site import ReadOnlyAdmin, emergency_admin_site

# Bookings change only through the API, where the rules and the audit trail live.


@admin.register(Booking, site=emergency_admin_site)
class BookingAdmin(ReadOnlyAdmin):
    list_display = (
        "starts_at",
        "ends_at",
        "resource",
        "session_type",
        "status",
        "source",
        "price_total",
    )
    list_filter = ("location", "status", "session_type", "source")
    date_hierarchy = "starts_at"


@admin.register(SlotWaitlistEntry, site=emergency_admin_site)
class SlotWaitlistEntryAdmin(ReadOnlyAdmin):
    list_display = ("starts_at", "resource", "status", "priority", "created_at")
    list_filter = ("status",)


@admin.register(ClassSession, site=emergency_admin_site)
class ClassSessionAdmin(ReadOnlyAdmin):
    list_display = ("starts_at", "kind", "studio", "capacity", "status")
    list_filter = ("status", "kind")


@admin.register(ClassEnrollment, site=emergency_admin_site)
class ClassEnrollmentAdmin(ReadOnlyAdmin):
    list_display = ("session", "status", "created_at")
    list_filter = ("status",)


@admin.register(EventRequest, site=emergency_admin_site)
class EventRequestAdmin(ReadOnlyAdmin):
    list_display = ("starts_at", "room", "guests", "status", "decided_at")
    list_filter = ("status",)
