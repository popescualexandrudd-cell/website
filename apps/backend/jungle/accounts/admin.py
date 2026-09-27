from django.contrib import admin

from jungle.accounts.models import GuardianLink, User, UserRole
from jungle.core.admin_site import ReadOnlyAdmin, emergency_admin_site


class UserRoleInline(admin.TabularInline):  # type: ignore[type-arg]
    model = UserRole
    fk_name = "user"
    extra = 0
    can_delete = False
    readonly_fields = ("role", "location", "granted_by", "granted_at")

    def has_add_permission(self, request, obj=None):  # type: ignore[no-untyped-def]
        return False


@admin.register(User, site=emergency_admin_site)
class UserAdmin(ReadOnlyAdmin):
    list_display = (
        "last_name",
        "first_name",
        "email",
        "account_type",
        "is_active",
        "is_demo",
        "created_at",
        "email_verified_at",
    )
    list_filter = ("account_type", "is_active", "is_demo", "preferred_language")
    search_fields = ("first_name", "last_name", "email", "phone")
    exclude = ("password", "totp_secret", "totp_last_step")
    inlines = (UserRoleInline,)


@admin.register(UserRole, site=emergency_admin_site)
class UserRoleAdmin(ReadOnlyAdmin):
    list_display = ("user", "role", "location", "granted_by", "granted_at")
    list_filter = ("role",)


@admin.register(GuardianLink, site=emergency_admin_site)
class GuardianLinkAdmin(ReadOnlyAdmin):
    list_display = ("guardian", "child", "created_at")
