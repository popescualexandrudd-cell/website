"""Stable API error codes (ADR-0018).

The API never returns user-facing text: it returns a code plus parameters, and every
interface translates the code from `packages/i18n` (`errors.<code>`). A test checks that
every code below has a Romanian and an English translation.
"""

from __future__ import annotations

from enum import StrEnum
from typing import Any


class ErrorCode(StrEnum):
    # Generic
    VALIDATION_INVALID = "validation.invalid"
    NOT_FOUND = "common.not_found"
    FEATURE_DISABLED = "feature.disabled"
    # Authentication / authorization
    AUTH_REQUIRED = "auth.required"
    AUTH_FORBIDDEN = "auth.forbidden"
    AUTH_MFA_REQUIRED = "auth.mfa_required"
    AUTH_INVALID_CREDENTIALS = "auth.invalid_credentials"
    AUTH_LOCKED = "auth.locked"
    AUTH_MFA_CODE_REQUIRED = "auth.mfa_code_required"
    AUTH_MFA_CODE_INVALID = "auth.mfa_code_invalid"
    AUTH_CSRF_FAILED = "auth.csrf_failed"
    AUTH_RATE_LIMITED = "auth.rate_limited"
    MFA_ALREADY_ENABLED = "mfa.already_enabled"
    MFA_SETUP_NOT_STARTED = "mfa.setup_not_started"
    # Accounts
    ACCOUNTS_EMAIL_INVALID = "accounts.email_invalid"
    ACCOUNTS_EMAIL_TAKEN = "accounts.email_taken"
    ACCOUNTS_PHONE_INVALID = "accounts.phone_invalid"
    ACCOUNTS_PASSWORD_WEAK = "accounts.password_weak"
    ACCOUNTS_BIRTH_DATE_INVALID = "accounts.birth_date_invalid"
    ACCOUNTS_TOO_YOUNG = "accounts.too_young_for_self_registration"
    ACCOUNTS_TOKEN_INVALID = "accounts.token_invalid"
    ACCOUNTS_TOKEN_EXPIRED = "accounts.token_expired"
    ACCOUNTS_CURRENT_PASSWORD_INCORRECT = "accounts.current_password_incorrect"
    ACCOUNTS_GUARDIAN_NOT_ADULT = "accounts.guardian_not_adult"
    ACCOUNTS_CHILD_NOT_MINOR = "accounts.child_not_minor"
    ACCOUNTS_NOT_FOUND = "accounts.not_found"
    ROLES_ALREADY_GRANTED = "roles.already_granted"
    ROLES_NOT_FOUND = "roles.not_found"
    ROLES_LAST_ADMIN = "roles.last_admin"
    # Configuration
    FLAGS_UNKNOWN = "flags.unknown"
    CONFIG_UNKNOWN_KEY = "config.unknown_key"
    CONFIG_INVALID_VALUE = "config.invalid_value"
    # Legal
    LEGAL_DOCUMENT_UNAVAILABLE = "legal.document_unavailable"
    LEGAL_CONSENT_MISSING = "legal.consent_missing"
    LEGAL_CONSENT_OUTDATED = "legal.consent_outdated"
    # Locations, resources, devices
    LOCATIONS_NOT_FOUND = "locations.not_found"
    LOCATIONS_SLUG_TAKEN = "locations.slug_taken"
    RESOURCES_NOT_FOUND = "resources.not_found"
    RESOURCES_SLUG_TAKEN = "resources.slug_taken"
    RESOURCES_INVALID_PARENT = "resources.invalid_parent"
    RESOURCES_INVALID_CAPACITY = "resources.invalid_capacity"
    DEVICES_NOT_FOUND = "devices.not_found"


class DomainError(Exception):
    """A business-rule violation, returned to clients as `{"error": {"code", "params"}}`."""

    def __init__(self, code: ErrorCode, status: int = 400, params: dict[str, Any] | None = None):
        super().__init__(code.value)
        self.code = code
        self.status = status
        self.params = params or {}
