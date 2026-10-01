from django.contrib import admin

from jungle.core.admin_site import ReadOnlyAdmin, emergency_admin_site
from jungle.notifications.models import Notification, Template


@admin.register(Notification, site=emergency_admin_site)
class NotificationAdmin(ReadOnlyAdmin):
    list_display = ("event", "channel", "user", "status", "attempts", "created_at", "sent_at")
    list_filter = ("status", "channel", "event")
    exclude = ("context",)


@admin.register(Template, site=emergency_admin_site)
class TemplateAdmin(ReadOnlyAdmin):
    list_display = ("event", "channel", "language", "subject", "updated_at")
