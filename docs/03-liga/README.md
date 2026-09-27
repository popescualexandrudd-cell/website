# Liga Jungle — specificația completă

Specificația ligii (§6), câte un fișier pe subsecțiune. Implementarea: [`packages/league-engine`](../../packages/league-engine/) (ADR-0008).

## Conținut

- [6. LIGA JUNGLE — SPECIFICAȚIE COMPLETĂ](00-introducere-si-model.md)
- [6.1 Ce e activ](01-ce-e-activ.md)
- [6.2 MMR (rating ascuns) — model bayesian cu incertitudine pentru echipe](02-mmr-rating-ascuns.md)
- [6.3 Nivelul afișat (1.0–7.0)](03-nivelul-afisat.md)
- [6.4 Intrarea în ligă (jucători noi)](04-intrarea-in-liga.md)
- [6.5 Ranguri (confirmat: Bronz → Diamant, cu trepte)](05-ranguri.md)
- [6.6 Calculul LP pentru un meci oficial](06-calculul-lp.md)
- [6.7 Formatul scorului (confirmat: ca la padelul oficial)](07-formatul-scorului.md)
- [6.8 Meciuri neterminate (confirmat)](08-meciuri-neterminate.md)
- [6.9 Fluxul de validare (mașină de stări, pe server)](09-fluxul-de-validare.md)
- [6.10 Anti-abuz și eligibilitate](10-anti-abuz-si-eligibilitate.md)
- [6.11 Provocări directe (confirmat)](11-provocari-directe.md)
- [6.12 Recompense (confirmat)](12-recompense.md)
- [6.13 Sezoane](13-sezoane.md)
- [6.14 Tipuri de meci](14-tipuri-de-meci.md)
- [6.15 Gamificare](15-gamificare.md)
- [6.16 Corectitudine tehnică (obligatoriu)](16-corectitudine-tehnica.md)
- [6.17 Testele ligii (obligatorii, înainte de orice integrare)](17-testele-ligii.md)
- [`simulari/`](simulari/) — rapoartele simulărilor ligii și calibrarea (Etapa 2)
- [ID-URI-REGULI.md](ID-URI-REGULI.md) — ID-urile `LG-xxx` ale regulilor și unde e implementată fiecare (Etapa 2)
- [NIVELURI.md](NIVELURI.md) — ce înseamnă fiecare nivel 1.0–7.0, în cuvinte (Etapa 2)

## Stare
- Etapa 2 (27.09.2026): motorul ligii în [`packages/league-engine`](../../packages/league-engine/), simularea mare și calibrarea, sursa oficială FIP pentru regula la 40–40 (nota din [07-formatul-scorului.md](07-formatul-scorului.md)).
- Urmează: Etapa 6, integrarea (fluxul de validare, sezoane, provocări, turnee, recompense).
