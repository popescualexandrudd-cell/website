"""The technical admin (`/django-admin/`): who asked not to appear by name on the screens."""

from django.contrib import admin

from jungle.screens.models import NameObjection


@admin.register(NameObjection)
class NameObjectionAdmin(admin.ModelAdmin):  # type: ignore[type-arg]
    list_display = ("user", "created_at", "note")
    raw_id_fields = ("user",)
