"""§11 league messages: the score to confirm, the validated match with its LP, the new rank,
Diamond, and the disputed score for the managers. Sent after the commit, by email here (push
needs a browser subscribed)."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

import pytest
from django.core import mail

from jungle.accounts.models import User
from jungle.league import notify
from jungle.league.models import LeagueSeason
from jungle.league.tests.conftest import placed

pytestmark = pytest.mark.django_db


def inbox(user: User) -> list[str]:
    """The subjects of the messages a person received (shared with test_matches)."""
    return [str(m.subject) for m in mail.outbox if m.to == [user.email]]


def body(user: User, subject: str) -> str:
    return next(str(m.body) for m in mail.outbox if m.to == [user.email] and m.subject == subject)


def test_s11_after_placement_the_first_rank_and_the_lp(
    season: LeagueSeason,
    join: Callable[..., User],
    now: Any,
    django_capture_on_commit_callbacks: Any,
) -> None:
    with django_capture_on_commit_callbacks(execute=True):
        a, b, c, d = placed(season, join)
    for player in (a, b, c, d):
        subjects = inbox(player)
        # the four placement matches give no LP; the fifth gives the first rank
        assert len([s for s in subjects if s.startswith("Meci validat")]) == 1
        ranks = [s for s in subjects if s.startswith("Rang nou")]
        assert len(ranks) == 2  # doubles and pairs
    winner = body(a, next(s for s in inbox(a) if s.startswith("Meci validat")))
    assert "Meciul de 06.04.2027 " in winner and " LP." in winner
    assert any("în clasamentul dublu" in m.body for m in mail.outbox if m.to == [a.email])
    assert any("în clasamentul perechi" in m.body for m in mail.outbox if m.to == [a.email])


def test_s11_rank_words_in_both_languages() -> None:
    assert notify.rank_text([9, 40, 0], "ro") == "Aur III"
    assert notify.rank_text([9, 40, 0], "en") == "Gold III"
    assert notify.rank_text([20, 120, 0], "ro") == "Maestru"
    assert notify.score_text({"sets": [{"a": 6, "b": 3}, {"a": 4, "b": 6}]}) == "6-3 4-6"
