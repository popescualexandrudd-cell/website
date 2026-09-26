# 4. ARHITECTURA SISTEMULUI

> **Sursa:** `MEGA_PROMPT.md` §4 (versiunea 1.0, 26.09.2026). Text preluat integral în Etapa 0, fără modificări de conținut.
> De acum, acest fișier este referința de lucru pentru această secțiune. Orice modificare ulterioară se notează aici, cu data și sursa („confirmat de proprietar la data X”); `MEGA_PROMPT.md` rămâne neschimbat, ca referință istorică.

## 4.1 Principiul de bază
- **Website-ul și nucleul central (backend) sunt baza funcțională a întregului sistem și singura sursă de adevăr.** Toate celelalte aplicații sunt „ferestre” spre aceleași date, conectate live: chioșcul de ligă, chioșcul de plăți, ecranele de la terenuri, ecranele din lobby/cafenea/mezanin, afișajul cafenelei și panoul de admin.
- Nicio aplicație client nu ține date „adevărate” local. Excepție controlată: jurnalul local de numerar al chioșcului de plăți (secțiunea 8.4), sincronizat obligatoriu cu serverul.
- **Clienții de la distanță (website, telefon) pot doar să vizualizeze liga.** Nu pot introduce și nu pot modifica niciun scor. Pot, în schimb, să-și creeze cont, să rezerve, să cumpere pachete (când plățile online sunt active), să-și vadă progresul.
- **Scorurile se introduc exclusiv la chioșcul de ligă din club.** Regula se aplică pe server, nu doar în interfață (secțiunea 12.1).
- **AI-ul este conectat la toate sistemele, dar cu permisiuni limitate** (secțiunea 10): poate citi date autorizate, propune, recomanda, redacta și face rezervări în numele unui client autentificat. Nu atinge niciodată scoruri, rating, clasamente, bani sau date GDPR.
- Totul este conectat live: rezervările, datele ligii, jucătorii care urmează, orele. Orice validare de scor se reflectă instant pe site, pe ecrane și pe chioșcuri.

## 4.2 Componente
1. **Backend central (API + logică de business)**: conturi, rezervări, prețuri, plăți și registru contabil intern, abonamente/pachete, antrenori, pilates, prezențe, ligă, turnee, evenimente, cafenea, recompense, recomandări, notificări, AI, conținut (CMS), traduceri, dispozitive, audit, feature flags.
2. **Motorul ligii** (pachet Python pur, fără Django, testabil izolat): rating MMR, LP, ranguri, sezoane, reguli anti-abuz, simulări.
3. **Website public + zona de cont (PWA)**: site de tip „simulator” (secțiunea 9), multilingv, cu liga live, rezervări și configurator de pachete.
4. **Panou de admin**: control total asupra oricărei date și setări (secțiunea 8.6).
5. **Chioșc Ligă** (aparat fizic 1): scanare carduri, înscriere în ligă cu formular GDPR, introducere și confirmare scor, clasamente, provocări, check-in.
6. **Chioșc Plăți** (aparat fizic 2): check-in, plată rezervări (integral sau împărțit), taxe, abonamente, produse de cafenea, numerar cu rest, bon fiscal.
7. **Ecrane la fiecare teren** + **ecrane de lobby / cafenea / mezanin** (afișaj live).
8. **Afișajul cafenelei** (listă de comenzi venite de la chioșcul de plăți).
9. **Hardware Bridge**: serviciu local pe fiecare aparat (scanner QR, acceptor și reciclator de numerar cu rest, imprimantă fiscală, imprimantă de bonuri), cu drivere interschimbabile și simulatoare pentru dezvoltare.
10. **Serviciul de carduri și Wallet**: legitimații cu cod QR, Apple Wallet și Google Wallet, fișier de tipar pentru cardul fizic.
11. **Stratul AI**: asistent, matchmaking, notificări inteligente, Meciul zilei, rapoarte, copilot pentru admin, detecție de anomalii.
12. **Notificări**: email + telefon (notificări push din aplicația web; SMS opțional, vezi Q17). **Fără WhatsApp la lansare.**

## 4.3 Stack tehnic (decizie inițială, documentată ca ADR în Etapa 0)
- **Backend**: Python 3.12+, **Django 5** + Django REST Framework (sau Django Ninja; alege și justifică în ADR), **PostgreSQL 16+**, **Redis** (cache, pub/sub), **Django Channels / WebSockets** pentru date live, **Celery + Celery Beat** pentru sarcini programate (notificări, expirări, decay, AI, rapoarte). Schemă OpenAPI generată automat.
- **Frontend**: TypeScript. **Next.js** (App Router, SSR/SSG, esențial pentru SEO) pentru website și zona de cont; **React + Vite** pentru admin, chioșcuri, ecrane și afișajul cafenelei. Client API generat din OpenAPI. Componente UI și design tokens partajate.
- **Hardware Bridge**: Python (asyncio), rulează local pe aparat, expune un WebSocket pe `localhost` cu mesaje semnate către aplicația de chioșc din browser. Jurnal local SQLite, append-only, pentru evenimentele de numerar.
- **Chioșcuri și ecrane**: browser în mod kiosk pe tot ecranul (implicit Linux + Chromium; documentează și varianta Windows), cu pornire automată, watchdog și ecran de „serviciu indisponibil” când lipsește conexiunea.
- **Infrastructură**: Docker + Docker Compose pe serverul propriu, reverse proxy cu TLS automat (Caddy sau Nginx + Let's Encrypt), backup automat criptat, monitorizare auto-găzduită (de exemplu Uptime Kuma + un colector de erori auto-găzduit), analytics auto-găzduit fără cookie-uri (de exemplu Umami sau Plausible CE).
- **Calitate**: `ruff` + `mypy` (strict pe motorul ligii și pe bani), `pytest` + `hypothesis`, ESLint + Prettier + `tsc --strict`, Vitest, **Playwright** (end-to-end), k6 sau Locust (încărcare), `axe` (accesibilitate), pre-commit hooks, CI local rulabil cu o singură comandă.

## 4.4 Structura de foldere (monorepo; fiecare aplicație poate fi rulată și pusă pe domeniul ei separat)
```
jungle-padel/
├── CLAUDE.md                      # memoria operațională a proiectului (menținută la zi)
├── MEGA_PROMPT.md                 # acest document (nu se modifică; modificările merg în docs/)
├── README.md                      # prezentare + pornire rapidă pentru proprietar
├── docs/
│   ├── 00-management/             # PROGRES.md, INTREBARI_DESCHISE.md, CALENDAR.md, CHANGELOG.md
│   ├── 01-viziune-si-business/
│   ├── 02-reguli-business/        # reguli cu ID-uri R-xxx (secțiunea 5)
│   ├── 03-liga/                   # specificația completă a ligii + rapoarte de simulare
│   ├── 04-arhitectura/            # diagrame, ADR-uri (decizii tehnice numerotate)
│   ├── 05-api/                    # OpenAPI + ghid
│   ├── 06-date/                   # model de date, dicționar de date, retenție
│   ├── 07-securitate-gdpr-legal/  # politici, formular GDPR, registru de prelucrări, DPIA
│   ├── 08-deploy-si-mentenanta/   # runbook-uri, backup/restore, incidente, actualizări
│   ├── 09-hardware/               # chioșcuri, scannere, numerar, fiscal, ecrane
│   ├── 10-seo/
│   ├── 11-marketing/
│   ├── 12-branding/
│   ├── 13-vanzari/
│   ├── 14-regulament-public/      # regulamentul clubului, afișat pe site și la recepție
│   └── 15-instruire-personal/     # ghiduri pentru recepție, antrenori, manager
├── apps/
│   ├── backend/                   # Django (API, admin tehnic de rezervă, sarcini, WebSockets)
│   ├── web/                       # Next.js: website public „simulator” + cont client (PWA)
│   ├── admin/                     # panoul de admin complet (React)
│   ├── kiosk-league/              # chioșcul de ligă
│   ├── kiosk-payments/            # chioșcul de plăți
│   ├── court-screens/             # ecrane teren + lobby/cafenea/mezanin
│   └── cafe-display/              # afișaj comenzi cafenea
├── packages/
│   ├── league-engine/             # Python pur: rating, LP, ranguri, sezoane, simulări
│   ├── design-tokens/             # culori, tipografie, spațiere (interschimbabile)
│   ├── ui/                        # componente React partajate
│   ├── api-client/                # client TypeScript generat din OpenAPI
│   └── i18n/                      # cataloage de traduceri (ro, en, es, it, zh, ...)
├── services/
│   └── hardware-bridge/           # drivere + simulatoare: scanner, numerar, fiscal, imprimantă
├── deploy/
│   ├── compose/                   # docker-compose pe medii (dev, staging, prod)
│   ├── proxy/                     # Caddy/Nginx, subdomenii, TLS
│   ├── backup/                    # scripturi backup/restore + test de restaurare
│   ├── monitoring/
│   └── kiosk-os/                  # scripturi de configurare a aparatelor (mod kiosk, pornire automată)
├── scripts/                       # setup local, seed date demo, rulare toate testele, simulare ligă
└── tests/
    ├── e2e/                       # Playwright: fluxuri complete între aplicații
    ├── load/
    └── security/
```
Fiecare folder din `apps/`, `packages/` și `services/` conține: `README.md` (ce face, cum rulezi local, cum testezi, cum faci deploy, variabile de mediu), `.env.example`, `Dockerfile` (unde e cazul), teste proprii.

## 4.5 Documentația derivată din acest prompt
În Etapa 0, împarte conținutul acestui document în `docs/` (fiecare secțiune în folderul potrivit), păstrând ID-urile regulilor. `MEGA_PROMPT.md` rămâne neschimbat ca referință istorică. Orice decizie nouă se scrie ca ADR sau ca regulă nouă, cu dată și cu sursa („confirmat de proprietar la data X”).

## 4.6 Domenii și subdomenii (numele domeniului: `DE_CONFIRMAT`, notat `<domeniu>`)
- `www.<domeniu>`: website + cont client
- `api.<domeniu>`: API
- `admin.<domeniu>`: panou de admin (acces restricționat, 2FA)
- `kiosk-liga.<domeniu>`, `kiosk-plati.<domeniu>`, `ecrane.<domeniu>`, `cafe.<domeniu>`: accesibile doar pentru dispozitive înregistrate (secțiunea 12.1)
- `status.<domeniu>`: pagina de stare (opțional)
