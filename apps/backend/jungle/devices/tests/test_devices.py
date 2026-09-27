import pytest

from jungle.audit.models import AuditLog
from jungle.conftest import Api, error_code
from jungle.core.permissions import Role
from jungle.locations.models import Location

pytestmark = pytest.mark.django_db


def test_admin_registers_and_deactivates_device(api: Api, staff, location: Location) -> None:
    staff(Role.ADMIN)
    created = api.post(
        "/staff/devices",
        {"kind": "league_kiosk", "location_id": str(location.pk), "name": "Chioșc Ligă 1"},
    )
    assert created.status_code == 201
    device_id = created.json()["id"]
    assert [d["name"] for d in api.get("/staff/devices").json()] == ["Chioșc Ligă 1"]
    off = api.post(f"/staff/devices/{device_id}/active", {"is_active": False, "reason": "service"})
    assert off.json()["is_active"] is False
    assert AuditLog.objects.filter(action="devices.registered").exists()
    assert AuditLog.objects.filter(action="devices.deactivated", reason="service").exists()
    missing = api.post(
        "/staff/devices/00000000-0000-0000-0000-000000000000/active",
        {"is_active": True, "reason": "abc"},
    )
    assert error_code(missing) == "devices.not_found"


def test_device_needs_existing_location(api: Api, staff) -> None:
    staff(Role.ADMIN)
    body = {
        "kind": "screen",
        "location_id": "00000000-0000-0000-0000-000000000000",
        "name": "Ecran",
    }
    assert error_code(api.post("/staff/devices", body)) == "locations.not_found"


def test_manager_cannot_manage_devices(api: Api, staff) -> None:
    staff(Role.MANAGER)
    assert error_code(api.get("/staff/devices")) == "auth.forbidden"
