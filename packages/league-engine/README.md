# Motorul ligii (Python pur)

> **Stare:** construit în Etapa 2 (27.09.2026). 173 de teste, **100% acoperire pe ramuri**, teste de proprietate (hypothesis), comparație cu `openskill`, simulare mare cu raport.

## Ce face

Liga ca funcție pură: `(stare, meci, configurare) → (stare nouă, eveniment de rating)`. Fără Django, fără bază de date, fără rețea, fără ceas (§6, ADR-0008).

| Modul | Ce conține | Reguli |
|---|---|---|
| `config.py` | toate constantele §6, într-o configurare imutabilă, versionată | LG-025 … |
| `rating.py` | Weng-Lin Thurstone–Mosteller pentru două echipe, probabilitatea de câștig | LG-020 … LG-024 |
| `levels.py` | nivelul afișat 1.0–7.0, μ din chestionar, LP așteptat | LG-030, LG-040, LG-061 |
| `ranks.py` | ranguri, promovare/retrogradare/protecție, rangul după plasare, decay | LG-043, LG-050 … LG-058, LG-106, LG-107 |
| `lp.py` | LP pentru un meci (K, g, tip, w, anti-farming, limite) | LG-060 … LG-069 |
| `rounding.py` | rotunjirea „.5 departe de zero” (niciodată `round()`) | LG-066 |
| `score.py` | validatorul de scor, meciurile neterminate, factorul w | LG-070 … LG-084 |
| `antiabuse.py` | minimul de meciuri, eligibilitatea live, randamentul descrescător, limita zilnică | LG-100 … LG-104 |
| `challenges.py` | provocări: cine pe cine, termene, refuzuri | LG-110 … LG-113 |
| `engine.py` | starea ligii, aplicarea unui meci (eveniment înainte/după), replay, bonusuri, decay zilnic, resetarea de sezon | LG-001 … LG-004, LG-130 … LG-133, LG-140, LG-141, LG-160, LG-161 |
| `leaderboard.py` | clasamente, departajare, eligibilitate, Regele Junglei | LG-051, LG-057, LG-100, LG-101 |
| `tools/simulate.py` | simularea mare (500 de jucători, 50.000 de meciuri) și raportul | §6.17 |

ID-urile regulilor: [docs/03-liga/ID-URI-REGULI.md](../../docs/03-liga/ID-URI-REGULI.md). Calibrarea: [docs/03-liga/simulari/CALIBRARE.md](../../docs/03-liga/simulari/CALIBRARE.md).

## Specificații

- [Liga Jungle — specificația completă](../../docs/03-liga/README.md)

## Decizii tehnice

[ADR-0008](../../docs/04-arhitectura/adr/0008-motorul-ligii.md), [ADR-0021](../../docs/04-arhitectura/adr/0021-calitate-teste-ci.md), [ADR-0022](../../docs/04-arhitectura/adr/0022-feature-flags-configurare-versionata.md)

## Rulare, testare

| Ce | Comandă (din `packages/league-engine`) |
|---|---|
| Teste + acoperire 100% pe ramuri | `uv run pytest --cov` |
| Tipuri (strict) | `uv run mypy src tools` |
| Simularea mare → `docs/03-liga/simulari/` | `uv run python tools/simulate.py` |

Toate sunt incluse în `scripts/test-all`. Pachetul nu are servicii de rulat, variabile de mediu sau imagine Docker: backend-ul îl folosește ca bibliotecă (Etapa 6).

## Garanții verificate de teste
- Victoria nu dă niciodată LP negativ, înfrângerea niciodată pozitiv; limitele ±3…±60 și ±20 la egalitate (teste de proprietate).
- Niciodată două trepte într-un meci; podelele (Bronz IV, Diamant IV la decay) și protecția după promovare respectate.
- Aplicarea e idempotentă; recalcularea de la orice punct = recalcularea de la zero, identic.
- Ratingul coincide cu `openskill` 6.2 (diferență ≤ 1e-9) la victorii și înfrângeri; diferența deliberată la egalitate e documentată (LG-023).
