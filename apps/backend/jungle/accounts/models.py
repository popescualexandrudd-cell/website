"""Accounts, staff roles and guardian links (R-001, R-002, R-004, §8.1, Q7, Q8)."""

from __future__ import annotations

import uuid
from typing import Any, ClassVar

from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.db import models
from django.db.models.functions import Lower

from jungle.core.permissions import Role


class AccountType(models.TextChoices):
    FULL = "full", "Cont complet"
    GUEST = "guest", "Cont rapid (invitat)"
    CHILD = "child", "Cont de copil (gestionat de părinte)"


class Language(models.TextChoices):
    RO = "ro", "Română"
    EN = "en", "English"


def normalize_email(email: str) -> str:
    return email.strip().lower()


class UserManager(BaseUserManager["User"]):
    def create_user(self, email: str | None, password: str | None = None, **extra: Any) -> User:
        user = self.model(email=normalize_email(email) if email else None, **extra)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.full_clean(exclude=["password"])
        user.save(using=self._db)
        return user

    def create_superuser(self, email: str, password: str, **extra: Any) -> User:
        user = self.create_user(email, password, **extra)
        UserRole.objects.create(user=user, role=Role.ADMIN, location=None)
        return user


class User(AbstractBaseUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(max_length=254, unique=True, null=True, blank=True)
    first_name = models.CharField("prenume", max_length=150)
    last_name = models.CharField("nume", max_length=150)
    phone = models.CharField("telefon (E.164)", max_length=20, blank=True)
    date_of_birth = models.DateField("data nașterii", null=True, blank=True)
    preferred_language = models.CharField(
        max_length=5, choices=Language.choices, default=Language.RO
    )
    account_type = models.CharField(
        "tip cont", max_length=10, choices=AccountType.choices, default=AccountType.FULL
    )
    is_active = models.BooleanField("activ", default=True)
    is_demo = models.BooleanField(
        "demo", default=False, help_text="Date demo (seed), nu clienți reali."
    )
    created_at = models.DateTimeField("creat la", auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    email_verified_at = models.DateTimeField("email verificat la", null=True, blank=True)
    totp_secret = models.TextField(blank=True, help_text="Criptat (Fernet).")
    totp_confirmed_at = models.DateTimeField(null=True, blank=True)
    totp_last_step = models.BigIntegerField(null=True, blank=True)

    objects: ClassVar[UserManager] = UserManager()

    USERNAME_FIELD = "email"
    EMAIL_FIELD = "email"
    REQUIRED_FIELDS: ClassVar[list[str]] = ["first_name", "last_name"]

    class Meta:
        verbose_name = "utilizator"
        verbose_name_plural = "utilizatori"
        ordering = ["last_name", "first_name"]
        constraints = [
            models.UniqueConstraint(
                Lower("email"),
                condition=models.Q(email__isnull=False),
                name="user_email_ci_unique",
            ),
            models.CheckConstraint(
                condition=models.Q(email__isnull=False) | models.Q(account_type="child"),
                name="user_email_required_unless_child",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.last_name} {self.first_name}".strip()

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()

    def is_staff_member(self) -> bool:
        return self.roles.exists()

    def has_global_admin_role(self) -> bool:
        return self.roles.filter(role=Role.ADMIN, location__isnull=True).exists()

    # Used by the Django admin templates only (emergency mode, ADMIN role).
    @property
    def is_staff(self) -> bool:
        return bool(self.is_active and self.pk and self.has_global_admin_role())

    def has_perm(self, perm: str, obj: object = None) -> bool:
        return self.is_staff

    def has_module_perms(self, app_label: str) -> bool:
        return self.is_staff


class UserRole(models.Model):
    """A staff role; `location=None` means the role applies to every location."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="roles")
    role = models.CharField(max_length=20, choices=Role.choices)
    location = models.ForeignKey(
        "locations.Location", on_delete=models.PROTECT, null=True, blank=True, related_name="+"
    )
    granted_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    granted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "rol"
        verbose_name_plural = "roluri"
        constraints = [
            models.UniqueConstraint(
                fields=["user", "role", "location"],
                name="user_role_unique",
                nulls_distinct=False,
            )
        ]

    def __str__(self) -> str:
        where = self.location.name if self.location else "toate locațiile"
        return f"{self.user} — {self.get_role_display()} ({where})"


class GuardianLink(models.Model):
    """A parent or guardian managing a child's account (Q7; feature flag `child_accounts`)."""

    guardian = models.ForeignKey(User, on_delete=models.PROTECT, related_name="children_links")
    child = models.ForeignKey(User, on_delete=models.CASCADE, related_name="guardian_links")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["guardian", "child"], name="guardian_child_unique")
        ]
        verbose_name = "legătură părinte–copil"
        verbose_name_plural = "legături părinte–copil"

    def __str__(self) -> str:
        return f"{self.guardian} → {self.child}"


class MfaRecoveryCode(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="recovery_codes")
    code_hash = models.CharField(max_length=64)
    used_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"recovery code of {self.user_id} ({'used' if self.used_at else 'unused'})"
