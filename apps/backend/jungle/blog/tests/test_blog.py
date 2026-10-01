"""§9.3 `/blog`, §15.2: the club's blog, written in the panel (`blog.manage`), read on the
website. The club clock: Monday 15.03.2027, 09:00 (conftest `club`)."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

import pytest
from django.test import Client

from jungle.accounts.models import User
from jungle.audit.models import AuditLog
from jungle.blog.models import Article
from jungle.configuration import web
from jungle.conftest import Api, error_code, login_as
from jungle.core.permissions import Role
from jungle.locations.models import Location

pytestmark = pytest.mark.django_db

STAFF = "/staff/blog"
PUBLIC = "/blog?location=jungle-padel"


def body(location: Location | None = None, **changes: Any) -> dict[str, Any]:
    fields: dict[str, Any] = {
        "slug": "ce-este-padelul",
        "title_ro": "Ce este padelul",
        "title_en": "What padel is",
        "summary_ro": "Regulile, pe scurt.",
        "summary_en": "The rules, in short.",
        "body_ro": "## Terenul\n\nPadelul se joacă în doi contra doi.",
        "body_en": "## The court\n\nPadel is played two against two.",
    }
    if location is not None:
        fields["location_id"] = str(location.id)
    return {**fields, **changes}


@pytest.fixture
def refreshes(monkeypatch: pytest.MonkeyPatch) -> list[list[str]]:
    """The website refreshes the backend asked for (`configuration.web`)."""
    asked: list[list[str]] = []
    monkeypatch.setattr(web, "revalidate_after_commit", asked.append)
    return asked


@pytest.fixture
def manager(club: Any, staff: Callable[..., User]) -> User:
    return staff(Role.MANAGER, club.location)


def create(api: Api, location: Location, **changes: Any) -> dict[str, Any]:
    response = api.post(STAFF, body(location, **changes))
    assert response.status_code == 201, response.content
    return dict(response.json())


def public(api: Api) -> list[dict[str, Any]]:
    response = api.get(PUBLIC)
    assert response.status_code == 200
    return list(response.json())


def test_blog_an_article_reaches_the_website_only_once_published(
    api: Api, club: Any, manager: User, refreshes: list[list[str]]
) -> None:
    draft = create(api, club.location, slug="  Ce-Este-Padelul ", title_ro="  Ce este padelul ")
    assert (draft["slug"], draft["title_ro"]) == ("ce-este-padelul", "Ce este padelul")
    assert draft["published"] is False and draft["first_published_at"] is None
    assert public(api) == [] and refreshes == []  # a draft: nothing for the visitors
    assert api.get("/blog/ce-este-padelul?location=jungle-padel").status_code == 404

    response = api.post(f"{STAFF}/{draft['id']}/publication", {"published": True, "reason": "gata"})
    assert response.status_code == 200 and response.json()["first_published_at"] is not None
    assert refreshes == [["blog"]]
    [item] = public(api)
    assert item == {
        "slug": "ce-este-padelul",
        "title_ro": "Ce este padelul",
        "title_en": "What padel is",
        "summary_ro": "Regulile, pe scurt.",
        "summary_en": "The rules, in short.",
        "published_at": "2027-03-15T07:00:00Z",
        "updated_at": item["updated_at"],
        "demo": False,
    }
    article = api.get("/blog/CE-ESTE-PADELUL?location=jungle-padel")
    assert article.status_code == 200
    assert article.json()["body_ro"].startswith("## Terenul") and article.json()["body_en"]

    # withdrawn: gone from the website at once; published again, the first date stays
    api.post(f"{STAFF}/{draft['id']}/publication", {"published": False, "reason": "revizie"})
    assert public(api) == [] and refreshes == [["blog"], ["blog"]]
    again = api.post(f"{STAFF}/{draft['id']}/publication", {"published": True})
    assert again.json()["first_published_at"] == response.json()["first_published_at"]
    actions = list(
        AuditLog.objects.filter(target_id=draft["id"])
        .order_by("id")
        .values_list("action", "reason")
    )
    assert actions == [
        ("blog.article_created", ""),
        ("blog.article_published", "gata"),
        ("blog.article_withdrawn", "revizie"),
        ("blog.article_published", ""),
    ]


def test_blog_newest_first_and_only_this_clubs_articles(
    api: Api, club: Any, manager: User, time_machine: Any
) -> None:
    create(api, club.location, slug="primul", published=True)
    time_machine.move_to("2027-03-16T09:00:00+02:00", tick=False)
    create(api, club.location, slug="al-doilea", published=True)
    create(api, club.location, slug="ciorna")
    other = Location.objects.create(slug="alt-club", name="Alt club")
    Article.objects.create(location=other, slug="altundeva", published=True, **{
        k: v for k, v in body().items() if k != "slug"
    })  # fmt: skip
    assert [a["slug"] for a in public(api)] == ["al-doilea", "primul"]
    # the panel: drafts first, then the published ones, newest first
    staff = api.get(f"{STAFF}?location_id={club.location.id}").json()
    assert [a["slug"] for a in staff] == ["ciorna", "al-doilea", "primul"]
    assert api.get("/blog?location=nu-exista").status_code == 404


def test_blog_corrections_keep_the_address_of_a_published_article(
    api: Api, club: Any, manager: User, refreshes: list[list[str]]
) -> None:
    draft = create(api, club.location)
    renamed = api.put(f"{STAFF}/{draft['id']}", body(slug="padelul-pe-scurt", reason="alt titlu"))
    assert renamed.status_code == 200 and renamed.json()["slug"] == "padelul-pe-scurt"
    assert refreshes == []  # still a draft
    api.post(f"{STAFF}/{draft['id']}/publication", {"published": True})
    corrected = api.put(
        f"{STAFF}/{draft['id']}", body(slug="padelul-pe-scurt", title_ro="Padelul, pe scurt")
    )
    assert corrected.status_code == 200 and refreshes == [["blog"], ["blog"]]
    moved = api.put(f"{STAFF}/{draft['id']}", body(slug="alta-adresa"))
    assert moved.status_code == 409 and error_code(moved) == "blog.slug_locked"
    log = (
        AuditLog.objects.filter(target_id=draft["id"], action="blog.article_changed")
        .order_by("id")
        .first()
    )
    assert log is not None and log.reason == "alt titlu"
    assert log.before is not None and log.before["slug"] == "ce-este-padelul"


def test_blog_every_field_in_both_languages_and_a_clean_address(
    api: Api, club: Any, manager: User
) -> None:
    for field, value in [
        ("title_en", "  "),
        ("body_ro", ""),
        ("slug", "cu spatii"),
        ("slug", "-la-inceput"),
        ("slug", "diacritice-ă"),
    ]:
        response = api.post(STAFF, body(club.location, **{field: value}))
        assert response.status_code == 422, (field, value)
    create(api, club.location)
    taken = api.post(STAFF, body(club.location))
    assert taken.status_code == 409 and error_code(taken) == "blog.slug_taken"
    other = create(api, club.location, slug="alt-articol")
    clash = api.put(f"{STAFF}/{other['id']}", body(slug="ce-este-padelul"))
    assert clash.status_code == 409 and error_code(clash) == "blog.slug_taken"


def test_blog_a_draft_is_deleted_a_published_article_only_withdrawn(
    api: Api, club: Any, manager: User
) -> None:
    draft = create(api, club.location)
    assert str(Article.objects.get(pk=draft["id"])) == "Ce este padelul"
    gone = api.post(f"{STAFF}/{draft['id']}/delete", {"reason": "dublură"})
    assert gone.status_code == 200 and not Article.objects.filter(pk=draft["id"]).exists()
    assert AuditLog.objects.filter(action="blog.draft_deleted", reason="dublură").exists()
    published = create(api, club.location, published=True)
    kept = api.post(f"{STAFF}/{published['id']}/delete", {})
    assert kept.status_code == 409 and error_code(kept) == "blog.already_published"
    missing = api.post(f"{STAFF}/{draft['id']}/publication", {"published": True})
    assert missing.status_code == 404 and error_code(missing) == "blog.not_found"


def test_blog_only_staff_with_blog_manage_for_that_location(
    api: Api, client: Client, club: Any, staff: Callable[..., User], make_user: Callable[..., User]
) -> None:
    staff(Role.RECEPTION, club.location)
    assert api.post(STAFF, body(club.location)).status_code == 403
    assert api.get(f"{STAFF}?location_id={club.location.id}").status_code == 403
    other = Location.objects.create(slug="alt-club", name="Alt club")
    staff(Role.MANAGER, other)
    assert api.post(STAFF, body(club.location)).status_code == 403
    admin = staff(Role.ADMIN)
    article = create(api, club.location)
    login_as(client, make_user())  # a customer
    assert api.post(f"{STAFF}/{article['id']}/publication", {"published": True}).status_code == 403
    login_as(client, admin)
    nowhere = "00000000-0000-0000-0000-000000000000"
    unknown = api.post(STAFF, body(club.location, location_id=nowhere))
    assert unknown.status_code == 404
