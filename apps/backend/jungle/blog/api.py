"""The club's blog (§9.3 `/blog`): public for the website, written by staff in the panel."""

from __future__ import annotations

import uuid
from datetime import datetime

from django.http import HttpRequest
from ninja import Field, Router, Schema, Status

from jungle.blog import services
from jungle.blog.models import Article
from jungle.core.schemas import OkOut, errors
from jungle.core.security import session_auth
from jungle.locations.services import get_location_by_slug

public_router = Router(tags=["blog"])
staff_router = Router(tags=["staff: blog"], auth=session_auth)


class ArticleSummaryOut(Schema):
    slug: str
    title_ro: str
    title_en: str
    summary_ro: str
    summary_en: str
    published_at: datetime
    updated_at: datetime
    demo: bool = Field(description="demo article, shown as such (invariant 12)")


class ArticleOut(ArticleSummaryOut):
    body_ro: str = Field(description="Markdown")
    body_en: str = Field(description="Markdown")


class ArticleIn(Schema):
    slug: str = Field(max_length=80, description="lowercase letters, digits and dashes")
    title_ro: str = Field(max_length=140)
    title_en: str = Field(max_length=140)
    summary_ro: str = Field(max_length=300)
    summary_en: str = Field(max_length=300)
    body_ro: str = Field(max_length=40_000)
    body_en: str = Field(max_length=40_000)


class ArticleCreateIn(ArticleIn):
    location_id: uuid.UUID
    published: bool = False


class ArticleChangeIn(ArticleIn):
    reason: str = Field(default="", max_length=500)


class ArticlePublicationIn(Schema):
    published: bool
    reason: str = Field(default="", max_length=500)


class ArticleDeleteIn(Schema):
    reason: str = Field(default="", max_length=500)


class StaffArticleOut(Schema):
    id: uuid.UUID
    slug: str
    title_ro: str
    title_en: str
    summary_ro: str
    summary_en: str
    body_ro: str
    body_en: str
    published: bool
    first_published_at: datetime | None
    updated_at: datetime
    is_demo: bool


def _data(payload: ArticleIn) -> services.ArticleData:
    return services.ArticleData(
        slug=payload.slug,
        title_ro=payload.title_ro,
        title_en=payload.title_en,
        summary_ro=payload.summary_ro,
        summary_en=payload.summary_en,
        body_ro=payload.body_ro,
        body_en=payload.body_en,
    )


def _summary(article: Article) -> ArticleSummaryOut:
    return ArticleSummaryOut(
        slug=article.slug,
        title_ro=article.title_ro,
        title_en=article.title_en,
        summary_ro=article.summary_ro,
        summary_en=article.summary_en,
        # Only published articles are public, so the date is always there.
        published_at=article.first_published_at or article.updated_at,
        updated_at=article.updated_at,
        demo=article.is_demo,
    )


@public_router.get("", response={200: list[ArticleSummaryOut], **errors(404)}, auth=None)
def list_articles(request: HttpRequest, location: str) -> list[ArticleSummaryOut]:
    """The published articles, newest first."""
    return [_summary(a) for a in services.public_list(get_location_by_slug(location))]


@public_router.get("/{slug}", response={200: ArticleOut, **errors(404)}, auth=None)
def get_article(request: HttpRequest, slug: str, location: str) -> ArticleOut:
    article = services.public_article(get_location_by_slug(location), slug)
    return ArticleOut(**_summary(article).dict(), body_ro=article.body_ro, body_en=article.body_en)


@staff_router.get("/blog", response={200: list[StaffArticleOut], **errors(401, 403)})
def staff_articles(request: HttpRequest, location_id: uuid.UUID) -> list[StaffArticleOut]:
    return [StaffArticleOut.from_orm(a) for a in services.staff_list(request, location_id)]


@staff_router.post("/blog", response={201: StaffArticleOut, **errors(401, 403, 404, 409, 422)})
def create_article(request: HttpRequest, payload: ArticleCreateIn) -> Status[StaffArticleOut]:
    article = services.create(request, payload.location_id, _data(payload), payload.published)
    return Status(201, StaffArticleOut.from_orm(article))


@staff_router.put(
    "/blog/{article_id}", response={200: StaffArticleOut, **errors(401, 403, 404, 409, 422)}
)
def change_article(
    request: HttpRequest, article_id: uuid.UUID, payload: ArticleChangeIn
) -> StaffArticleOut:
    return StaffArticleOut.from_orm(
        services.update(request, article_id, _data(payload), payload.reason)
    )


@staff_router.post(
    "/blog/{article_id}/publication", response={200: StaffArticleOut, **errors(401, 403, 404)}
)
def publish_article(
    request: HttpRequest, article_id: uuid.UUID, payload: ArticlePublicationIn
) -> StaffArticleOut:
    return StaffArticleOut.from_orm(
        services.set_published(request, article_id, payload.published, payload.reason)
    )


@staff_router.post("/blog/{article_id}/delete", response={200: OkOut, **errors(401, 403, 404, 409)})
def delete_article(request: HttpRequest, article_id: uuid.UUID, payload: ArticleDeleteIn) -> OkOut:
    services.delete_draft(request, article_id, payload.reason)
    return OkOut()
