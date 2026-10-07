# Etapa 15 — Beta, încărcare, instruire: raport

> 07.10.2026. PLAN_DETALIAT, Etapa 15: „test de încărcare, beta, instruirea personalului, lista de lansare”. Proprietarul a cerut finalizarea tuturor etapelor fără oprire, cu întrebările rezolvate de noi („orice întrebare mai ai alege răspunsul cel mai relevant”, 06.10.2026).

## Ce s-a făcut

### 1. Testul de încărcare (`tests/load/club.js`, k6)
**Ce simulează:** seara cea mai aglomerată (§13.3):
- 500 de vizitatori pe site; fiecare deschide o pagină a site-ului complet, cu API-ul cerut de ea (clasamentul, terenurile libere, clasele, calendarul), apoi citește 10–20 de secunde;
- 12 ecrane și chioșcuri care își reîmprospătează datele la 10 secunde.

**Unde rulează:** pe stiva de producție pornită ca pe server (`deploy/scripts/smoke-stack`), cu site-ul complet pornit și un sezon de ligă deschis:
- în CI, la fiecare push: 50 de vizitatori, 30 de secunde;
- pentru raport: 500 de vizitatori, 2 minute.

**Rezultatul cu 500 de vizitatori** (07.10.2026, un calculator cu 4 nuclee pe care rulau și k6, baza de date, proxy-ul și site-ul):

| Măsura | Rezultat | Pragul |
|---|---|---|
| Cereri eșuate | 0 din 17 878 (0%) | sub 1% |
| API, 95% din răspunsuri sub | 103 ms | 800 ms |
| Pagini, 95% sub | 185 ms | 1,5 s |

**Capacitatea măsurată** a backend-ului singur, pe același calculator: circa 190 de cereri API pe secundă. Fiecare cerere publică costă 5–30 ms. Serverul clubului (Q40), cu procesorul doar pentru el, duce mai mult. Înainte de lansare, testul se rulează pe serverul real (lista de lansare).

### 2. Ce a găsit testul și s-a reparat
1. **Site-ul complet nu pornea în stiva de producție.**
   - **Cauza:** serverul site-ului citea API-ul prin adresa publică (`https://api.<domeniu>`). Fără DNS în containere, sau la un club cu un router fără „hairpin NAT” (frecvent), cererea nu ajungea. Site-ul rămânea pe pagina de pre-lansare chiar și cu `full_site` pornit. Exact asta s-ar fi întâmplat în ziua lansării.
   - **Reparat:** serverul site-ului citește acum API-ul prin proxy, în interiorul stivei: ascultătorul intern `:8080` al Caddy, nepublicat, cu variabila `API_INTERNAL_URL`. Browserul folosește în continuare adresa publică. Testat în `deploy/proxy/test-proxy`: merge la backend, ca prin HTTPS, fără headerul falsificat.
2. **Backend-ul avea 3 procese fixe.** Acum: 2 × nucleele + 1, fiecare cu 4 fire (`apps/backend/gunicorn.conf.py`). Se pot schimba din `/etc/jungle/prod.env` cu `GUNICORN_WORKERS` și `GUNICORN_THREADS`. (`WEB_CONCURRENCY` s-a evitat: gunicorn îl citește singur și pică dacă e gol.)
3. **`rollback` anunța succesul fără să verifice.** Acum așteaptă backend-ul ca `update`, cel mult 3 minute, și spune clar dacă nu răspunde.

### 3. Dependențele
- **Două vulnerabilități „high” în producție**, venite prin Next.js: `sharp` < 0.35.5 și `source-map-js` < 1.2.2. Reparate cu `overrides` în `pnpm-workspace.yaml`.
- **Rezultatul:** `pnpm audit --prod` și `pip-audit` (dependențele Python de producție) fără nicio vulnerabilitate cunoscută. Ambele rulează acum în `scripts/test-deploy`, deci în CI la fiecare push.
- **Rămâne una**, doar în uneltele de verificare a codului (`braces`, prin `eslint-config-next`). Nu are încă reparație publicată și nu ajunge pe server.

### 4. Golirea bazei de date înainte de lansare
`deploy/scripts/reset-before-launch`: după beta, conturile, rezervările și plățile de test nu se pot șterge pe bucăți, pentru că registrul banilor nu se editează (ADR-0009). De aceea scriptul:
- șterge baza de date și backup-urile ei de pe server;
- cere numele domeniului ca confirmare;
- pornește versiunea curentă pe o bază goală.

Testat cap-coadă în `smoke-stack`:
- refuză fără domeniu și nu șterge nimic;
- cu domeniul, baza pornește goală, cu datele inițiale;
- un backup nou reușește după.

### 5. Instruirea personalului (`docs/15-instruire-personal/`, Q37)
- **Ghidurile pe rol:** recepția, antrenorul, instructorul de Pilates, managerul.
- **Capturile de ecran** (`capturi/`) le face automat testul panoului, pe date demo: `E2E_SCREENSHOTS=$PWD/docs/15-instruire-personal/capturi E2E_ONLY=admin scripts/test-e2e`. Când panoul se schimbă, se refac cu aceeași comandă.
- **Denumirile:** fiecare buton și meniu numit în ghiduri a fost verificat în textele panoului.

### 6. Beta și lansarea
Q74, varianta implicită:
- **Planul beta:** `01-plan-beta.md`: februarie 2027, 20–40 de invitați, scenariile, criteriile de ieșire.
- **Lista de lansare:** `02-lista-de-lansare.md`.
- **Ziua lansării:** `../etapa-16/PLAN-LANSARE.md`.

### 7. Verificări adunate
- **Indexurile testelor:** `tests/security/README.md` și `tests/e2e/README.md` arată unde stă fiecare verificare.
- **Stiva de producție:** `scripts/test-deploy` verifică acum că toate cele 12 servicii își rotesc jurnalele (cel mult 5 × 10 MB) și că doar proxy-ul e accesibil din afară.

## Cum verificați
1. GitHub → Actions → ultimul `ci` → jobul **deploy**: secțiunile „The dependencies”, „The proxy” (inclusiv „the internal listener”), „the load test” și „the reset before the opening”, toate cu `ok`.
2. Citiți ghidul recepției (`docs/15-instruire-personal/01-receptie.md`) și comparați cu panoul demo: aceleași butoane.
3. Citiți planul beta și lista de lansare; spuneți-ne ce schimbați (data, invitații).

## Decizii pentru proprietar
- **Q74:** data inaugurării și invitații din beta (varianta implicită e trecută în plan).
- **Lista de lansare:** prețurile finale (Q21), textele legale (Q41), datele firmei (Q26), domeniul (Q39).
