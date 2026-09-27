from django.contrib import admin

from jungle.core.admin_site import ReadOnlyAdmin, emergency_admin_site
from jungle.ledger.models import LedgerAccount, LedgerEntry, LedgerTransaction, Payment

# Money is read-only here: corrections are reversals through the API (R-064).


@admin.register(LedgerAccount, site=emergency_admin_site)
class LedgerAccountAdmin(ReadOnlyAdmin):
    list_display = ("code", "kind", "category", "currency")
    list_filter = ("kind",)


@admin.register(LedgerTransaction, site=emergency_admin_site)
class LedgerTransactionAdmin(ReadOnlyAdmin):
    list_display = ("created_at", "kind", "description", "reason")
    list_filter = ("kind",)


@admin.register(LedgerEntry, site=emergency_admin_site)
class LedgerEntryAdmin(ReadOnlyAdmin):
    list_display = ("transaction", "account", "amount")


@admin.register(Payment, site=emergency_admin_site)
class PaymentAdmin(ReadOnlyAdmin):
    list_display = ("created_at", "method", "amount", "tendered", "change", "fiscal_receipt")
    list_filter = ("method",)
