# ADR-0025: Componentele partajate stau în `packages/kiosk-kit` și în fiecare aplicație, fără `packages/ui`

- **Stare:** Acceptat (06.10.2026, verificarea finală după Etapa 16; decizie delegată de proprietar: „orice întrebare mai ai alege răspunsul cel mai relevant”)
- **Data:** 2026-10-06
- **Legat de:** ADR-0007 (îl înlocuiește la punctul 4), ADR-0020
- **Înlocuiește:** ADR-0007, punctul 4 (`packages/ui`)

## Context
ADR-0007 prevedea un pachet `packages/ui` cu componentele React comune tuturor interfețelor. În Etapele 1B–14 s-a văzut că interfețele au puțin în comun la nivel de componentă:
- site-ul (Next.js) e făcut aproape numai din componente de server, fără cod în browser, ca să rămână peste 90 în Lighthouse pe mobil;
- panoul de admin are tabele și formulare proprii, pe ecrane mari;
- ecranele aparatelor (chioșcurile, ecranele de teren, afișajul cafenelei) au în comun mult: legătura cu Hardware Bridge, tastaturile tactile, ora clubului, banii în lei, stilul de bază.

Ce e comun tuturor (culori, fonturi, spații) stă deja în `packages/design-tokens` (ADR-0020), iar textele în `packages/i18n`.

## Decizie
1. Ce au în comun aparatele stă în **`packages/kiosk-kit`** (creat în Etapa 8), cu teste proprii.
2. Site-ul și panoul își țin componentele în aplicația lor, construite doar pe tokeni.
3. `packages/ui` (rămas schelet din Etapa 0, fără cod) se șterge.

## Consecințe
- O componentă care ajunge să fie folosită identic în două aplicații de alt tip se mută într-un pachet atunci, nu dinainte.
- Accesibilitatea (WCAG 2.2 AA, contrast AAA pentru text) se verifică în continuare în fiecare aplicație (axe în testele cap-coadă).
