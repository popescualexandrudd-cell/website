import pytest
from django.db import DatabaseError, transaction

from jungle.audit.models import ActorKind, AuditLog
from jungle.audit.services import SYSTEM, record, snapshot
from jungle.conftest import Api, error_code
from jungle.core.permissions import Role

pytestmark = pytest.mark.django_db


def test_audit_log_is_append_only_in_database() -> None:
    """§8.1 / ADR-0004: nobody can change or delete audit entries, not even through the ORM."""
    entry = record(SYSTEM, "test.action", target_type="x", target_id="1")
    with pytest.raises(DatabaseError), transaction.atomic():
        AuditLog.objects.filter(pk=entry.pk).update(action="forged")
    with pytest.raises(DatabaseError), transaction.atomic():
        AuditLog.objects.filter(pk=entry.pk).delete()
    assert AuditLog.objects.get(pk=entry.pk).action == "test.action"


def test_snapshot_never_contains_secrets(make_user) -> None:
    data = snapshot(make_user())
    assert "password" not in data
    assert "totp_secret" not in data


def test_audit_view_requires_permission_and_filters(api: Api, staff, make_user) -> None:
    staff(Role.RECEPTION)
    assert error_code(api.get("/staff/audit")) == "auth.forbidden"


def test_admin_reads_audit_trail_of_a_person(api: Api, staff, make_user) -> None:
    staff(Role.ADMIN)
    target = make_user()
    record(SYSTEM, "accounts.something", target=target)
    page = api.get(f"/staff/audit?target_type=accounts.user&target_id={target.pk}").json()
    assert page["total"] == 1
    assert page["items"][0]["action"] == "accounts.something"
    assert page["items"][0]["actor_kind"] == ActorKind.SYSTEM
    assert api.get("/staff/audit?action=accounts.something").json()["total"] == 1
