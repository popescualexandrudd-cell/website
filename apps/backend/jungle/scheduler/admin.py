from django.contrib import admin

from jungle.core.admin_site import ReadOnlyAdmin, emergency_admin_site
from jungle.scheduler.models import JobRun


@admin.register(JobRun, site=emergency_admin_site)
class JobRunAdmin(ReadOnlyAdmin):
    list_display = ("job", "started_at", "finished_at", "ok")
    list_filter = ("job", "ok")
