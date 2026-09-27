"""Schemas shared by all API routers."""

from __future__ import annotations

from typing import Any

from ninja import Schema


class ErrorBody(Schema):
    code: str
    params: dict[str, Any]


class ErrorOut(Schema):
    error: ErrorBody


class OkOut(Schema):
    ok: bool = True


class ReasonIn(Schema):
    reason: str = ""


def errors(*statuses: int) -> dict[int, type[ErrorOut]]:
    """Error responses to document on an endpoint."""
    return dict.fromkeys(statuses, ErrorOut)
