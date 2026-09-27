"""LG-020 … LG-025: the Weng-Lin Thurstone–Mosteller rating, checked against `openskill`."""

import math

import pytest
from jungle_league import DEFAULT_CONFIG, Rating, rate, win_probability
from jungle_league.config import LeagueConfig
from openskill.models import ThurstoneMostellerFull

# Tolerance of the comparison with the reference implementation (documented in ID-URI-REGULI.md).
TOLERANCE = 1e-9

MODEL = ThurstoneMostellerFull(
    mu=25.0, sigma=25.0 / 3.0, beta=25.0 / 6.0, tau=25.0 / 300.0, epsilon=0.1, kappa=0.0001
)

CASES = [
    ([(25, 25 / 3)], [(25, 25 / 3)]),
    ([(30, 2.0)], [(20, 6.0)]),
    ([(18, 1.2)], [(34, 1.1)]),
    ([(25, 8.3), (27, 3.0)], [(22, 5.0), (31, 7.5)]),
    ([(40, 1.0), (10, 1.0)], [(25, 1.0), (25, 1.0)]),
    ([(5, 0.5), (6, 0.7)], [(45, 0.5), (44, 0.6)]),  # extreme gap: exercises the tail branches
]


def reference(team_a, team_b, a_wins):
    teams = [
        [MODEL.rating(mu=m, sigma=s) for m, s in team_a],
        [MODEL.rating(mu=m, sigma=s) for m, s in team_b],
    ]
    ranks = [1, 2] if a_wins else [2, 1]
    return MODEL.rate(teams, ranks=ranks)


@pytest.mark.parametrize(("team_a", "team_b"), CASES)
@pytest.mark.parametrize("a_wins", [True, False])
def test_lg_023_matches_openskill_for_wins_and_losses(team_a, team_b, a_wins):
    ours = rate(
        [Rating(*r) for r in team_a],
        [Rating(*r) for r in team_b],
        1.0 if a_wins else 0.0,
        DEFAULT_CONFIG,
    )
    theirs = reference(team_a, team_b, a_wins)
    for our_team, their_team in zip(ours, theirs, strict=True):
        for mine, ref in zip(our_team, their_team, strict=True):
            assert mine.mu == pytest.approx(ref.mu, abs=TOLERANCE)
            assert mine.sigma == pytest.approx(ref.sigma, abs=TOLERANCE)


@pytest.mark.parametrize(("team_a", "team_b"), CASES)
def test_lg_023_draw_sigma_matches_openskill_and_mu_follows_the_paper(team_a, team_b):
    """openskill ≥ 6 averages the μ change of tied teams;
    we keep the paper's update (documented)."""
    ours = rate([Rating(*r) for r in team_a], [Rating(*r) for r in team_b], 0.5, DEFAULT_CONFIG)
    teams = [
        [MODEL.rating(mu=m, sigma=s) for m, s in team_a],
        [MODEL.rating(mu=m, sigma=s) for m, s in team_b],
    ]
    theirs = MODEL.rate(teams, ranks=[1, 1])
    for our_team, their_team in zip(ours, theirs, strict=True):
        for mine, ref in zip(our_team, their_team, strict=True):
            assert mine.sigma == pytest.approx(ref.sigma, abs=TOLERANCE)
    # In a draw the weaker side gains and the stronger one loses.
    mu_a = sum(m for m, _ in team_a)
    mu_b = sum(m for m, _ in team_b)
    if mu_a < mu_b:
        assert ours[0][0].mu > team_a[0][0]
        assert ours[1][0].mu < team_b[0][0]


def test_lg_023_equal_draw_leaves_mu_unchanged():
    new_a, new_b = rate([Rating(25, 8)], [Rating(25, 8)], 0.5, DEFAULT_CONFIG)
    assert new_a[0].mu == pytest.approx(25)
    assert new_b[0].mu == pytest.approx(25)
    assert new_a[0].sigma < 8


def test_lg_021_win_probability_formula_and_openskill_for_singles():
    a, b = Rating(30, 3), Rating(24, 4)
    expected = 0.5 * (
        1 + math.erf((30 - 24) / math.sqrt(2 * DEFAULT_CONFIG.beta**2 + 9 + 16) / math.sqrt(2))
    )
    assert win_probability([a], [b], DEFAULT_CONFIG) == pytest.approx(expected)
    ref = MODEL.predict_win([[MODEL.rating(mu=30, sigma=3)], [MODEL.rating(mu=24, sigma=4)]])
    assert win_probability([a], [b], DEFAULT_CONFIG) == pytest.approx(ref[0], abs=TOLERANCE)


def test_lg_021_doubles_uses_the_four_players_and_team_sums():
    team_a = [Rating(26, 2), Rating(24, 3)]
    team_b = [Rating(22, 1), Rating(23, 2)]
    n_beta = 4 * DEFAULT_CONFIG.beta**2
    z = (50 - 45) / math.sqrt(n_beta + 4 + 9 + 1 + 4)
    assert win_probability(team_a, team_b, DEFAULT_CONFIG) == pytest.approx(
        0.5 * (1 + math.erf(z / math.sqrt(2)))
    )
    assert win_probability([Rating(25, 5)], [Rating(25, 5)], DEFAULT_CONFIG) == 0.5


def test_lg_022_weight_scales_the_update():
    full_a, _ = rate([Rating(25, 8)], [Rating(25, 8)], 1.0, DEFAULT_CONFIG)
    half_a, _ = rate([Rating(25, 8)], [Rating(25, 8)], 1.0, DEFAULT_CONFIG, weight=0.5)
    gain_full = full_a[0].mu - 25
    gain_half = half_a[0].mu - 25
    assert gain_half == pytest.approx(gain_full / 2)
    assert full_a[0].sigma < half_a[0].sigma < math.sqrt(64 + DEFAULT_CONFIG.tau**2)


def test_lg_020_newcomers_move_faster_than_veterans():
    new, _ = rate([Rating(25, 8.3)], [Rating(25, 8.3)], 1.0, DEFAULT_CONFIG)
    veteran, _ = rate([Rating(25, 1.5)], [Rating(25, 8.3)], 1.0, DEFAULT_CONFIG)
    assert new[0].mu - 25 > veteran[0].mu - 25 > 0


def test_lg_020_sigma_never_collapses_below_kappa():
    config = LeagueConfig(kappa=0.5, tau=0.0)
    new_a, _ = rate([Rating(25, 30)], [Rating(25, 0.001)], 1.0, config)
    assert new_a[0].sigma >= 30 * math.sqrt(0.5) - 1e-9


@pytest.mark.parametrize(("score", "weight"), [(0.3, 1.0), (1.0, 0.0), (1.0, 1.5)])
def test_invalid_inputs_are_refused(score, weight):
    with pytest.raises(ValueError, match="must"):
        rate([Rating(25, 8)], [Rating(25, 8)], score, DEFAULT_CONFIG, weight)
