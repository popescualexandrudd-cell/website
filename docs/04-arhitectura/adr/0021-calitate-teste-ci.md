# ADR-0021: Calitate — unelte, teste și verificare automată cu o singură comandă

- **Stare:** Acceptat (26.09.2026, odată cu aprobarea Etapei 0 de către proprietar)
- **Data:** 2026-09-26
- **Legat de:** §1.1 punctele 1 și 7, §4.3, §13

## Context
Standardul cerut este „fără erori”: teste verzi, acoperire mare pe logica critică (liga și banii la 100% ramuri), lint și verificare de tipuri curate, zero avertismente ignorate.

## Decizie
1. **Python:** `ruff` (lint + formatare), `mypy` (strict pe `league-engine`, pe bani și pe plăți; progresiv pe restul), `pytest` + `pytest-django` + `hypothesis` + `coverage` (100% ramuri pe ligă și bani), `time-machine` pentru teste de timp.
2. **TypeScript:** ESLint + Prettier + `tsc --strict`, Vitest + Testing Library.
3. **End-to-end:** Playwright, pe fluxurile complete dintre aplicații, cu simulatoarele hardware (§13.1); **accesibilitate** cu `axe` în Playwright.
4. **Încărcare:** k6 (de exemplu 500 de utilizatori simultani + ecrane conectate, §13.3).
5. **Securitate:** `pip-audit`, `pnpm audit`, analiză statică (`bandit`/`semgrep`), `gitleaks` pentru secrete.
6. **pre-commit hooks** pentru formatare, lint și căutare de secrete.
7. **`scripts/test-all`** rulează tot, local, cu o singură comandă (§13.5). Același script rulează automat în GitHub Actions la fiecare push, ca oglindă; proiectul rămâne verificabil și fără GitHub.
8. **Trasabilitate:** numele sau docstring-ul fiecărui test menționează ID-ul regulii verificate (`R-041`, `LG-xxx`).
9. **Commit-uri** în engleză, în stilul Conventional Commits (`feat:`, `fix:`, `docs:` …), cu dubla revizuire rezumată în descrierea etapei (§13.6).

## Alternative analizate
- **Doar teste manuale:** incompatibil cu cerința „fără erori” și cu mentenanța fără programator. Respins.

## Consecințe
- Fiecare etapă se încheie doar cu `scripts/test-all` verde (Definition of Done, §13).
