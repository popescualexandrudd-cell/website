"""Profile updates, guest accounts (Q8), child accounts (Q7), staff roles and user status."""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import date

from django.db import IntegrityError, transaction
from django.db.models import Q, QuerySet
from django.http import HttpRequest

from jungle.accounts.models import AccountType, GuardianLink, User, UserRole
from jungle.accounts.services import emails
from jungle.accounts.services.authz import authorize
from jungle.accounts.services.validation import (
    check_birth_date,
    clean_email,
    clean_phone,
    email_taken,
)
from jungle.audit import services as audit
from jungle.configuration.services import require_flag
from jungle.core.errors import DomainError, ErrorCode
from jungle.core.permissions import Action, Role
from jungle.locations.models import Location

ADULT_AGE = 18


# ---------------------------------------------------------------- own profile
@dataclass(frozen=True)
class ProfileChanges:
    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None
    preferred_language: str | None = None


def update_profile(request: HttpRequest, user: User, changes: ProfileChanges) -> User:
    before = audit.snapshot(user)
    if changes.first_name is not None:
        user.first_name = changes.first_name.strip()
    if changes.last_name is not None:
        user.last_name = changes.last_name.strip()
    if changes.phone is not None:
        user.phone = clean_phone(changes.phone)
    if changes.preferred_language is not None:
        user.preferred_language = changes.preferred_language
    user.save()
    audit.record(
        audit.actor_from_request(request),
        "accounts.profile_updated",
        target=user,
        before=before,
        after=audit.snapshot(user),
    )
    return user


# ---------------------------------------------------------------- guests (Q8)
def create_guest(
    request: HttpRequest, first_name: str, last_name: str, phone: str, email: str
) -> User:
    authorize(request, Action.GUEST_ACCOUNT_CREATE)
    require_flag("guest_quick_accounts")
    email = clean_email(email)
    phone = clean_phone(phone)
    if email_taken(email):
        raise DomainError(ErrorCode.ACCOUNTS_EMAIL_TAKEN, status=409)
    try:
        with transaction.atomic():
            user = User.objects.create_user(
                email,
                None,
                first_name=first_name.strip(),
                last_name=last_name.strip(),
                phone=phone,
                account_type=AccountType.GUEST,
            )
            audit.record(
                audit.actor_from_request(request),
                "accounts.guest_created",
                target=user,
                after=audit.snapshot(user),
            )
            transaction.on_commit(lambda: emails.send_password_reset_email(user, "account_claim"))
    except IntegrityError as exc:
        raise DomainError(ErrorCode.ACCOUNTS_EMAIL_TAKEN, status=409) from exc
    return user


# ---------------------------------------------------------------- children (Q7)
def create_child(
    request: HttpRequest, guardian: User, first_name: str, last_name: str, date_of_birth: date
) -> User:
    require_flag("child_accounts")
    if guardian.date_of_birth is None or check_birth_date(guardian.date_of_birth) < ADULT_AGE:
        raise DomainError(ErrorCode.ACCOUNTS_GUARDIAN_NOT_ADULT, status=403)
    if check_birth_date(date_of_birth) >= ADULT_AGE:
        raise DomainError(ErrorCode.ACCOUNTS_CHILD_NOT_MINOR)
    with transaction.atomic():
        child = User.objects.create_user(
            None,
            None,
            first_name=first_name.strip(),
            last_name=last_name.strip(),
            date_of_birth=date_of_birth,
            preferred_language=guardian.preferred_language,
            account_type=AccountType.CHILD,
        )
        GuardianLink.objects.create(guardian=guardian, child=child)
        audit.record(
            audit.actor_from_request(request),
            "accounts.child_created",
            target=child,
            after={**audit.snapshot(child), "guardian_id": guardian.pk},
        )
    return child


def children_of(guardian: User) -> QuerySet[User]:
    return User.objects.filter(guardian_links__guardian=guardian).order_by("first_name")


# ---------------------------------------------------------------- staff views
def get_user(user_id: uuid.UUID) -> User:
    user = User.objects.filter(pk=user_id).first()
    if user is None:
        raise DomainError(ErrorCode.ACCOUNTS_NOT_FOUND, status=404)
    return user


def search_users(
    request: HttpRequest, query: str, limit: int, offset: int
) -> tuple[int, list[User]]:
    authorize(request, Action.USERS_VIEW)
    qs = User.objects.all()
    for term in query.split():
        qs = qs.filter(
            Q(first_name__icontains=term)
            | Q(last_name__icontains=term)
            | Q(email__icontains=term)
            | Q(phone__icontains=term)
        )
    return qs.count(), list(qs.order_by("last_name", "first_name", "pk")[offset : offset + limit])


def user_detail(request: HttpRequest, user_id: uuid.UUID) -> User:
    authorize(request, Action.USERS_VIEW)
    return get_user(user_id)


def _is_last_active_global_admin(user: User) -> bool:
    admins = UserRole.objects.filter(role=Role.ADMIN, location__isnull=True, user__is_active=True)
    return admins.filter(user=user).exists() and admins.exclude(user=user).count() == 0


def set_active(request: HttpRequest, user_id: uuid.UUID, active: bool, reason: str) -> User:
    authorize(request, Action.USERS_MANAGE)
    with transaction.atomic():
        user = get_user(user_id)
        if not active and _is_last_active_global_admin(user):
            raise DomainError(ErrorCode.ROLES_LAST_ADMIN, status=409)
        before = {"is_active": user.is_active}
        user.is_active = active
        user.save(update_fields=["is_active"])
        audit.record(
            audit.actor_from_request(request),
            "accounts.activated" if active else "accounts.deactivated",
            target=user,
            before=before,
            after={"is_active": active},
            reason=reason,
        )
    return user


# ---------------------------------------------------------------- roles
def grant_role(
    request: HttpRequest, user_id: uuid.UUID, role: Role, location_id: uuid.UUID | None, reason: str
) -> UserRole:
    actor_user = authorize(request, Action.ROLES_MANAGE)
    user = get_user(user_id)
    location = None
    if location_id is not None:
        location = Location.objects.filter(pk=location_id).first()
        if location is None:
            raise DomainError(ErrorCode.LOCATIONS_NOT_FOUND, status=404)
    if UserRole.objects.filter(user=user, role=role, location=location).exists():
        raise DomainError(ErrorCode.ROLES_ALREADY_GRANTED, status=409)
    try:
        with transaction.atomic():
            granted = UserRole.objects.create(
                user=user, role=role, location=location, granted_by=actor_user
            )
            audit.record(
                audit.actor_from_request(request),
                "roles.granted",
                target=user,
                after={"role": role, "location_id": location_id},
                reason=reason,
            )
    except IntegrityError as exc:
        raise DomainError(ErrorCode.ROLES_ALREADY_GRANTED, status=409) from exc
    return granted


def revoke_role(request: HttpRequest, role_id: int, reason: str) -> None:
    authorize(request, Action.ROLES_MANAGE)
    with transaction.atomic():
        granted = (
            UserRole.objects.select_for_update().filter(pk=role_id).select_related("user").first()
        )
        if granted is None:
            raise DomainError(ErrorCode.ROLES_NOT_FOUND, status=404)
        is_global_admin = granted.role == Role.ADMIN and granted.location_id is None
        if is_global_admin and _is_last_active_global_admin(granted.user):
            raise DomainError(ErrorCode.ROLES_LAST_ADMIN, status=409)
        audit.record(
            audit.actor_from_request(request),
            "roles.revoked",
            target=granted.user,
            before={"role": granted.role, "location_id": granted.location_id},
            reason=reason,
        )
        granted.delete()
