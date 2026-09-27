"""ADR-0018 / R-140: every API error code has a Romanian and an English translation."""

import json

import pytest
from django.conf import settings

from jungle.core.errors import ErrorCode

CATALOG_DIR = settings.REPO_ROOT / "packages" / "i18n" / "messages"


@pytest.mark.parametrize("language", ["ro", "en"])
def test_every_error_code_is_translated(language: str) -> None:
    catalog = json.loads((CATALOG_DIR / f"{language}.json").read_text(encoding="utf-8"))
    missing = [c.value for c in ErrorCode if not catalog.get("errors", {}).get(c.value)]
    assert missing == []


@pytest.mark.parametrize("language", ["ro", "en"])
def test_no_translations_for_unknown_error_codes(language: str) -> None:
    catalog = json.loads((CATALOG_DIR / f"{language}.json").read_text(encoding="utf-8"))
    known = {c.value for c in ErrorCode}
    assert set(catalog["errors"]) - known == set()
