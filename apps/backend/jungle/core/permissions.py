"""Staff roles and the actions each role may perform (§8.1, ADR-0011).

Every authenticated person is a player/client; staff roles are granted explicitly
(`accounts.UserRole`), globally or for one location. Permissions are checked in the
service layer, never only in the interface. Device roles live on `devices.Device`.
"""

from __future__ import annotations

from enum import StrEnum

from django.db import models


class Role(models.TextChoices):
    ADMIN = "admin", "Admin"
    MANAGER = "manager", "Manager"
    RECEPTION = "reception", "Recepție"
    COACH = "coach", "Antrenor / Instructor"


class Action(StrEnum):
    USERS_VIEW = "users.view"
    USERS_MANAGE = "users.manage"
    ROLES_MANAGE = "roles.manage"
    GUEST_ACCOUNT_CREATE = "accounts.create_guest"
    LOCATIONS_MANAGE = "locations.manage"
    RESOURCES_MANAGE = "resources.manage"
    DEVICES_MANAGE = "devices.manage"
    FLAGS_MANAGE = "flags.manage"
    CONFIG_VIEW = "config.view"
    CONFIG_MANAGE = "config.manage"
    AUDIT_VIEW = "audit.view"


ROLE_ACTIONS: dict[Role, frozenset[Action]] = {
    Role.ADMIN: frozenset(Action),
    Role.MANAGER: frozenset(
        {
            Action.USERS_VIEW,
            Action.GUEST_ACCOUNT_CREATE,
            Action.LOCATIONS_MANAGE,
            Action.RESOURCES_MANAGE,
            Action.CONFIG_VIEW,
            Action.CONFIG_MANAGE,
            Action.AUDIT_VIEW,
        }
    ),
    Role.RECEPTION: frozenset({Action.USERS_VIEW, Action.GUEST_ACCOUNT_CREATE}),
    # Coaches get their own actions (programme, attendance, level validation) in later stages.
    Role.COACH: frozenset(),
}
