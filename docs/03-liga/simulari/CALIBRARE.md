# Calibrarea parametrilor ligii (Etapa 2, 27.09.2026)

> Pe baza simulării mari (§6.17): 500 de jucători, 50.000 de meciuri, 8 sezoane. Rapoartele complete, generate automat:
> - [RAPORT_SIMULARE.md](RAPORT_SIMULARE.md) — cu valorile calibrate (cele implicite în motor);
> - [RAPORT_SIMULARE_FORMULA_INITIALA.md](RAPORT_SIMULARE_FORMULA_INITIALA.md) — cu formula scrisă în §6.6, pentru comparație.
>
> Reproducere: `cd packages/league-engine && uv run python tools/simulate.py` (aceeași sămânță = același raport).

## Ce am verificat și rezultatul
| Verificare (§6.17) | Țintă | Rezultat |
|---|---|---|
| Corelația Spearman rang–nivel real, după convergență | ≥ 0,85 | **0,96–0,98** din sezonul 2 (0,93 chiar în primul sezon) |
| Inflația LP de la un sezon la altul | mărginită | LP total mediu stabil (~960) din sezonul 3; resetarea îl ține pe loc |
| Convergența plasărilor | rapidă | nivelul afișat ajunge la ±0,4 de nivelul real; primul sezon e mai zgomotos (vezi mai jos) |
| Distribuția pe ranguri | orientativ 20/25/25/17/10/3 % | 15/22/28/25/8/2 % cu valorile calibrate |
| Efectul resetării | fără să strice ordinea | corelația revine imediat după cele 3 meciuri de re-plasare |

## Parametrul calibrat: LP_total_așteptat (LG-061)
Formula din §6.6, `(Nivel − 1,0)/6,0 × 2000`, face ca **nimeni să nu ajungă Maestru**: un jucător ar trebui să aibă nivelul 7,0 ca să fie „așteptat” la 2000 LP, iar factorul `g` îl frânează înainte. Rezultat: 0% Maeștri și 3% Diamant (raportul cu formula inițială).

Am încercat mai multe perechi de niveluri-ancoră (nivelul la care ești „așteptat” la Bronz IV, respectiv la Maestru):

| Ancore (Bronz IV → Maestru) | Bronz | Argint | Aur | Platină | Diamant | Maestru |
|---|---|---|---|---|---|---|
| 1,0 → 7,0 (§6.6) | 15% | 29% | 38% | 15% | 3% | 0% |
| 2,2 → 6,2 | 32% | 25% | 25% | 12% | 5% | 1% |
| 1,0 → 6,0 | 12% | 22% | 29% | 27% | 9% | 2% |
| **1,3 → 5,9 (ales)** | **15%** | **22%** | **28%** | **25%** | **8%** | **2%** |
| 1,0 → 5,7 | 12% | 19% | 27% | 27% | 12% | 3% |
| Țintă orientativă (§6.17) | 20% | 25% | 25% | 17% | 10% | 3% |

**Ales: `(Nivel − 1,3) / 4,6 × 2000`** (parametrii `expected_lp_level_floor = 1.3`, `expected_lp_level_master = 5.9`), marcat **DE_CONFIRMAT**. Motivul: cea mai apropiată distribuție de țintă, cu corelația cea mai bună.

**Limita importantă:** distribuția pe ranguri urmează distribuția nivelurilor reale ale jucătorilor. În simulare am presupus niveluri în jurul valorii 3,8 (±1,15), dar nivelurile reale ale clubului nu le cunoaștem încă. De aceea **recalibrăm după „Sezonul 0 – Calibrare”** (Q27), cu datele reale; schimbarea se face din configurarea versionată, fără cod, și intră în vigoare de la sezonul următor.

## σ după chestionar (LG-040): păstrăm σ0
Cu σ0 = 8,33 (specificația), primele 5 meciuri de plasare mută mult nivelul, iar după plasare nivelul afișat e, în medie, **mai departe** de cel real (0,77) decât chestionarul (0,53). Efectul dispare până la finalul primului sezon.

| σ după chestionar | Eroarea după plasare | Eroarea la finalul sezonului 1 |
|---|---|---|
| 8,33 (σ0, implicit) | 0,77 | 0,82 |
| 6,0 | 0,64 | 0,61 |
| 4,5 | 0,52 | 0,47 |
| 3,5 | 0,48 | 0,40 |

Rămânem la σ0, cum cere §6.2 („nou-veniții se mișcă repede”), pentru că ținta de corelație e atinsă oricum și chestionarul real poate greși mai mult decât în simulare. **Propunere pentru după Sezonul 0:** dacă antrenorul validează chestionarul (LG-041), σ = 5 pentru jucătorii validați. Motorul permite deja un σ ales la înscriere.

## Ce nu s-a schimbat
Toți ceilalți parametri din §6 au rămas la valorile din specificație (K = 40, limitele LP, plasarea, protecția, retrogradarea, decay-ul, resetarea de sezon).
