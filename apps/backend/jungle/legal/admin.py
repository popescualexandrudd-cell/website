from django.contrib import admin

from jungle.core.admin_site import ReadOnlyAdmin, emergency_admin_site
from jungle.legal.models import Consent, LegalDocument


@admin.register(LegalDocument, site=emergency_admin_site)
class LegalDocumentAdmin(ReadOnlyAdmin):
    list_display = ("kind", "version", "language", "title", "is_demo", "published_at")
    list_filter = ("kind", "language", "is_demo")


@admin.register(Consent, site=emergency_admin_site)
class ConsentAdmin(ReadOnlyAdmin):
    list_display = ("user", "document", "action", "language", "device", "occurred_at")
    list_filter = ("action", "document__kind")
