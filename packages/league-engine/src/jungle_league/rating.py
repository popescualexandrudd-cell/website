"""Hidden rating (MMR, §6.2): Weng-Lin, Thurstone–Mosteller full pairing, for two teams.

Own implementation (ADR-0008), validated in the tests against the open-source `openskill`
package. Differences, on purpose and documented in docs/03-liga/ID-URI-REGULI.md:
- a draw updates each team with the paper's formula (openskill ≥ 6 averages the μ change of
  tied teams, which cancels most of the update);
- `weight` (unfinished matches, §6.8) scales both the μ change and the σ reduction.
"""

from __future__ import annotations

import math
from collections.abc import Sequence
from dataclasses import dataclass
from statistics import NormalDist

from .config import LeagueConfig

_NORMAL = NormalDist()
_EPS = 2.220446049250313e-16  # sys.float_info.epsilon


@dataclass(frozen=True, slots=True)
class Rating:
    mu: float
    sigma: float


def _cdf(x: float) -> float:
    return _NORMAL.cdf(x)


def _pdf(x: float) -> float:
    return _NORMAL.pdf(x)


def _v(x: float, t: float) -> float:
    xt = x - t
    denominator = _cdf(xt)
    return -xt if denominator < _EPS else _pdf(xt) / denominator


def _w(x: float, t: float) -> float:
    xt = x - t
    denominator = _cdf(xt)
    if denominator < _EPS:
        return 1.0 if x < 0 else 0.0
    value = _v(x, t)
    return value * (value + xt)


def _vt(x: float, t: float) -> float:
    xx = abs(x)
    b = _cdf(t - xx) - _cdf(-t - xx)
    if b < 1e-5:
        return -x - t if x < 0 else -x + t
    a = _pdf(-t - xx) - _pdf(t - xx)
    return (-a if x < 0 else a) / b


def _wt(x: float, t: float) -> float:
    xx = abs(x)
    b = _cdf(t - xx) - _cdf(-t - xx)
    if b < _EPS:
        return 1.0
    return ((t - xx) * _pdf(t - xx) + (t + xx) * _pdf(-t - xx)) / b + _vt(x, t) ** 2


def win_probability(
    team_a: Sequence[Rating], team_b: Sequence[Rating], config: LeagueConfig
) -> float:
    """p_A = Φ((μ_A − μ_B) / sqrt(n·β² + σ²_A + σ²_B)), n = rated entities in the match (LG-021)."""
    n = len(team_a) + len(team_b)
    mu_a = sum(r.mu for r in team_a)
    mu_b = sum(r.mu for r in team_b)
    var = n * config.beta**2 + sum(r.sigma**2 for r in team_a) + sum(r.sigma**2 for r in team_b)
    return _cdf((mu_a - mu_b) / math.sqrt(var))


def rate(
    team_a: Sequence[Rating],
    team_b: Sequence[Rating],
    score_a: float,
    config: LeagueConfig,
    weight: float = 1.0,
) -> tuple[tuple[Rating, ...], tuple[Rating, ...]]:
    """New ratings after a match (LG-020, LG-022).

    `score_a`: 1 A won, 0 B won, 0.5 draw. `weight` ∈ (0, 1].
    """
    if score_a not in (0.0, 0.5, 1.0):
        raise ValueError("score_a must be 0, 0.5 or 1")
    if not 0 < weight <= 1:
        raise ValueError("weight must be in (0, 1]")
    tau2 = config.tau**2
    teams = [
        [Rating(r.mu, math.sqrt(r.sigma**2 + tau2)) for r in team_a],
        [Rating(r.mu, math.sqrt(r.sigma**2 + tau2)) for r in team_b],
    ]
    mus = [sum(r.mu for r in team) for team in teams]
    variances = [sum(r.sigma**2 for r in team) for team in teams]
    scores = [score_a, 1.0 - score_a]
    c = math.sqrt(variances[0] + variances[1] + 2 * config.beta**2)
    t = config.draw_epsilon / c

    result: list[tuple[Rating, ...]] = []
    for i in (0, 1):
        q = 1 - i
        delta_mu = (mus[i] - mus[q]) / c
        var_to_c = variances[i] / c
        gamma = math.sqrt(variances[i]) / c
        if scores[i] > scores[q]:
            omega = var_to_c * _v(delta_mu, t)
            delta = gamma * var_to_c / c * _w(delta_mu, t)
        elif scores[i] < scores[q]:
            omega = -var_to_c * _v(-delta_mu, t)
            delta = gamma * var_to_c / c * _w(-delta_mu, t)
        else:
            omega = var_to_c * _vt(delta_mu, t)
            delta = gamma * var_to_c / c * _wt(delta_mu, t)
        updated = []
        for player in teams[i]:
            share = player.sigma**2 / variances[i]
            mu = player.mu + share * omega * weight
            sigma = player.sigma * math.sqrt(max(1 - share * delta * weight, config.kappa))
            updated.append(Rating(mu, sigma))
        result.append(tuple(updated))
    return result[0], result[1]
