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
    WAITLIST_VIEW = "waitlist.view"
    WAITLIST_EXPORT = "waitlist.export"
    BOOKINGS_VIEW = "bookings.view"
    BOOKINGS_MANAGE = "bookings.manage"
    PRICING_MANAGE = "pricing.manage"
    CLASSES_MANAGE = "classes.manage"
    ATTENDANCE_RECORD = "attendance.record"
    ATTENDANCE_VIEW = "attendance.view"
    RESTRICTIONS_MANAGE = "restrictions.manage"
    EVENTS_MANAGE = "events.manage"


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
            Action.WAITLIST_VIEW,
            Action.WAITLIST_EXPORT,
            Action.BOOKINGS_VIEW,
            Action.BOOKINGS_MANAGE,
            Action.PRICING_MANAGE,
            Action.CLASSES_MANAGE,
            Action.ATTENDANCE_RECORD,
            Action.ATTENDANCE_VIEW,
            Action.RESTRICTIONS_MANAGE,
            Action.EVENTS_MANAGE,
        }
    ),
    Role.RECEPTION: frozenset(
        {
            Action.USERS_VIEW,
            Action.GUEST_ACCOUNT_CREATE,
            Action.BOOKINGS_VIEW,
            Action.BOOKINGS_MANAGE,
            Action.ATTENDANCE_RECORD,
            Action.ATTENDANCE_VIEW,
        }
    ),
    # Coaches and the Pilates instructor manage their programme and see attendance (R-033);
    # they decide on players blocked after repeated no-shows (R-073).
    Role.COACH: frozenset(
        {
            Action.BOOKINGS_VIEW,
            Action.CLASSES_MANAGE,
            Action.ATTENDANCE_VIEW,
            Action.RESTRICTIONS_MANAGE,
        }
    ),
}
