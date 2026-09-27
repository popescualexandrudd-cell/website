# Simulările ligii

Rapoartele simulării mari a ligii (500 de jucători, 50.000 de meciuri, 8 sezoane) și calibrarea parametrilor (§6.17).

## Conținut
- [CALIBRARE.md](CALIBRARE.md) — ce am verificat, ce am calibrat și de ce (de citit primul).
- [RAPORT_SIMULARE.md](RAPORT_SIMULARE.md) — raportul generat automat, cu valorile implicite ale motorului.
- [RAPORT_SIMULARE_FORMULA_INITIALA.md](RAPORT_SIMULARE_FORMULA_INITIALA.md) — același raport cu formula scrisă în §6.6, pentru comparație.

## Reproducere
`cd packages/league-engine && uv run python tools/simulate.py` (implicit: 500 de jucători, 50.000 de meciuri, 8 sezoane, sămânța 2027). Opțiuni: `--level-floor`, `--level-master`, `--initial-sigma`, `--name`, `--out`.
