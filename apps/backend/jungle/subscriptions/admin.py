from django.contrib import admin

from jungle.core.admin_site import AuditedAdmin, ReadOnlyAdmin, emergency_admin_site
from jungle.subscriptions.models import (
    CorporateAccount,
    CorporateMember,
    Subscription,
    SubscriptionRate,
    SubscriptionUse,
)


@admin.register(SubscriptionRate, site=emergency_admin_site)
class SubscriptionRateAdmin(AuditedAdmin):
    list_display = ("location", "sport", "sessions_per_month", "monthly_price", "marker")
    list_filter = ("sport", "marker")


@admin.register(Subscription, site=emergency_admin_site)
class SubscriptionAdmin(ReadOnlyAdmin):
    list_display = ("user", "period", "starts_on", "ends_on", "status", "price_total", "corporate")
    list_filter = ("status", "period")


@admin.register(SubscriptionUse, site=emergency_admin_site)
class SubscriptionUseAdmin(ReadOnlyAdmin):
    list_display = ("component", "cycle", "created_at", "released_at")


@admin.register(CorporateAccount, site=emergency_admin_site)
class CorporateAccountAdmin(AuditedAdmin):
    list_display = ("name", "registration_code", "billing_email", "is_active")


@admin.register(CorporateMember, site=emergency_admin_site)
class CorporateMemberAdmin(ReadOnlyAdmin):
    list_display = ("account", "user", "added_at", "removed_at")
