from django.contrib import admin

from jungle.core.admin_site import ReadOnlyAdmin, emergency_admin_site
from jungle.feedback.models import Feedback


@admin.register(Feedback, site=emergency_admin_site)
class FeedbackAdmin(ReadOnlyAdmin):
    list_display = ("asked_at", "score", "answered_at", "location")
    list_filter = ("location",)
