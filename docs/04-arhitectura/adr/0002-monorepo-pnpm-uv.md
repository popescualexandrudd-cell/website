# ADR-0002: Monorepo cu workspace-uri pnpm (TypeScript) și uv (Python)

- **Stare:** Acceptat (26.09.2026, odată cu aprobarea Etapei 0 de către proprietar)
- **Data:** 2026-09-26
- **Legat de:** §4.4, §1.1 punctul 3

## Context
Sistemul are 7 aplicații (`apps/`), 5 pachete partajate (`packages/`) și un serviciu local (`services/hardware-bridge`). Aplicațiile folosesc aceleași tipuri de date (clientul API), aceleași componente, aceiași tokeni de design și aceleași traduceri. Fiecare aplicație trebuie să poată fi rulată și publicată separat, pe domeniul ei (§4.4, §4.6).

## Decizie
1. Un singur repository git (monorepo), cu structura din §4.4.
2. **TypeScript:** workspace **pnpm** pentru `apps/web`, `apps/admin`, `apps/kiosk-league`, `apps/kiosk-payments`, `apps/court-screens`, `apps/cafe-display` și `packages/design-tokens`, `packages/ui`, `packages/api-client`, `packages/i18n`.
3. **Python:** workspace **uv** pentru `apps/backend`, `packages/league-engine` și `services/hardware-bridge`; fiecare are propriul `pyproject.toml`, cu un singur fișier de blocare a versiunilor (`uv.lock`) în rădăcină.
4. Versiunile de Node.js (LTS) și Python (≥ 3.12) se fixează în Etapa 1A în `.node-version` și `.python-version`.
5. Fără Turborepo/Nx la început: scripturi simple în `scripts/` și în `package.json`. Se reevaluează dacă timpii de build cresc.
6. Reguli de dependență: `packages/*` nu importă niciodată din `apps/*`; `league-engine` nu depinde de Django; aplicațiile comunică între ele doar prin API.
7. Fiecare folder din `apps/`, `packages/` și `services/` are `README.md`, `.env.example` (unde e cazul), `Dockerfile` (unde e cazul) și teste proprii (§4.4).

## Alternative analizate
- **Mai multe repository-uri (polyrepo):** tipurile, tokenii și clientul API s-ar desincroniza; mai greu de întreținut de o singură persoană. Respins.
- **npm / yarn workspaces:** pnpm este mai strict cu dependențele și mai rapid. Respins.
- **Poetry pentru Python:** uv este mai rapid și are suport nativ pentru workspace-uri. Respins.

## Consecințe
- O schimbare de API și actualizarea clientelor lui intră în același commit.
- Un singur `scripts/test-all` poate verifica tot sistemul.
- Mediul de dezvoltare are nevoie de Node.js LTS, pnpm, uv, Python ≥ 3.12, Docker (verificate în Etapa 1A).
