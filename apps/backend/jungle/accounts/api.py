"""Account endpoints: /auth (public), /me (own account), /staff/users (staff)."""

from __future__ import annotations

import uuid
from typing import Annotated

from django.http import HttpRequest
from django.middleware.csrf import get_token
from ninja import Field, Router, Status

from jungle.accounts.models import User
from jungle.accounts.schemas import (
    ActiveIn,
    ChildIn,
    ChildOut,
    ConsentOut,
    CsrfOut,
    EmailIn,
    GuestIn,
    LoginIn,
    LoginOut,
    MeOut,
    MfaConfirmIn,
    MfaSetupOut,
    PasswordChangeIn,
    PasswordResetConfirmIn,
    ProfileIn,
    RecoveryCodesOut,
    RegisterIn,
    RoleGrantIn,
    RoleOut,
    SessionOut,
    TokenIn,
    UserDetailOut,
    UserPageOut,
    UserSummaryOut,
    me_out,
    role_out,
)
from jungle.accounts.services import auth, mfa, password, people, registration
from jungle.accounts.services.authz import current_user, mfa_verified
from jungle.core.permissions import Role
from jungle.core.schemas import OkOut, ReasonIn, errors
from jungle.core.security import require_csrf, session_auth
from jungle.legal import services as legal

auth_router = Router(tags=["auth"])
me_router = Router(tags=["me"], auth=session_auth)
staff_router = Router(tags=["staff: users"], auth=session_auth)


def _me(request: HttpRequest, user: User) -> MeOut:
    return me_out(user, mfa_verified(request))


# ---------------------------------------------------------------- /auth
@auth_router.get("/csrf", response=CsrfOut, auth=None)
def csrf(request: HttpRequest) -> CsrfOut:
    """Sets the CSRF cookie; web apps send its value in the X-CSRFToken header."""
    return CsrfOut(csrf_token=get_token(request))


@auth_router.get("/session", response=SessionOut, auth=None)
def session(request: HttpRequest) -> SessionOut:
    user = request.user
    if user.is_authenticated and user.is_active and isinstance(user, User):
        return SessionOut(authenticated=True, user=_me(request, user))
    return SessionOut(authenticated=False, user=None)


@auth_router.post(
    "/register", response={201: MeOut, **errors(400, 403, 404, 409, 422, 429)}, auth=None
)
def register(request: HttpRequest, payload: RegisterIn) -> Status[MeOut]:
    require_csrf(request)
    data = registration.RegistrationData(
        email=payload.email,
        password=payload.password,
        first_name=payload.first_name,
        last_name=payload.last_name,
        phone=payload.phone,
        date_of_birth=payload.date_of_birth,
        preferred_language=payload.preferred_language,
        accepted=[
            legal.AcceptedDocument(d.kind, d.version, d.language)
            for d in payload.accepted_documents
        ],
    )
    user = registration.register(request, data)
    auth.login_user(request, payload.email, payload.password, None)
    return Status(201, _me(request, user))


@auth_router.post("/login", response={200: LoginOut, **errors(401, 403, 422, 429)}, auth=None)
def login(request: HttpRequest, payload: LoginIn) -> LoginOut:
    require_csrf(request)
    result = auth.login_user(request, payload.email, payload.password, payload.otp_code)
    return LoginOut(user=_me(request, result.user), mfa_setup_required=result.mfa_setup_required)


@auth_router.post("/logout", response={200: OkOut, **errors(401, 403)}, auth=session_auth)
def logout(request: HttpRequest) -> OkOut:
    auth.logout_user(request)
    return OkOut()


@auth_router.post("/verify-email", response={200: OkOut, **errors(400, 403, 422)}, auth=None)
def verify_email(request: HttpRequest, payload: TokenIn) -> OkOut:
    require_csrf(request)
    registration.verify_email(request, payload.token)
    return OkOut()


@auth_router.post(
    "/verify-email/resend", response={200: OkOut, **errors(401, 403, 429)}, auth=session_auth
)
def resend_verification(request: HttpRequest) -> OkOut:
    registration.resend_verification(current_user(request))
    return OkOut()


@auth_router.post("/password-reset", response={202: OkOut, **errors(403, 422)}, auth=None)
def password_reset(request: HttpRequest, payload: EmailIn) -> Status[OkOut]:
    """Always answers 202, whether or not the address has an account."""
    require_csrf(request)
    password.request_reset(request, payload.email)
    return Status(202, OkOut())


@auth_router.post(
    "/password-reset/confirm", response={200: OkOut, **errors(400, 403, 422)}, auth=None
)
def password_reset_confirm(request: HttpRequest, payload: PasswordResetConfirmIn) -> OkOut:
    require_csrf(request)
    password.confirm_reset(request, payload.uid, payload.token, payload.new_password)
    return OkOut()


@auth_router.post(
    "/mfa/setup", response={200: MfaSetupOut, **errors(401, 403, 409)}, auth=session_auth
)
def mfa_setup(request: HttpRequest) -> MfaSetupOut:
    setup = mfa.start_setup(current_user(request))
    return MfaSetupOut(secret=setup.secret, otpauth_uri=setup.otpauth_uri)


@auth_router.post(
    "/mfa/confirm",
    response={200: RecoveryCodesOut, **errors(400, 401, 403, 409)},
    auth=session_auth,
)
def mfa_confirm(request: HttpRequest, payload: MfaConfirmIn) -> RecoveryCodesOut:
    codes = mfa.confirm_setup(request, current_user(request), payload.code)
    return RecoveryCodesOut(recovery_codes=codes)


# ---------------------------------------------------------------- /me
@me_router.get("", response=MeOut)
def me(request: HttpRequest) -> MeOut:
    return _me(request, current_user(request))


@me_router.patch("", response={200: MeOut, **errors(400, 401, 403, 422)})
def update_me(request: HttpRequest, payload: ProfileIn) -> MeOut:
    changes = people.ProfileChanges(**payload.dict(exclude_unset=True))
    user = people.update_profile(request, current_user(request), changes)
    return _me(request, user)


@me_router.post("/password", response={200: OkOut, **errors(400, 401, 403, 422)})
def change_password(request: HttpRequest, payload: PasswordChangeIn) -> OkOut:
    password.change_password(
        request, current_user(request), payload.current_password, payload.new_password
    )
    return OkOut()


@me_router.get("/children", response=list[ChildOut])
def list_children(request: HttpRequest) -> list[ChildOut]:
    return [ChildOut.from_orm(c) for c in people.children_of(current_user(request))]


@me_router.post("/children", response={201: ChildOut, **errors(400, 401, 403, 422)})
def create_child(request: HttpRequest, payload: ChildIn) -> Status[ChildOut]:
    child = people.create_child(
        request, current_user(request), payload.first_name, payload.last_name, payload.date_of_birth
    )
    return Status(201, ChildOut.from_orm(child))


# ---------------------------------------------------------------- /staff/users
@staff_router.get("/users", response={200: UserPageOut, **errors(401, 403)})
def search_users(
    request: HttpRequest,
    q: str = "",
    limit: Annotated[int, Field(ge=1, le=100)] = 50,
    offset: Annotated[int, Field(ge=0)] = 0,
) -> UserPageOut:
    total, users = people.search_users(request, q, limit, offset)
    return UserPageOut(total=total, items=[UserSummaryOut.from_orm(u) for u in users])


@staff_router.get("/users/{user_id}", response={200: UserDetailOut, **errors(401, 403, 404)})
def user_detail(request: HttpRequest, user_id: uuid.UUID) -> UserDetailOut:
    user = people.user_detail(request, user_id)
    return UserDetailOut(
        id=user.pk,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        phone=user.phone,
        date_of_birth=user.date_of_birth,
        preferred_language=user.preferred_language,
        account_type=user.account_type,
        is_active=user.is_active,
        is_demo=user.is_demo,
        created_at=user.created_at,
        email_verified_at=user.email_verified_at,
        mfa_enabled=user.totp_confirmed_at is not None,
        roles=[role_out(r) for r in user.roles.all()],
        consents=[
            ConsentOut(
                document_kind=c.document.kind,
                document_version=c.document.version,
                language=c.language,
                action=c.action,
                text_sha256=c.text_sha256,
                occurred_at=c.occurred_at,
                device_id=c.device_id,
            )
            for c in legal.consent_history(user)
        ],
        guardian_ids=[link.guardian_id for link in user.guardian_links.all()],
    )


@staff_router.post(
    "/users/{user_id}/active", response={200: UserSummaryOut, **errors(401, 403, 404, 409, 422)}
)
def set_active(request: HttpRequest, user_id: uuid.UUID, payload: ActiveIn) -> UserSummaryOut:
    return UserSummaryOut.from_orm(
        people.set_active(request, user_id, payload.is_active, payload.reason)
    )


@staff_router.post(
    "/users/{user_id}/roles", response={201: RoleOut, **errors(401, 403, 404, 409, 422)}
)
def grant_role(request: HttpRequest, user_id: uuid.UUID, payload: RoleGrantIn) -> Status[RoleOut]:
    granted = people.grant_role(
        request, user_id, Role(payload.role), payload.location_id, payload.reason
    )
    return Status(201, role_out(granted))


@staff_router.post("/roles/{role_id}/revoke", response={200: OkOut, **errors(401, 403, 404, 409)})
def revoke_role(request: HttpRequest, role_id: int, payload: ReasonIn) -> OkOut:
    people.revoke_role(request, role_id, payload.reason)
    return OkOut()


@staff_router.post("/guests", response={201: UserSummaryOut, **errors(400, 401, 403, 409, 422)})
def create_guest(request: HttpRequest, payload: GuestIn) -> Status[UserSummaryOut]:
    user = people.create_guest(
        request, payload.first_name, payload.last_name, payload.phone, payload.email
    )
    return Status(201, UserSummaryOut.from_orm(user))
