# CLAUDE.md — Jungle Padel

Memoria operațională a proiectului. Se actualizează la finalul fiecărei etape, ca orice sesiune viitoare (sau un programator angajat ulterior) să continue fără pierderi de context.

## Proiectul pe scurt
Sistem digital propriu pentru clubul **Jungle Padel** (Șoseaua Biruinței, lângă Selgros Pantelimon): 4 terenuri de padel închise, pilates Reformer (4 → 6 aparate), sală de evenimente, cafenea, ligă de padel de tip MMR. Deschidere: **martie 2027**. Proprietarul **nu are programator**: noi construim și întreținem, în sesiuni succesive. Backend-ul și website-ul sunt singura sursă de adevăr; chioșcurile, ecranele, afișajul cafenelei și adminul sunt „ferestre” spre aceleași date, conectate live.

## Stare curentă
- **Etapa 0 aprobată pe 26.09.2026** (tag `etapa-0` doar local: push-ul de tag-uri e refuzat de GitHub din acest mediu). **Etapa 1A aprobată pe 27.09.2026.** **Etapa 1B (pagina de pre-lansare) în lucru.** Proprietarul cere design modern, estetic, culori atractive, efecte 3D.
- Decizii ale proprietarului din 26.09.2026: Apple Wallet amânat (Q24); textele legale le redactăm noi, fără avocat (Q41); hardware ales mai târziu, lucrăm cu simulatoare (Q23); server propriu sau închiriat (Q40); cont propriu de la 14 ani (Q43, 27.09.2026).
- Detalii: [docs/00-management/PROGRES.md](docs/00-management/PROGRES.md).

## La începutul fiecărei sesiuni, citește în ordine
1. Acest fișier.
2. [PROGRES.md](docs/00-management/PROGRES.md) — unde suntem, ce s-a aprobat.
3. [INTREBARI_DESCHISE.md](docs/00-management/INTREBARI_DESCHISE.md) — ce a răspuns proprietarul, ce e încă deschis.
4. Specificațiile atinse de sarcină (harta secțiunilor: [docs/README.md](docs/README.md)) și [indexul ADR](docs/04-arhitectura/adr/README.md).

## Surse de adevăr
- [`MEGA_PROMPT.md`](MEGA_PROMPT.md): documentul original, **nu se modifică niciodată** (referință istorică).
- `docs/`: documentația de lucru, împărțită din MEGA_PROMPT în Etapa 0 (text integral, ID-urile păstrate). Orice modificare se scrie acolo, cu data și sursa („confirmat de proprietar la data X”).
- Regulile de business: `docs/02-reguli-business/` (ID-uri `R-xxx`). Liga: `docs/03-liga/` (ID-uri `LG-xxx` din Etapa 2).
- Deciziile tehnice: ADR-uri în `docs/04-arhitectura/adr/` (procedura în ADR-0001; o decizie schimbată = ADR nou care îl înlocuiește pe cel vechi).

## Reguli de lucru (obligatorii)
1. **Etape cu aprobare explicită.** Fiecare etapă se încheie cu teste verzi, dublă revizuire, documentație la zi, instrucțiuni de verificare pentru proprietar și aprobare. Website-ul se livrează **secțiune cu secțiune**. Niciodată totul dintr-odată.
2. **Dublă verificare** pentru fiecare modul: scrii → rulezi și testezi automat → revizuire cap-coadă a fluxului unui client real, inclusiv erorile → a doua revizuire din perspectiva unui atacator și a cazurilor-limită → abia apoi livrezi.
3. **Fișiere complete.** Fără cod trunchiat, „...”, „restul rămâne la fel” sau TODO-uri ascunse în producție.
4. **Nu presupune în tăcere.** Ambiguitățile intră în `INTREBARI_DESCHISE.md` cu varianta implicită; lucrezi cu varianta implicită, configurabilă, marcată `DE_CONFIRMAT` (decizie) sau `DE_STABILIT` (preț), vizibilă în admin.
5. **Sistem propriu, fără platforme terțe** (fără Playtomic, fără SaaS de rezervări). Excepții inevitabile, doar prin adaptoare interschimbabile: procesatorul de plăți online, casa de marcat fiscală, certificatele Apple/Google Wallet, furnizorul de email, furnizorul AI, eventual SMS, stocarea off-site a backup-ului (criptat).
6. **Limbă:** cod, identificatori și commit-uri în **engleză**; documentația și toate textele pentru clienți, personal și proprietar în **română** (cu traduceri; RO + EN complete la lansare).
7. **La finalul fiecărei etape, explică proprietarului în română simplă:** ce s-a făcut, cum verifică el (click cu click), ce urmează, ce decizii are de luat.
8. **Organizare pe foldere**, fiecare componentă cu README, `.env.example`, Dockerfile (unde e cazul) și teste proprii.

## Invariante care nu se încalcă niciodată
1. **Scorurile se introduc și se confirmă EXCLUSIV la Chioșcul de Ligă înregistrat**, verificat pe server (dispozitiv autentificat + rețea + rol). Orice altă sursă: refuz + jurnal (§4.1, §12.1, ADR-0012).
2. Clienții de la distanță (website, telefon) **doar vizualizează** liga.
3. **Date publice despre un jucător: doar nume, prenume, nivel (rang + nivel numeric), LP și locul în clasament** (R-012). Nimic altceva pe site, ecrane, chioșcuri.
4. **AI-ul** nu introduce, nu modifică și nu validează scoruri; nu atinge rating, LP, ranguri, clasamente, bani, reduceri, vouchere, acorduri GDPR; nu dezvăluie date ale altor utilizatori. Impus tehnic, cu dublă barieră (ADR-0019).
5. **Bani:** numere întregi în bani (RON × 100), niciodată `float`; registru cu dublă înregistrare, imutabil; corecții doar prin înregistrări inverse, cu motiv și autor; idempotență pe orice plată (ADR-0009). Liga și banii: 100% acoperire pe ramuri.
6. **Timp:** fus orar unic `Europe/Bucharest`, UTC în baza de date, trecerile de oră testate (ADR-0010; deschiderea cade în luna trecerii la ora de vară, 28.03.2027).
7. **Fără suprapuneri de rezervări**, garantat de o constrângere PostgreSQL (R-043, ADR-0004).
8. **Liga e 18+**; fără acord GDPR semnat la chioșc nu se intră în ligă (R-006, R-010, R-011).
9. **Rotunjirea LP:** la cel mai apropiat întreg, .5 departe de zero. **Nu folosi `round()` din Python** (rotunjește .5 spre par).
10. **Secrete doar în `.env` pe server**, niciodată în git sau în chat.
11. **Textele legale** le redactăm noi (Q41, 26.09.2026) și poartă mențiunea „Redactat fără revizuire juridică. Recomandăm verificarea de către un avocat/DPO.”; proprietarul le aprobă. Fiscalul se confirmă cu contabilul clubului.
12. **Conținutul demo** e marcat clar; nu inventa prețuri, cifre sau recenzii prezentate ca reale.
13. **Nu copia site-ul Clubului Tenis Elite** (texte, structură exactă, culori verde/lime, imagini, componente): doar ideea de flux (§9.1).
14. La lansare: **fără WhatsApp**, **parkour ascuns** (feature flag), **fără credite pentru padel** (ora se plătește și se împarte între jucători).

## Arhitectura pe scurt
| Componentă | Folder | Tehnologie | ADR |
|---|---|---|---|
| Backend central (API, WebSockets, sarcini, admin tehnic) | `apps/backend` | Python ≥ 3.12, Django 5.2 LTS, Django Ninja, PostgreSQL 17, Redis, Channels, Celery | 0003–0006, 0009–0012 |
| Motorul ligii | `packages/league-engine` | Python pur, Weng-Lin (Thurstone–Mosteller) propriu | 0008 |
| Website + cont (PWA) | `apps/web` | Next.js (App Router), TypeScript strict | 0007 |
| Admin, chioșcuri, ecrane, afișaj cafenea | `apps/admin`, `apps/kiosk-league`, `apps/kiosk-payments`, `apps/court-screens`, `apps/cafe-display` | React + Vite, TypeScript strict | 0007, 0014 |
| Hardware Bridge | `services/hardware-bridge` | Python asyncio, WebSocket pe localhost, Ed25519, SQLite doar-adăugare | 0013 |
| Partajate | `packages/design-tokens`, `packages/ui`, `packages/api-client`, `packages/i18n` | Style Dictionary, React, openapi-typescript + openapi-fetch, ICU MessageFormat | 0007, 0018, 0020 |
| Infrastructură | `deploy/` | Docker Compose, Caddy, pgBackRest, Uptime Kuma, GlitchTip, Umami | 0015–0017 |
| Calitate | `scripts/`, `tests/` | ruff, mypy, pytest, hypothesis, ESLint, Prettier, tsc, Vitest, Playwright, k6, axe | 0021 |

Monorepo: workspace pnpm (TypeScript) + workspace uv (Python) (ADR-0002). Feature flags și configurare versionată: ADR-0022. Diagrame: [docs/04-arhitectura/02-diagrame.md](docs/04-arhitectura/02-diagrame.md).

## Convenții
- Testele menționează ID-ul regulii verificate (`R-041`, `LG-xxx`) în nume sau docstring.
- API-ul întoarce coduri de eroare stabile (de exemplu `booking.slot_taken`) + parametri; textul se traduce în interfață.
- Commit-uri în engleză, stil Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`).
- Fiecare etapă aprobată primește un tag git (`etapa-0`, `etapa-1a` …) (Q42).
- Branch-ul de lucru și repository-ul sunt notate în `PROGRES.md`.

## Comenzi
- `scripts/test-all` — TOATE verificările (ruff, mypy strict, migrații, pytest cu acoperire ≥ 95%, OpenAPI și client la zi, tsc, teste JS, traduceri RO/EN). Trebuie să fie verde înainte de orice livrare.
- `scripts/setup` — dependențe, migrații, date inițiale + demo. `scripts/dev` — backend pe `http://localhost:8000` (`/api/v1/docs`, `/django-admin/`).
- `scripts/generate-api-client` — după ORICE schimbare de API (altfel `test-all` pică).
- Primul admin: `JUNGLE_ADMIN_PASSWORD=... uv run python apps/backend/manage.py bootstrap_admin --email ... --first-name ... --last-name ...`
- PostgreSQL local: `DATABASE_URL` (implicit `postgres://jungle:jungle@localhost:5432/jungle`); în mediul cloud: `pg_ctlcluster 16 main start`.

### Convenții de cod în backend (`apps/backend/jungle/`)
- O aplicație Django pe domeniu (`accounts`, `locations`, `audit`, `configuration`, `legal`, `devices`, `notifications`, `core`); logica stă în `services`, endpoint-urile (`api.py`) sunt subțiri.
- Orice acțiune de personal: `authorize(request, Action.X, location_id)` în serviciu; orice modificare importantă: `audit.record(...)`.
- Erori: `DomainError(ErrorCode.X, status, params)`; codul nou se adaugă în `core/errors.py` ȘI în `packages/i18n/messages/{ro,en}.json` (testul verifică).
- Timp: doar `jungle.core.clock` (niciodată `datetime.now()`); teste de timp cu `time_machine`.
- Emailuri trimise cu `transaction.on_commit`; în teste: `django_capture_on_commit_callbacks(execute=True)`.
- Valori configurabile noi: în `configuration/registry.py`, cu marcaj (`TO_CONFIRM` = DE_CONFIRMAT).

## La finalul fiecărei etape
Parcurge [CHECKLIST_LIVRARE.md](docs/00-management/CHECKLIST_LIVRARE.md) și [DEFINITION_OF_DONE.md](docs/00-management/DEFINITION_OF_DONE.md), apoi actualizează: `PROGRES.md`, `CHANGELOG.md`, `INTREBARI_DESCHISE.md`, README-urile atinse și acest fișier.
