"""The club's blog (§9.3 `/blog`, §15.2).

Staff with `blog.manage` (per location) write an article, correct it, publish or withdraw it, and
delete a draft that was never published; every change is in the audit log, and the website is
asked to refresh after a change its visitors could see (`configuration.web`, tag "blog"). Once an
article has been published its address stays: links to it and search engines keep working.
"""

from __future__ import annotations

import re
import uuid
from dataclasses import dataclass, fields, replace
from typing import Any

from django.db import IntegrityError, transaction
from django.db.models import F, QuerySet
from django.http import HttpRequest

from jungle.accounts.services.authz import authorize
from jungle.audit import services as audit
from jungle.blog.models import Article
from jungle.configuration import web
from jungle.core import clock
from jungle.core.errors import DomainError, ErrorCode
from jungle.core.permissions import Action
from jungle.locations.models import Location

SLUG = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
PUBLIC_LIMIT = 100
STAFF_LIMIT = 300


@dataclass(frozen=True)
class ArticleData:
    slug: str
    title_ro: str
    title_en: str
    summary_ro: str
    summary_en: str
    body_ro: str
    body_en: str


def _clean(data: ArticleData) -> ArticleData:
    data = replace(data, **{f.name: getattr(data, f.name).strip() for f in fields(data)})
    data = replace(data, slug=data.slug.lower())
    for f in fields(data):
        if not getattr(data, f.name):
            raise DomainError(ErrorCode.VALIDATION_INVALID, status=422, params={"field": f.name})
    if not SLUG.match(data.slug):
        raise DomainError(ErrorCode.VALIDATION_INVALID, status=422, params={"field": "slug"})
    return data


def _snapshot(article: Article) -> dict[str, Any]:
    return {
        "slug": article.slug,
        "title_ro": article.title_ro,
        "title_en": article.title_en,
        "summary_ro": article.summary_ro,
        "summary_en": article.summary_en,
        "body_ro_length": len(article.body_ro),
        "body_en_length": len(article.body_en),
        "published": article.published,
    }


def _refresh_site(was_public: bool, is_public: bool) -> None:
    """Only a change the visitors could see asks the website to rebuild its pages."""
    if was_public or is_public:
        web.revalidate_after_commit([web.BLOG_TAG])


def _save(article: Article) -> None:
    try:
        with transaction.atomic():
            article.save()
    except IntegrityError as exc:
        raise DomainError(
            ErrorCode.BLOG_SLUG_TAKEN, status=409, params={"slug": article.slug}
        ) from exc


def _locked(request: HttpRequest, article_id: uuid.UUID) -> Article:
    article = Article.objects.select_for_update().filter(pk=article_id).first()
    if article is None:
        raise DomainError(ErrorCode.BLOG_NOT_FOUND, status=404)
    authorize(request, Action.BLOG_MANAGE, article.location_id)
    return article


def create(
    request: HttpRequest, location_id: uuid.UUID, data: ArticleData, published: bool
) -> Article:
    staff = authorize(request, Action.BLOG_MANAGE, location_id)
    location = Location.objects.filter(pk=location_id).first()
    if location is None:
        raise DomainError(ErrorCode.LOCATIONS_NOT_FOUND, status=404)
    data = _clean(data)
    with transaction.atomic():
        article = Article(
            location=location,
            **{f.name: getattr(data, f.name) for f in fields(data)},
            published=published,
            first_published_at=clock.now() if published else None,
            created_by=staff,
        )
        _save(article)
        audit.record(
            audit.actor_from_request(request),
            "blog.article_created",
            target=article,
            after=_snapshot(article),
        )
        _refresh_site(was_public=False, is_public=published)
    return article


def update(request: HttpRequest, article_id: uuid.UUID, data: ArticleData, reason: str) -> Article:
    """A correction at any time; the address only while the article was never published."""
    data = _clean(data)
    with transaction.atomic():
        article = _locked(request, article_id)
        if data.slug != article.slug and article.first_published_at is not None:
            raise DomainError(ErrorCode.BLOG_SLUG_LOCKED, status=409)
        before = _snapshot(article)
        for f in fields(data):
            setattr(article, f.name, getattr(data, f.name))
        _save(article)
        audit.record(
            audit.actor_from_request(request),
            "blog.article_changed",
            target=article,
            before=before,
            after=_snapshot(article),
            reason=reason,
        )
        _refresh_site(was_public=article.published, is_public=article.published)
    return article


def set_published(
    request: HttpRequest, article_id: uuid.UUID, published: bool, reason: str
) -> Article:
    with transaction.atomic():
        article = _locked(request, article_id)
        was_public = article.published
        article.published = published
        if published and article.first_published_at is None:
            article.first_published_at = clock.now()
        article.save(update_fields=["published", "first_published_at", "updated_at"])
        audit.record(
            audit.actor_from_request(request),
            "blog.article_published" if published else "blog.article_withdrawn",
            target=article,
            reason=reason,
        )
        _refresh_site(was_public=was_public, is_public=published)
    return article


def delete_draft(request: HttpRequest, article_id: uuid.UUID, reason: str) -> None:
    """Only a draft that was never on the website; a published one is withdrawn instead."""
    with transaction.atomic():
        article = _locked(request, article_id)
        if article.first_published_at is not None:
            raise DomainError(ErrorCode.BLOG_ALREADY_PUBLISHED, status=409)
        audit.record(
            audit.actor_from_request(request),
            "blog.draft_deleted",
            target=article,
            before=_snapshot(article),
            reason=reason,
        )
        article.delete()


def staff_list(request: HttpRequest, location_id: uuid.UUID) -> QuerySet[Article]:
    """Drafts first (newest first), then the published articles, newest first."""
    authorize(request, Action.BLOG_MANAGE, location_id)
    return Article.objects.filter(location_id=location_id).order_by(
        F("first_published_at").desc(nulls_first=True), "-created_at"
    )[:STAFF_LIMIT]


# ---------------------------------------------------------------- public
def public_list(location: Location) -> QuerySet[Article]:
    return Article.objects.filter(location=location, published=True).order_by(
        "-first_published_at"
    )[:PUBLIC_LIMIT]


def public_article(location: Location, slug: str) -> Article:
    article = Article.objects.filter(location=location, slug=slug.lower(), published=True).first()
    if article is None:
        raise DomainError(ErrorCode.BLOG_NOT_FOUND, status=404)
    return article
