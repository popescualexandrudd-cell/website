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


def test_a_court_screen_names_its_court(api: Api, staff, location: Location) -> None:
    """§8.5: a screen with a court shows that court; without one, it is a lobby screen."""
    from jungle.locations.models import Resource, ResourceKind

    staff(Role.ADMIN)
    court = Resource.objects.create(
        location=location, slug="teren-4", name="Teren 4", kind=ResourceKind.PADEL_COURT
    )
    body = {"kind": "screen", "location_id": str(location.pk), "name": "Ecran Teren 4"}
    created = api.post("/staff/devices", {**body, "resource_id": str(court.pk)})
    assert created.status_code == 201 and created.json()["resource_id"] == str(court.pk)
    assert api.post("/staff/devices", {**body, "name": "Lobby"}).json()["resource_id"] is None
    other = Location.objects.create(slug="alt-club", name="Alt club")
    elsewhere = Resource.objects.create(
        location=other, slug="teren-1", name="Teren 1", kind=ResourceKind.PADEL_COURT
    )
    studio = Resource.objects.create(
        location=location, slug="sala", name="Sala", kind=ResourceKind.PILATES_STUDIO
    )
    for resource, kind in ((elsewhere, "screen"), (studio, "screen"), (court, "league_kiosk")):
        refused = api.post(
            "/staff/devices", {**body, "kind": kind, "resource_id": str(resource.pk)}
        )
        assert error_code(refused) == "validation.invalid"
        assert refused.json()["error"]["params"] == {"field": "resource_id"}
