"""§6.17: the simulation tool keeps working (a small run) and its statistics are right."""

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools"))

import simulate


def test_spearman():
    assert simulate.spearman([1, 2, 3, 4], [10, 20, 30, 40]) == pytest.approx(1.0)
    assert simulate.spearman([1, 2, 3, 4], [4, 3, 2, 1]) == pytest.approx(-1.0)
    assert simulate.spearman([1, 1, 1], [1, 2, 3]) == 0.0
    assert simulate.spearman([1, 2, 2, 3], [1, 2, 3, 4]) == pytest.approx(0.9487, abs=1e-4)


def test_small_simulation_writes_a_report(tmp_path):
    args = ["--players", "40", "--matches", "600", "--seasons", "2", "--seed", "7"]
    reports = simulate.main([*args, "--out", str(tmp_path)])
    assert len(reports) == 2
    assert 550 <= reports[-1].matches <= 600  # a tiny club can leave a few time slots empty
    report = (tmp_path / "RAPORT_SIMULARE.md").read_text(encoding="utf-8")
    assert "Corelația dintre rang și nivelul real" in report
    assert (tmp_path / "RAPORT_SIMULARE-distributie-ranguri.svg").read_text().startswith("<svg")
