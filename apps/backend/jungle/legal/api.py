"""Public reading of the current legal documents."""

from __future__ import annotations

from datetime import datetime
from typing import Annotated

from django.http import HttpRequest
from ninja import Field, Router, Schema

from jungle.core.schemas import errors
from jungle.legal import services
from jungle.legal.models import DocumentKind

router = Router(tags=["legal"])


class LegalDocumentOut(Schema):
    kind: str
    version: int
    language: str
    title: str
    body: str
    sha256: str
    is_demo: bool
    published_at: datetime


@router.get("/documents/{kind}", response={200: LegalDocumentOut, **errors(404, 422)}, auth=None)
def current_document(
    request: HttpRequest,
    kind: DocumentKind,
    language: Annotated[str, Field(pattern=r"^(ro|en)$")] = "ro",
) -> LegalDocumentOut:
    return LegalDocumentOut.from_orm(services.current_document(kind, language))
