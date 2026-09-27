from django.contrib import admin

from jungle.core.admin_site import AuditedAdmin, emergency_admin_site
from jungle.pricing.models import PriceRate


@admin.register(PriceRate, site=emergency_admin_site)
class PriceRateAdmin(AuditedAdmin):
    list_display = (
        "location",
        "resource_kind",
        "product",
        "season",
        "band",
        "customer_type",
        "amount_per_half_hour",
        "marker",
    )
    list_filter = ("location", "resource_kind", "product", "marker")
