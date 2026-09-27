"""Authorization: who may perform which action (§8.1, ADR-0011).

Staff actions need (1) an active, authenticated user, (2) a staff role that grants the
action globally or for the given location, and (3) a session verified with 2FA.
"""

from __future__ import annotations

import uuid

from django.http import HttpRequest

from jungle.accounts.models import User, UserRole
from jungle.core.errors import DomainError, ErrorCode
from jungle.core.permissions import ROLE_ACTIONS, Action, Role

MFA_SESSION_KEY = "jungle_mfa_verified"


def current_user(request: HttpRequest) -> User:
    user = request.user
    if not isinstance(user, User) or not user.is_active:
        raise DomainError(ErrorCode.AUTH_REQUIRED, status=401)
    return user


def mfa_verified(request: HttpRequest) -> bool:
    return request.session.get(MFA_SESSION_KEY) is True


def authorize(request: HttpRequest, action: Action, location_id: uuid.UUID | None = None) -> User:
    user = current_user(request)
    roles = list(UserRole.objects.filter(user=user))
    if not roles:
        raise DomainError(ErrorCode.AUTH_FORBIDDEN, status=403)
    if not mfa_verified(request):
        raise DomainError(ErrorCode.AUTH_MFA_REQUIRED, status=403)
    for role in roles:
        grants = action in ROLE_ACTIONS[Role(role.role)]
        in_scope = role.location_id is None or role.location_id == location_id
        if grants and in_scope:
            return user
    raise DomainError(ErrorCode.AUTH_FORBIDDEN, status=403, params={"action": action.value})
