"""The emergency Django admin (§8.6): only the global Admin role, only with 2FA.

Normal administration happens in apps/admin (Stage 10). Changes made here are audited.
"""

from __future__ import annotations

from typing import Any

from django import forms
from django.contrib import admin
from django.contrib.auth.forms import AuthenticationForm
from django.core.exceptions import ValidationError
from django.db import models
from django.forms.models import model_to_dict
from django.http import HttpRequest, HttpResponse

from jungle.accounts.models import User, normalize_email
from jungle.accounts.services.auth import (
    check_not_locked,
    clear_failures,
    register_failure,
    verify_second_factor,
)
from jungle.accounts.services.authz import MFA_SESSION_KEY
from jungle.audit import services as audit
from jungle.core.errors import DomainError
from jungle.core.http import client_ip


class OtpAdminLoginForm(AuthenticationForm):
    otp_code = forms.CharField(label="Cod 2FA (sau cod de recuperare)", max_length=20)

    error_messages = {
        **AuthenticationForm.error_messages,
        "locked": "Prea multe încercări. Încearcă din nou mai târziu.",
        "not_admin": "Acces permis doar rolului Admin.",
        "mfa": "Codul 2FA lipsește sau este greșit (2FA trebuie să fie activă).",
    }

    def clean(self) -> dict[str, Any]:
        email = normalize_email(self.cleaned_data.get("username") or "")
        self.cleaned_data["username"] = email
        ip = client_ip(self.request) if self.request else None
        try:
            check_not_locked(email, ip)
        except DomainError as exc:
            raise ValidationError(self.error_messages["locked"], code="locked") from exc
        try:
            cleaned = super().clean()
        except ValidationError:
            register_failure(email, ip)
            raise
        user = self.get_user()
        if not isinstance(user, User) or not user.has_global_admin_role():
            raise ValidationError(self.error_messages["not_admin"], code="not_admin")
        if not verify_second_factor(user, self.cleaned_data.get("otp_code", "")):
            register_failure(email, ip)
            raise ValidationError(self.error_messages["mfa"], code="mfa")
        clear_failures(email)
        return cleaned


class EmergencyAdminSite(admin.AdminSite):
    site_header = "Jungle Padel — admin tehnic (mod de urgență)"
    site_title = "Jungle Padel admin"
    index_title = "Doar pentru urgențe. Administrarea obișnuită se face în panoul de admin."
    login_form = OtpAdminLoginForm

    def has_permission(self, request: HttpRequest) -> bool:
        user = request.user
        return bool(
            user.is_active
            and user.is_authenticated
            and isinstance(user, User)
            and user.has_global_admin_role()
            and request.session.get(MFA_SESSION_KEY) is True
        )

    def login(
        self, request: HttpRequest, extra_context: dict[str, Any] | None = None
    ) -> HttpResponse:
        response = super().login(request, extra_context)
        if (
            request.method == "POST"
            and response.status_code == 302
            and request.user.is_authenticated
        ):
            request.session[MFA_SESSION_KEY] = True
            audit.record(
                audit.actor_from_request(request),
                "auth.login",
                target=request.user,
                after={"staff": True, "mfa_verified": True, "via": "django-admin"},
            )
        return response


emergency_admin_site = EmergencyAdminSite(name="emergency_admin")


class ReadOnlyAdmin(admin.ModelAdmin):  # type: ignore[type-arg]
    def has_add_permission(self, request: HttpRequest, obj: Any = None) -> bool:
        return False

    def has_change_permission(self, request: HttpRequest, obj: Any = None) -> bool:
        return False

    def has_delete_permission(self, request: HttpRequest, obj: Any = None) -> bool:
        return False


class AuditedAdmin(admin.ModelAdmin):  # type: ignore[type-arg]
    """Add and change allowed (never delete); every save is written to the audit log."""

    def has_delete_permission(self, request: HttpRequest, obj: Any = None) -> bool:
        return False

    def save_model(self, request: HttpRequest, obj: models.Model, form: Any, change: bool) -> None:
        before = model_to_dict(type(obj)._default_manager.get(pk=obj.pk)) if change else None
        super().save_model(request, obj, form, change)
        label = obj._meta.label_lower.split(".")[1]
        audit.record(
            audit.actor_from_request(request),
            f"{label}.{'updated' if change else 'created'}",
            target=obj,
            before=before,
            after=audit.snapshot(obj),
            reason="django-admin",
        )
