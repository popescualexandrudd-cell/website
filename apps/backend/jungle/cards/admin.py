from django.contrib import admin

from jungle.cards.models import MemberCard, PhysicalCardRequest
from jungle.core.admin_site import ReadOnlyAdmin, emergency_admin_site


@admin.register(MemberCard, site=emergency_admin_site)
class MemberCardAdmin(ReadOnlyAdmin):
    list_display = ("number", "status", "issued_at", "revoked_at")
    list_filter = ("status",)
    exclude = ("token", "wallet_auth_token")  # the QR code is a secret: shown only to its owner


@admin.register(PhysicalCardRequest, site=emergency_admin_site)
class PhysicalCardRequestAdmin(ReadOnlyAdmin):
    list_display = ("card", "reason", "emblem", "status", "created_at", "printed_at")
    list_filter = ("status", "reason")
