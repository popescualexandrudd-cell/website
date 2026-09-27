"""API schemas for accounts."""

from __future__ import annotations

import uuid
from datetime import date, datetime

from ninja import Field, Schema

from jungle.accounts.models import User, UserRole


class RoleOut(Schema):
    id: int
    role: str
    location_id: uuid.UUID | None


class MeOut(Schema):
    id: uuid.UUID
    email: str | None
    first_name: str
    last_name: str
    phone: str
    date_of_birth: date | None
    preferred_language: str
    account_type: str
    email_verified: bool
    created_at: datetime
    roles: list[RoleOut]
    mfa_enabled: bool
    mfa_verified: bool


def role_out(role: UserRole) -> RoleOut:
    return RoleOut(id=role.pk, role=role.role, location_id=role.location_id)


def me_out(user: User, mfa_verified: bool) -> MeOut:
    return MeOut(
        id=user.pk,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        phone=user.phone,
        date_of_birth=user.date_of_birth,
        preferred_language=user.preferred_language,
        account_type=user.account_type,
        email_verified=user.email_verified_at is not None,
        created_at=user.created_at,
        roles=[role_out(r) for r in user.roles.all()],
        mfa_enabled=user.totp_confirmed_at is not None,
        mfa_verified=mfa_verified,
    )


LanguageField = Field(pattern=r"^(ro|en)$")


class AcceptedDocumentIn(Schema):
    kind: str
    version: int
    language: str = Field(pattern=r"^(ro|en)$")


class RegisterIn(Schema):
    email: str = Field(max_length=254)
    password: str = Field(max_length=128)
    first_name: str = Field(min_length=1, max_length=150)
    last_name: str = Field(min_length=1, max_length=150)
    phone: str = Field(min_length=4, max_length=30)
    date_of_birth: date
    preferred_language: str = Field(default="ro", pattern=r"^(ro|en)$")
    accepted_documents: list[AcceptedDocumentIn]


class LoginIn(Schema):
    email: str = Field(max_length=254)
    password: str = Field(max_length=128)
    otp_code: str | None = Field(default=None, max_length=20)


class LoginOut(Schema):
    user: MeOut
    mfa_setup_required: bool


class SessionOut(Schema):
    authenticated: bool
    user: MeOut | None


class CsrfOut(Schema):
    csrf_token: str


class TokenIn(Schema):
    token: str = Field(max_length=500)


class EmailIn(Schema):
    email: str = Field(max_length=254)


class PasswordResetConfirmIn(Schema):
    uid: str = Field(max_length=100)
    token: str = Field(max_length=100)
    new_password: str = Field(max_length=128)


class PasswordChangeIn(Schema):
    current_password: str = Field(max_length=128)
    new_password: str = Field(max_length=128)


class ProfileIn(Schema):
    first_name: str | None = Field(default=None, min_length=1, max_length=150)
    last_name: str | None = Field(default=None, min_length=1, max_length=150)
    phone: str | None = Field(default=None, min_length=4, max_length=30)
    preferred_language: str | None = Field(default=None, pattern=r"^(ro|en)$")


class MfaSetupOut(Schema):
    secret: str
    otpauth_uri: str


class MfaConfirmIn(Schema):
    code: str = Field(max_length=10)


class RecoveryCodesOut(Schema):
    recovery_codes: list[str]


class ChildIn(Schema):
    first_name: str = Field(min_length=1, max_length=150)
    last_name: str = Field(min_length=1, max_length=150)
    date_of_birth: date


class ChildOut(Schema):
    id: uuid.UUID
    first_name: str
    last_name: str
    date_of_birth: date | None


class GuestIn(Schema):
    first_name: str = Field(min_length=1, max_length=150)
    last_name: str = Field(min_length=1, max_length=150)
    phone: str = Field(min_length=4, max_length=30)
    email: str = Field(max_length=254)


class UserSummaryOut(Schema):
    id: uuid.UUID
    email: str | None
    first_name: str
    last_name: str
    phone: str
    account_type: str
    is_active: bool
    is_demo: bool


class UserPageOut(Schema):
    total: int
    items: list[UserSummaryOut]


class ConsentOut(Schema):
    document_kind: str
    document_version: int
    language: str
    action: str
    text_sha256: str
    occurred_at: datetime
    device_id: uuid.UUID | None


class UserDetailOut(Schema):
    """Everything the admin sees about a person so far (R-004; grows with each stage)."""

    id: uuid.UUID
    email: str | None
    first_name: str
    last_name: str
    phone: str
    date_of_birth: date | None
    preferred_language: str
    account_type: str
    is_active: bool
    is_demo: bool
    created_at: datetime
    email_verified_at: datetime | None
    mfa_enabled: bool
    roles: list[RoleOut]
    consents: list[ConsentOut]
    guardian_ids: list[uuid.UUID]


class RoleGrantIn(Schema):
    role: str = Field(pattern=r"^(admin|manager|reception|coach)$")
    location_id: uuid.UUID | None = None
    reason: str = ""


class ActiveIn(Schema):
    is_active: bool
    reason: str = Field(min_length=3)
