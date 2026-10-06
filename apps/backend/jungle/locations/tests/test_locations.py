import pytest

from jungle.audit.models import AuditLog
from jungle.conftest import Api, error_code
from jungle.core.permissions import Role
from jungle.locations.models import Location, Resource, ResourceKind

pytestmark = pytest.mark.django_db


def test_seed_creates_the_club_idempotently() -> None:
    """§2.2, R-100: 4 padel courts, pilates studio with 6 Reformers (4 active), event room."""
    from django.core.management import call_command

    call_command("seed_initial")
    call_command("seed_initial")
    club = Location.objects.get(slug="jungle-padel")
    assert club.resources.filter(kind=ResourceKind.PADEL_COURT).count() == 4
    reformers = club.resources.filter(kind=ResourceKind.REFORMER)
    assert reformers.count() == 6
    assert reformers.filter(is_active=True).count() == 4
    assert club.resources.get(kind=ResourceKind.EVENT_ROOM).capacity == 20


def test_seed_demo_marks_demo_data() -> None:
    from django.core.management import call_command

    from jungle.accounts.models import User
    from jungle.legal.models import LegalDocument

    call_command("seed_initial", demo=True)
    call_command("seed_initial", demo=True)
    names = set(User.objects.values_list("last_name", "first_name"))
    assert ("Popescu", "Alexandru Daniel") in names  # §8.5 demo names
    assert ("Moșteanu", "Rareș") in names
    assert all(User.objects.values_list("is_demo", flat=True))
    assert LegalDocument.objects.count() == 14  # 7 texts × RO/EN (the league form, the rules)
    for doc in LegalDocument.objects.all():
        assert doc.is_demo == ("DE_CONFIRMAT" in doc.body), doc  # placeholders are never 'final'
    # §9.2.12: two demo events on the calendar, ahead of today, marked in both languages
    from jungle.core import clock
    from jungle.events.models import ClubEvent

    events = list(ClubEvent.objects.order_by("starts_at"))
    assert [(e.starts_at.astimezone(clock.BUSINESS_TZ).weekday(), e.is_demo) for e in events] in (
        [(4, True), (5, True)],
        [(5, True), (4, True)],
    )
    assert all(e.published and e.starts_at > clock.now() for e in events)
    assert all("(demo)" in e.title_ro and "(demo)" in e.title_en for e in events)
    # §9.3: one demo article on the blog, published and marked
    from jungle.blog.models import Article

    [article] = Article.objects.all()
    assert article.published and article.is_demo and "demo" in article.title_ro


def test_public_listing_shows_only_active(api: Api, location: Location) -> None:
    Location.objects.create(slug="inchisa", name="Închisă", is_active=False)
    Resource.objects.create(
        location=location, kind=ResourceKind.PADEL_COURT, slug="teren-1", name="Teren 1"
    )
    Resource.objects.create(
        location=location,
        kind=ResourceKind.PADEL_COURT,
        slug="teren-9",
        name="Teren 9",
        is_active=False,
    )
    assert [loc["slug"] for loc in api.get("/locations").json()] == ["jungle-padel"]
    assert [r["slug"] for r in api.get("/locations/jungle-padel/resources").json()] == ["teren-1"]
    assert error_code(api.get("/locations/inchisa/resources")) == "locations.not_found"


def test_q20_manager_adds_location_and_resources_without_code(api: Api, staff) -> None:
    staff(Role.MANAGER)
    loc = api.post("/staff/locations", {"slug": "tenis-elite", "name": "Clubul Tenis Elite"})
    assert loc.status_code == 201
    assert (
        error_code(api.post("/staff/locations", {"slug": "tenis-elite", "name": "X"}))
        == "locations.slug_taken"
    )
    court = api.post(
        "/staff/resources",
        {
            "location_id": loc.json()["id"],
            "kind": "tennis_court",
            "slug": "teren-1",
            "name": "Teren 1",
            "attributes": {"surface": "zgură"},
        },
    )
    assert court.status_code == 201
    assert court.json()["attributes"] == {"surface": "zgură"}
    assert AuditLog.objects.filter(action="resources.created").exists()


def test_resource_rules(api: Api, staff, location: Location) -> None:
    staff(Role.ADMIN)
    base = {"location_id": str(location.pk), "name": "R"}
    orphan = api.post("/staff/resources", {**base, "kind": "reformer", "slug": "reformer-1"})
    assert error_code(orphan) == "resources.invalid_parent"
    court = api.post("/staff/resources", {**base, "kind": "padel_court", "slug": "teren-1"}).json()
    wrong_parent = api.post(
        "/staff/resources", {**base, "kind": "reformer", "slug": "r-2", "parent_id": court["id"]}
    )
    assert error_code(wrong_parent) == "resources.invalid_parent"
    court_with_parent = api.post(
        "/staff/resources", {**base, "kind": "padel_court", "slug": "t-2", "parent_id": court["id"]}
    )
    assert error_code(court_with_parent) == "resources.invalid_parent"
    missing_parent = api.post(
        "/staff/resources",
        {
            **base,
            "kind": "reformer",
            "slug": "r-3",
            "parent_id": "00000000-0000-0000-0000-000000000000",
        },
    )
    assert error_code(missing_parent) == "resources.invalid_parent"
    assert (
        error_code(api.post("/staff/resources", {**base, "kind": "padel_court", "slug": "teren-1"}))
        == "resources.slug_taken"
    )
    assert (
        error_code(
            api.post("/staff/resources", {**base, "kind": "event_room", "slug": "s", "capacity": 0})
        )
        == "resources.invalid_capacity"
    )
    studio = api.post(
        "/staff/resources", {**base, "kind": "pilates_studio", "slug": "studio"}
    ).json()
    reformer = api.post(
        "/staff/resources",
        {**base, "kind": "reformer", "slug": "reformer-1", "parent_id": studio["id"]},
    )
    assert reformer.status_code == 201
    other = Location.objects.create(slug="alta", name="Alta")
    cross = api.post(
        "/staff/resources",
        {
            "location_id": str(other.pk),
            "name": "R",
            "kind": "reformer",
            "slug": "r",
            "parent_id": studio["id"],
        },
    )
    assert error_code(cross) == "resources.invalid_parent"
    nowhere = api.post(
        "/staff/resources",
        {
            **base,
            "location_id": "00000000-0000-0000-0000-000000000000",
            "kind": "padel_court",
            "slug": "x",
        },
    )
    assert error_code(nowhere) in {"locations.not_found", "auth.forbidden"}


def test_r100_reformer_can_be_activated_later(api: Api, staff, location: Location) -> None:
    staff(Role.MANAGER)
    studio = Resource.objects.create(
        location=location, kind=ResourceKind.PILATES_STUDIO, slug="s", name="Sala"
    )
    fifth = Resource.objects.create(
        location=location,
        kind=ResourceKind.REFORMER,
        slug="r5",
        name="Reformer 5",
        parent=studio,
        is_active=False,
    )
    response = api.patch(
        f"/staff/resources/{fifth.pk}", {"is_active": True, "reason": "aparat nou livrat"}
    )
    assert response.json()["is_active"] is True
    entry = AuditLog.objects.get(action="resources.updated")
    assert (entry.before or {})["is_active"] is False
    assert entry.reason == "aparat nou livrat"
    assert (
        error_code(api.patch(f"/staff/resources/{fifth.pk}", {"capacity": 0}))
        == "resources.invalid_capacity"
    )
    assert (
        error_code(
            api.patch("/staff/resources/00000000-0000-0000-0000-000000000000", {"name": "x"})
        )
        == "resources.not_found"
    )


def test_location_scoped_manager_only_manages_own_location(
    api: Api, staff, location: Location
) -> None:
    """Q20 / §8.1: a role can be limited to one location."""
    other = Location.objects.create(slug="alta", name="Alta")
    staff(Role.MANAGER, location=location)
    own = api.post(
        "/staff/resources",
        {"location_id": str(location.pk), "kind": "padel_court", "slug": "t1", "name": "T1"},
    )
    assert own.status_code == 201
    foreign = api.post(
        "/staff/resources",
        {"location_id": str(other.pk), "kind": "padel_court", "slug": "t1", "name": "T1"},
    )
    assert error_code(foreign) == "auth.forbidden"
    assert (
        error_code(api.post("/staff/locations", {"slug": "noua", "name": "Noua"}))
        == "auth.forbidden"
    )


def test_reception_cannot_manage_resources(api: Api, staff, location: Location) -> None:
    staff(Role.RECEPTION)
    body = {"location_id": str(location.pk), "kind": "padel_court", "slug": "t1", "name": "T1"}
    assert error_code(api.post("/staff/resources", body)) == "auth.forbidden"


def test_q21_seed_sets_indicative_prices_marked_to_set() -> None:
    """Q21 (owner, 27.09.2026): indicative prices exist from the start, marked DE_STABILIT."""
    from django.core.management import call_command

    from jungle.cafe.models import CafeProduct
    from jungle.configuration.models import Marker
    from jungle.pricing.models import PriceRate
    from jungle.subscriptions.models import SubscriptionRate

    call_command("seed_initial")
    call_command("seed_initial")
    rates = PriceRate.objects.all()
    assert rates.count() == 15 and {r.marker for r in rates} == {Marker.TO_SET}
    assert all("orientativ" in r.note for r in rates)
    assert SubscriptionRate.objects.count() == 9
    assert CafeProduct.objects.filter(marker=Marker.TO_SET).count() == 3
