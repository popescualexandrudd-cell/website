"""The large league simulation (§6.17): players with a hidden "real level", many seasons,
checked against the targets of the specification. Writes a Markdown report with SVG charts.

    uv run python tools/simulate.py --out ../../docs/03-liga/simulari

Deterministic: the same seed and parameters always give the same report.
"""

from __future__ import annotations

import argparse
import math
import random
import statistics
from collections import Counter
from collections.abc import Sequence
from dataclasses import dataclass, field, replace
from datetime import UTC, date, datetime, timedelta
from pathlib import Path

from jungle_league import (
    DEFAULT_CONFIG,
    Ladder,
    LeagueConfig,
    LeagueState,
    MatchInput,
    MatchScore,
    MatchType,
    SetScore,
    Side,
    apply_match,
    level_from_mu,
    register_player,
    standings,
    start_new_season,
    win_probability,
)
from jungle_league.engine import CLUB_TZ
from jungle_league.rating import Rating

TIER_NAMES = ["bronze", "silver", "gold", "platinum", "diamond", "master"]
TIER_RO = {
    "bronze": "Bronz",
    "silver": "Argint",
    "gold": "Aur",
    "platinum": "Platină",
    "diamond": "Diamant",
    "master": "Maestru",
}
TARGET = {"bronze": 20, "silver": 25, "gold": 25, "platinum": 17, "diamond": 10, "master": 3}


@dataclass
class Player:
    pid: str
    true_mu: float
    activity: float
    partners: list[str] = field(default_factory=list)


@dataclass
class SeasonReport:
    season: int
    matches: int
    spearman_rank_true: float
    spearman_mu_true: float
    eligible: int
    ranked: int
    tiers: dict[str, float]
    mean_total_lp: float
    mean_abs_level_error: float
    placement_error: float | None


def spearman(xs: Sequence[float], ys: Sequence[float]) -> float:
    """Spearman correlation with average ranks for ties."""

    def ranks(values: Sequence[float]) -> list[float]:
        order = sorted(range(len(values)), key=lambda i: values[i])
        result = [0.0] * len(values)
        i = 0
        while i < len(order):
            j = i
            while j + 1 < len(order) and values[order[j + 1]] == values[order[i]]:
                j += 1
            for k in range(i, j + 1):
                result[order[k]] = (i + j) / 2 + 1
            i = j + 1
        return result

    rx, ry = ranks(xs), ranks(ys)
    mx, my = statistics.fmean(rx), statistics.fmean(ry)
    cov = sum((a - mx) * (b - my) for a, b in zip(rx, ry, strict=True))
    var = math.sqrt(sum((a - mx) ** 2 for a in rx) * sum((b - my) ** 2 for b in ry))
    return cov / var if var else 0.0


def random_set(rng: random.Random, winner_a: bool) -> SetScore:
    kind = rng.random()
    if kind < 0.75:
        loser = rng.choice([0, 1, 2, 2, 3, 3, 4, 4, 4])
        a, b = (6, loser) if winner_a else (loser, 6)
        return SetScore(a, b)
    if kind < 0.87:
        return SetScore(7, 5) if winner_a else SetScore(5, 7)
    low = rng.choice([0, 1, 2, 3, 4, 5, 6])
    tb = (7, low) if low <= 5 else (8, 6)
    return SetScore(7, 6, tb) if winner_a else SetScore(6, 7, (tb[1], tb[0]))


def random_score(rng: random.Random, a_wins: bool, p_a: float, unfinished: bool) -> MatchScore:
    if unfinished:
        first = random_set(rng, rng.random() < p_a)
        partial = SetScore(rng.randint(0, 5), rng.randint(0, 5))
        return MatchScore((first, partial), unfinished=True)
    close = 1 - abs(p_a - 0.5) * 2  # close matches go to three sets more often
    if rng.random() < 0.25 + 0.3 * close:
        return MatchScore(
            (random_set(rng, a_wins), random_set(rng, not a_wins), random_set(rng, a_wins))
        )
    return MatchScore((random_set(rng, a_wins), random_set(rng, a_wins)))


def simulate(
    players_count: int,
    total_matches: int,
    seasons: int,
    seed: int,
    config: LeagueConfig,
    initial_sigma: float | None = None,
) -> tuple[list[SeasonReport], list[str], dict[str, list[float]]]:
    rng = random.Random(seed)
    players: list[Player] = []
    state = LeagueState()
    placement_errors: list[float] = []
    questionnaire_errors: list[float] = []
    for i in range(players_count):
        true_level = min(7.0, max(1.0, rng.gauss(3.8, 1.15)))
        pid = f"j{i:03}"
        players.append(Player(pid, 25 + 5 * (true_level - 4), rng.lognormvariate(0, 0.5)))
        questionnaire = round(min(7.0, max(1.0, true_level + rng.gauss(0, 0.7))) * 2) / 2
        questionnaire_errors.append(abs(questionnaire - true_level))
        state = register_player(state, pid, questionnaire, config, sigma=initial_sigma)
    by_id = {p.pid: p for p in players}
    # Regular partners: players tend to play with people of a similar level.
    ordered = sorted(players, key=lambda p: p.true_mu)
    for idx, p in enumerate(ordered):
        window = ordered[max(0, idx - 8) : idx + 9]
        p.partners = [q.pid for q in rng.sample(window, min(4, len(window))) if q.pid != p.pid][:3]

    per_season = total_matches // seasons
    season_days = 91
    start = datetime(2027, 3, 1, 7, tzinfo=UTC)
    reports: list[SeasonReport] = []
    examples: list[str] = []
    series: dict[str, list[float]] = {"spearman": [], "lp_mean": [], "questionnaire_error": []}
    match_no = 0
    series["questionnaire_error"].append(statistics.fmean(questionnaire_errors))
    daily: Counter[tuple[str, date]] = Counter()
    for season in range(1, seasons + 1):
        season_start = start + timedelta(days=season_days * (season - 1))
        placed_before = {
            pid for pid, c in state.competitors[Ladder.DOUBLES].items() if c.rank is not None
        }
        # Exactly `per_season` matches: a slot without enough available players is skipped
        # (daily limit), so there are a few more time slots than matches.
        slots = int(per_season * 1.1)
        applied = 0
        for slot in range(slots):
            if applied == per_season:
                break
            k = applied
            moment = season_start + timedelta(seconds=(season_days - 1) * 86400 * slot / slots)
            day = moment.astimezone(CLUB_TZ).date()
            size = 2 if rng.random() < 0.8 else 1
            weights = [p.activity for p in players]
            anchor = rng.choices(players, weights)[0]
            # Opponents near the anchor's displayed level (how people book matches at a club).
            doubles_table = state.competitors[Ladder.DOUBLES]
            anchor_mu = doubles_table[anchor.pid].rating.mu
            pool = [
                p
                for p in players
                if p.pid != anchor.pid
                and abs(doubles_table[p.pid].rating.mu - anchor_mu) <= 4.0  # ±0.8 levels
                and daily[(p.pid, day)] < config.max_official_matches_per_day
            ]
            if (
                daily[(anchor.pid, day)] >= config.max_official_matches_per_day
                or len(pool) < size * 2
            ):
                continue
            if size == 2:
                partner_id = next(
                    (
                        q
                        for q in anchor.partners
                        if q in {p.pid for p in pool} and rng.random() < 0.7
                    ),
                    None,
                )
                partner = by_id[partner_id] if partner_id else rng.choice(pool)
                rest = [p for p in pool if p.pid != partner.pid]
                opp = rng.sample(rest, 2)
                team_a: tuple[str, ...] = (anchor.pid, partner.pid)
                team_b: tuple[str, ...] = (opp[0].pid, opp[1].pid)
            else:
                team_a, team_b = (anchor.pid,), (rng.choice(pool).pid,)
            true_a = [Rating(by_id[p].true_mu, 0.0) for p in team_a]
            true_b = [Rating(by_id[p].true_mu, 0.0) for p in team_b]
            p_true = win_probability(true_a, true_b, config)
            a_wins = rng.random() < p_true
            unfinished = rng.random() < 0.05
            match_type = MatchType.TOURNAMENT if rng.random() < 0.03 else MatchType.OFFICIAL
            if match_type is MatchType.TOURNAMENT:
                unfinished = False
            match = MatchInput(
                f"s{season}m{k:05}",
                team_a,
                team_b,
                random_score(rng, a_wins, p_true, unfinished),
                moment,
                match_type,
            )
            ladder = Ladder.DOUBLES if size == 2 else Ladder.SINGLES
            p_before = win_probability(
                [state.competitors[ladder][p].rating for p in team_a],
                [state.competitors[ladder][p].rating for p in team_b],
                config,
            )
            state, event = apply_match(state, match, config)
            match_no += 1
            applied += 1
            for pid in (*team_a, *team_b):
                daily[(pid, day)] += 1
            for pid in (*team_a, *team_b):  # real skill drifts slowly (people improve or rust)
                by_id[pid].true_mu += rng.gauss(0.004, 0.05)
            if event is not None and len(examples) < 12 and season == seasons and k % 97 == 0:
                lp_parts = ", ".join(
                    f"{u.competitor_id} {u.lp_delta:+d}"
                    for u in event.updates
                    if u.ladder is ladder and u.before.rank is not None
                )
                if lp_parts:
                    examples.append(
                        f"| {' + '.join(team_a)} vs {' + '.join(team_b)} | {p_before:.2f} | "
                        f"{'A' if event.winner is Side.A else 'B' if event.winner is Side.B else 'egal'} | "
                        f"{event.completion_weight} | {match_type.value} | {lp_parts} |"
                    )
            if event is not None:
                for u in event.updates:
                    if (
                        u.ladder is Ladder.DOUBLES
                        and u.before.rank is None
                        and u.after.rank is not None
                        and u.competitor_id not in placed_before
                        and season == 1
                    ):
                        placement_errors.append(
                            abs(
                                level_from_mu(u.after.rating.mu, config)
                                - (4 + (by_id[u.competitor_id].true_mu - 25) / 5)
                            )
                        )

        table = standings(state, Ladder.DOUBLES, config)
        eligible = [s for s in table if s.eligible]
        true_levels = [
            min(7.0, max(1.0, 4 + (by_id[s.competitor_id].true_mu - 25) / 5)) for s in eligible
        ]
        tiers = Counter(s.rank.tier for s in eligible)
        report = SeasonReport(
            season=season,
            matches=match_no,
            spearman_rank_true=spearman([s.total_lp for s in eligible], true_levels)
            if eligible
            else 0.0,
            spearman_mu_true=spearman([s.level for s in eligible], true_levels)
            if eligible
            else 0.0,
            eligible=len(eligible),
            ranked=len(table),
            tiers={t: 100 * tiers[t] / max(1, len(eligible)) for t in TIER_NAMES},
            mean_total_lp=statistics.fmean(s.total_lp for s in eligible) if eligible else 0.0,
            mean_abs_level_error=statistics.fmean(
                abs(s.level - t) for s, t in zip(eligible, true_levels, strict=True)
            )
            if eligible
            else 0.0,
            placement_error=statistics.fmean(placement_errors)
            if season == 1 and placement_errors
            else None,
        )
        reports.append(report)
        series["spearman"].append(report.spearman_rank_true)
        series["lp_mean"].append(report.mean_total_lp)
        if season < seasons:
            state = start_new_season(state, config)
    return reports, examples, series


def svg_bars(
    title: str, groups: dict[str, tuple[float, float]], width: int = 640, height: int = 260
) -> str:
    """Grouped bars: simulated (navy) vs target (gold). Values in percent."""
    left, bottom, top = 40, 40, 30
    plot_h = height - bottom - top
    n = len(groups)
    slot = (width - left - 10) / n
    top_value = max(max(v) for v in groups.values()) * 1.15 or 1
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" font-family="Inter,Arial" font-size="12">',
        f'<rect width="{width}" height="{height}" fill="#ffffff"/>',
        f'<text x="{left}" y="18" font-size="14" font-weight="600" fill="#0B1220">{title}</text>',
        f'<line x1="{left}" y1="{height - bottom}" x2="{width - 10}" y2="{height - bottom}" stroke="#94A3B8"/>',
    ]
    for i, (label, (sim, target)) in enumerate(groups.items()):
        x = left + i * slot + slot * 0.15
        bar = slot * 0.33
        for j, (value, colour) in enumerate(((sim, "#0B2545"), (target, "#C8A96A"))):
            h = plot_h * value / top_value
            y = height - bottom - h
            parts.append(
                f'<rect x="{x + j * bar:.1f}" y="{y:.1f}" width="{bar - 2:.1f}" height="{h:.1f}" fill="{colour}"/>'
            )
            parts.append(
                f'<text x="{x + j * bar + bar / 2 - 1:.1f}" y="{y - 4:.1f}" text-anchor="middle" fill="#334155">{value:.0f}</text>'
            )
        parts.append(
            f'<text x="{x + bar:.1f}" y="{height - bottom + 18}" text-anchor="middle" fill="#0B1220">{label}</text>'
        )
    parts.append(
        f'<rect x="{width - 200}" y="8" width="10" height="10" fill="#0B2545"/><text x="{width - 186}" y="17">simulare</text>'
        f'<rect x="{width - 120}" y="8" width="10" height="10" fill="#C8A96A"/><text x="{width - 106}" y="17">țintă</text>'
    )
    parts.append("</svg>")
    return "\n".join(parts)


def svg_line(
    title: str, values: list[float], floor: float | None, width: int = 640, height: int = 240
) -> str:
    left, bottom, top = 50, 36, 30
    lo = min([*values, floor if floor is not None else values[0]]) - 0.05
    hi = max(values) + 0.05
    plot_w, plot_h = width - left - 20, height - top - bottom

    def x(i: int) -> float:
        return left + plot_w * (i / max(1, len(values) - 1))

    def y(v: float) -> float:
        return top + plot_h * (1 - (v - lo) / (hi - lo))

    points = " ".join(f"{x(i):.1f},{y(v):.1f}" for i, v in enumerate(values))
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" font-family="Inter,Arial" font-size="12">',
        f'<rect width="{width}" height="{height}" fill="#ffffff"/>',
        f'<text x="{left}" y="18" font-size="14" font-weight="600" fill="#0B1220">{title}</text>',
        f'<polyline points="{points}" fill="none" stroke="#0B2545" stroke-width="2.5"/>',
    ]
    if floor is not None:
        parts.append(
            f'<line x1="{left}" y1="{y(floor):.1f}" x2="{width - 20}" y2="{y(floor):.1f}" stroke="#0E6B4F" stroke-dasharray="6 4"/>'
            f'<text x="{width - 20}" y="{y(floor) - 6:.1f}" text-anchor="end" fill="#0E6B4F">prag {floor}</text>'
        )
    for i, v in enumerate(values):
        parts.append(f'<circle cx="{x(i):.1f}" cy="{y(v):.1f}" r="3.5" fill="#0B2545"/>')
        parts.append(
            f'<text x="{x(i):.1f}" y="{height - 12}" text-anchor="middle" fill="#334155">S{i + 1}</text>'
        )
        parts.append(
            f'<text x="{x(i):.1f}" y="{y(v) - 8:.1f}" text-anchor="middle" fill="#334155">{v:.2f}</text>'
        )
    parts.append("</svg>")
    return "\n".join(parts)


def write_report(
    out: Path,
    reports: list[SeasonReport],
    examples: list[str],
    series: dict[str, list[float]],
    args: argparse.Namespace,
    config: LeagueConfig,
) -> None:
    out.mkdir(parents=True, exist_ok=True)
    last = reports[-1]
    (out / f"{args.name}-distributie-ranguri.svg").write_text(
        svg_bars(
            f"Distribuția pe ranguri, sezonul {last.season} (% din jucătorii eligibili)",
            {TIER_RO[t]: (last.tiers[t], TARGET[t]) for t in TIER_NAMES},
        ),
        encoding="utf-8",
    )
    (out / f"{args.name}-corelatie-spearman.svg").write_text(
        svg_line("Corelația Spearman rang–nivel real, pe sezoane", series["spearman"], 0.85),
        encoding="utf-8",
    )
    rows = "\n".join(
        f"| {r.season} | {r.matches} | {r.ranked} | {r.eligible} | {r.spearman_rank_true:.3f} | "
        f"{r.spearman_mu_true:.3f} | {r.mean_total_lp:.0f} | {r.mean_abs_level_error:.2f} |"
        for r in reports
    )
    tier_rows = "\n".join(
        f"| {TIER_RO[t]} | {last.tiers[t]:.1f}% | {TARGET[t]}% |" for t in TIER_NAMES
    )
    converged = reports[1:] if len(reports) > 1 else reports
    min_spearman = min(r.spearman_rank_true for r in converged)
    lp_values = [r.mean_total_lp for r in reports]
    placement = reports[0].placement_error
    text = f"""# Raportul simulării ligii

> Generat automat de `packages/league-engine/tools/simulate.py` (sămânța {args.seed}). Configurarea ligii: versiunea {config.version}, valorile implicite din §6.
> Comanda: `uv run python tools/simulate.py --players {args.players} --matches {args.matches} --seasons {args.seasons} --seed {args.seed} --level-floor {args.level_floor} --level-master {args.level_master} --name {args.name}`
> `LP_total_așteptat = (Nivel − {args.level_floor}) / ({args.level_master} − {args.level_floor}) × 2000` (§6.6 dă 1,0 și 7,0).

## Pe scurt
- **{args.players} de jucători** cu un „nivel real” ascuns (distribuție normală în jurul nivelului 3,8), **{last.matches} de meciuri** oficiale în **{args.seasons} sezoane** de 3 luni (80% dublu, 20% simplu, 5% neterminate, 3% de turneu).
- Fiecare jucător pornește de la chestionar (nivelul real ± o eroare de 0,7), trece prin 5 meciuri de plasare și joacă mai ales cu parteneri și adversari de nivel apropiat, ca într-un club real. Nivelul real se schimbă încet (oamenii progresează sau pierd din formă).
- **Corelația dintre rang și nivelul real** (Spearman, jucători eligibili, clasamentul pe dublu): minimum **{min_spearman:.3f}** după primul sezon (ținta §6.17: ≥ 0,85) → {"**atinsă**" if min_spearman >= 0.85 else "**neatinsă**"}.
- **Inflația LP** (LP total mediu la final de sezon): între {min(lp_values):.0f} și {max(lp_values):.0f}, fără creștere de la un sezon la altul (resetarea o ține în frâu).
- **Plasarea:** chestionarul greșește în medie cu **{series["questionnaire_error"][0]:.2f}** niveluri; după cele 5 meciuri de plasare, nivelul afișat diferă în medie cu **{placement if placement is not None else float("nan"):.2f}** de nivelul real, iar după câteva sezoane cu **{last.mean_abs_level_error:.2f}**. σ inițial folosit: {args.initial_sigma if args.initial_sigma else "σ0 = 8,33"}.

## Pe sezoane
| Sezon | Meciuri (cumulat) | Jucători clasați | Eligibili (≥ 12 meciuri) | Spearman rang–nivel real | Spearman nivel afișat–nivel real | LP total mediu | Eroare medie a nivelului |
|---|---|---|---|---|---|---|---|
{rows}

![Corelația pe sezoane]({args.name}-corelatie-spearman.svg)

## Distribuția pe ranguri (sezonul {last.season})
| Rang | Simulare | Țintă orientativă (§6.17) |
|---|---|---|
{tier_rows}

![Distribuția pe ranguri]({args.name}-distributie-ranguri.svg)

Distribuția pe ranguri urmează, în mare, distribuția nivelurilor reale ale jucătorilor: formula LP (factorul `g`) trage fiecare jucător spre rangul care corespunde nivelului său. Ținta din §6.17 este orientativă; distribuția reală a clubului o vom vedea abia după deschidere. Parametrul care o mută este `LP_total_așteptat` (§6.6); el se poate schimba din configurarea versionată fără cod.

## Exemple de meciuri cu LP calculat (ultimul sezon)
Jucătorii încă în re-plasare (primele 3 meciuri ale sezonului) nu primesc LP, de aceea unele rânduri au mai puțini jucători.

| Meci | p (echipa A, înainte) | Câștigător | w | Tip | ΔLP pe jucător |
|---|---|---|---|---|---|
{chr(10).join(examples)}

## Ce verifică simularea (§6.17)
1. Rangul ajunge să reflecte nivelul real (corelația de mai sus).
2. LP nu „se umflă” de la un sezon la altul.
3. Plasarea apropie rapid nivelul afișat de cel real.
4. Resetarea de sezon (LP la 0, MMR comprimat cu 0,75 spre medie, 3 meciuri de re-plasare) nu strică ordinea: corelația revine imediat.
"""
    (out / f"{args.name}.md").write_text(text, encoding="utf-8")


def main(argv: Sequence[str] | None = None) -> list[SeasonReport]:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--players", type=int, default=500)
    parser.add_argument("--matches", type=int, default=50_000)
    parser.add_argument("--seasons", type=int, default=8)
    parser.add_argument("--seed", type=int, default=2027)
    parser.add_argument("--level-floor", type=float, default=DEFAULT_CONFIG.expected_lp_level_floor)
    parser.add_argument(
        "--level-master", type=float, default=DEFAULT_CONFIG.expected_lp_level_master
    )
    parser.add_argument(
        "--initial-sigma", type=float, default=None, help="σ after the questionnaire"
    )
    parser.add_argument("--name", default="RAPORT_SIMULARE", help="report file name (without .md)")
    parser.add_argument(
        "--out", type=Path, default=Path(__file__).resolve().parents[3] / "docs/03-liga/simulari"
    )
    args = parser.parse_args(argv)
    config = replace(
        DEFAULT_CONFIG,
        expected_lp_level_floor=args.level_floor,
        expected_lp_level_master=args.level_master,
    )
    reports, examples, series = simulate(
        args.players, args.matches, args.seasons, args.seed, config, args.initial_sigma
    )
    write_report(args.out, reports, examples, series, args, config)
    for r in reports:
        print(
            f"S{r.season}: spearman={r.spearman_rank_true:.3f} eligible={r.eligible}/{r.ranked} "
            f"lp={r.mean_total_lp:.0f} tiers={ {k: round(v) for k, v in r.tiers.items()} }"
        )
    return reports


if __name__ == "__main__":
    main()
