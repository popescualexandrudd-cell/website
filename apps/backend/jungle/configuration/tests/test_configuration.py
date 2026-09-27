from datetime import datetime

import pytest
from django.db import DatabaseError, transaction

from jungle.audit.models import AuditLog
from jungle.configuration import services
from jungle.configuration.models import ConfigVersion, FeatureFlag, Marker
from jungle.configuration.registry import COMPANY_FIELDS, FLAGS
from jungle.conftest import Api, error_code
from jungle.core.permissions import Role

pytestmark = pytest.mark.django_db


def test_flags_have_safe_defaults_and_are_public(api: Api) -> None:
    """R-110, R-130, R-062: parkour, WhatsApp and card POS are off at launch."""
    flags = {f["key"]: f["enabled"] for f in api.get("/config/flags").json()}
    assert set(flags) == set(FLAGS)
    assert flags["parkour"] is False
    assert flags["whatsapp"] is False
    assert flags["card_pos"] is False
    assert flags["apple_wallet"] is False  # Q24: postponed
    assert flags["guest_quick_accounts"] is True  # Q8


def test_flag_rows_are_created_after_migrate() -> None:
    assert set(FeatureFlag.objects.values_list("key", flat=True)) == set(FLAGS)


def test_only_admin_changes_flags_and_it_is_audited(api: Api, staff) -> None:
    staff(Role.MANAGER)
    assert (
        error_code(api.put("/staff/flags/parkour", {"enabled": True, "reason": "test"}))
        == "auth.forbidden"
    )


def test_admin_changes_flag(api: Api, staff) -> None:
    staff(Role.ADMIN)
    response = api.put("/staff/flags/parkour", {"enabled": True, "reason": "deschidere parkour"})
    assert response.json()["enabled"] is True
    assert services.is_enabled("parkour") is True
    entry = AuditLog.objects.get(action="flags.changed")
    assert entry.before == {"enabled": False}
    assert entry.reason == "deschidere parkour"
    assert (
        error_code(api.put("/staff/flags/unknown", {"enabled": True, "reason": "abc"}))
        == "flags.unknown"
    )


def test_is_enabled_falls_back_to_default_without_row() -> None:
    FeatureFlag.objects.all().delete()
    assert services.is_enabled("guest_quick_accounts") is True


def test_config_defaults_and_pending_decisions(api: Api, staff) -> None:
    """ADR-0022: undecided values are listed with their question ID."""
    staff(Role.MANAGER)
    pending = {p["key"]: p for p in api.get("/staff/pending-decisions").json()}
    assert pending["club.company"]["question"] == "Q26"
    assert pending["club.domain"]["question"] == "Q39"
    assert pending["accounts.min_self_registration_age"]["value"] == 16
    assert "auth.login_max_failures" not in pending
    listed = {c["key"]: c for c in api.get("/staff/config").json()}
    assert listed["auth.login_max_failures"] == {
        "key": "auth.login_max_failures",
        "value": 5,
        "marker": "default",
        "version": 0,
        "effective_from": None,
    }


def test_publish_config_versions_and_effective_date(api: Api, staff, client, time_machine) -> None:
    from jungle.conftest import login_as

    time_machine.move_to("2026-10-01T10:00:00+03:00", tick=False)
    manager = staff(Role.MANAGER)
    company = dict.fromkeys(COMPANY_FIELDS, "x")
    first = api.post(
        "/staff/config/club.company",
        {"value": company, "marker": "confirmed", "reason": "date primite"},
    )
    assert first.status_code == 201
    assert first.json()["version"] == 1
    later = {
        "value": 18,
        "marker": "confirmed",
        "reason": "decizie",
        "effective_from": "2026-11-01T00:00:00+02:00",
    }
    assert (
        api.post("/staff/config/accounts.min_self_registration_age", later).json()["version"] == 1
    )
    assert services.get_config("accounts.min_self_registration_age") == 16  # not yet in force
    time_machine.move_to("2026-11-01T00:00:01+02:00", tick=False)
    assert services.get_config("accounts.min_self_registration_age") == 18
    assert api.get("/staff/pending-decisions").status_code == 401  # the session expired meanwhile
    login_as(client, manager)
    assert "club.company" not in {p["key"] for p in api.get("/staff/pending-decisions").json()}
    assert AuditLog.objects.filter(action="config.published").count() == 2


def test_publish_config_validates_key_and_value(api: Api, staff) -> None:
    staff(Role.ADMIN)
    body = {"value": 1, "marker": "confirmed", "reason": "abc"}
    assert error_code(api.post("/staff/config/nope", body)) == "config.unknown_key"
    for bad in (0, -1, True, "5", None):
        response = api.post("/staff/config/auth.login_max_failures", {**body, "value": bad})
        assert error_code(response) == "config.invalid_value"
    assert (
        error_code(api.post("/staff/config/club.company", {**body, "value": {"legal_name": "x"}}))
        == "config.invalid_value"
    )


def test_reception_cannot_read_or_change_config(api: Api, staff) -> None:
    staff(Role.RECEPTION)
    assert error_code(api.get("/staff/config")) == "auth.forbidden"
    assert error_code(api.get("/staff/pending-decisions")) == "auth.forbidden"


def test_config_versions_are_immutable() -> None:
    row = ConfigVersion.objects.create(
        key="club.domain",
        version=1,
        value="x",
        marker=Marker.CONFIRMED,
        effective_from=datetime.fromisoformat("2026-01-01T00:00:00+00:00"),
    )
    with pytest.raises(DatabaseError), transaction.atomic():
        ConfigVersion.objects.filter(pk=row.pk).update(value="y")
