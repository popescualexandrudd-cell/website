from django.contrib import admin

from jungle.cafe.models import CafeCategory, CafeOrder, CafeProduct
from jungle.core.admin_site import AuditedAdmin, ReadOnlyAdmin, emergency_admin_site


@admin.register(CafeCategory, site=emergency_admin_site)
class CafeCategoryAdmin(AuditedAdmin):
    list_display = ("name_ro", "location", "sort_order")


@admin.register(CafeProduct, site=emergency_admin_site)
class CafeProductAdmin(AuditedAdmin):
    list_display = ("name_ro", "category", "price", "marker", "is_available")
    list_filter = ("category", "is_available", "marker")


@admin.register(CafeOrder, site=emergency_admin_site)
class CafeOrderAdmin(ReadOnlyAdmin):
    list_display = ("day", "number", "status", "total", "created_at")
    list_filter = ("status",)
