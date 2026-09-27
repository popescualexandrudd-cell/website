from django.contrib import admin

from jungle.core.admin_site import ReadOnlyAdmin, emergency_admin_site
from jungle.rewards.models import Referral, Voucher


@admin.register(Voucher, site=emergency_admin_site)
class VoucherAdmin(ReadOnlyAdmin):
    list_display = ("code", "kind", "value", "target", "status", "valid_until", "source")
    list_filter = ("status", "kind", "source")


@admin.register(Referral, site=emergency_admin_site)
class ReferralAdmin(ReadOnlyAdmin):
    list_display = ("referrer", "referred", "status", "created_at", "rewarded_at")
