# Motorul ligii (Python pur)

> **Stare:** neînceput (schelet creat în Etapa 0, 26.09.2026). **Se construiește în Etapa:** 2.

## Ce face

Rating MMR (Weng-Lin), nivelul 1.0–7.0, plasare, ranguri și LP, promovare/retrogradare, validatorul de scor, meciuri neterminate, anti-abuz, decay, provocări, sezoane, recalculare deterministă și simulări (§6). Fără Django, fără bază de date, fără rețea: testabil izolat, 100% acoperire pe ramuri.

## Specificații

- [Liga Jungle — specificația completă](../../docs/03-liga/README.md)

## Decizii tehnice

[ADR-0008](../../docs/04-arhitectura/adr/0008-motorul-ligii.md), [ADR-0021](../../docs/04-arhitectura/adr/0021-calitate-teste-ci.md), [ADR-0022](../../docs/04-arhitectura/adr/0022-feature-flags-configurare-versionata.md)

## Rulare, testare, deploy

Etapa 0 nu conține cod. `.env.example`, `Dockerfile` (unde e cazul) și testele se adaugă în etapa care construiește componenta, împreună cu instrucțiunile de rulare, testare și deploy.
