# Jurnalul modificărilor (CHANGELOG)

Formatul urmează [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versiunile urmează versionarea semantică (§14). Fiecare etapă aprobată primește un tag git (`etapa-0`, `etapa-1a` …).

## [Nelansat]

### Etapa 1A — 27.09.2026 (așteaptă aprobarea)
#### Adăugat
- `apps/backend`: Django 5.2 LTS + Django Ninja, API `/api/v1` cu schemă OpenAPI; erori cu coduri stabile.
- Conturi: înregistrare cu acorduri versionate (hash), verificarea emailului, resetarea parolei, schimbarea parolei, profil; conturi rapide pentru invitați (Q8); conturi de copii în spatele unui comutator (Q7).
- Personal: roluri pe acțiuni, globale sau pe locație; 2FA TOTP obligatorie cu coduri de recuperare și protecție la reutilizare; blocare temporară după încercări greșite; limită de înregistrări pe IP.
- Locații și resurse administrabile fără cod; dispozitive; date inițiale (`seed_initial`, `--demo`).
- Jurnal de audit, versiuni de configurare și acorduri: tabele doar-adăugare (trigger PostgreSQL).
- Feature flags și configurare versionată, cu lista valorilor `DE_CONFIRMAT`.
- Admin tehnic de urgență (doar Admin + 2FA, modificări auditate).
- `packages/i18n` (RO/EN, test de completitudine), `packages/api-client` (generat din OpenAPI).
- `scripts/test-all`, `scripts/setup`, `scripts/dev`, `scripts/generate-api-client`; Dockerfile, Docker Compose de dezvoltare, pre-commit, GitHub Actions.
- Întrebarea nouă Q43 (vârsta minimă pentru cont propriu).
#### Reparat la revizuire
- Link de resetare cu `uid` invalid → eroare 500; acum „link invalid”.
- Câmpul 2FA lipsea de pe pagina de login a adminului de urgență.

### Etapa 0 — 26.09.2026 (aprobată 26.09.2026, tag `etapa-0`)
#### Adăugat
- Structura monorepo din §4.4 (`apps/`, `packages/`, `services/`, `deploy/`, `scripts/`, `tests/`, `docs/`), cu README în fiecare folder.
- `MEGA_PROMPT.md` (neschimbat, referință istorică).
- Documentația împărțită pe secțiuni în `docs/` (text preluat integral, cu ID-urile regulilor păstrate).
- `CLAUDE.md` — memoria operațională a proiectului.
- ADR-0001 … ADR-0022 (decizii de stack și de arhitectură, stare „Propus”).
- Diagrame de arhitectură (Mermaid).
- `INTREBARI_DESCHISE.md` (Q1–Q42), `PROGRES.md`, `PLAN_DETALIAT.md`, `CALENDAR.md`.
- Criterii de achiziție hardware.
- `.gitignore`, `.editorconfig`, `.gitattributes`.
#### Modificat la aprobare
- Răspunsurile proprietarului înregistrate în `INTREBARI_DESCHISE.md` (stare nouă `PARȚIAL`).
- ADR-0001 … ADR-0022: stare „Acceptat”.
- Apple Wallet amânat (Q24); textele legale redactate fără avocat, cu mențiune obligatorie (Q41).
