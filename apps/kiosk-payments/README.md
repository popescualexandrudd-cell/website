# Chioșcul de Plăți (aparatul 2)

> **Stare:** neînceput (schelet creat în Etapa 0, 26.09.2026). **Se construiește în Etapa:** 8.

## Ce face

Check-in, plata rezervărilor (integral sau „Împarte ora”), datorii, abonamente (configuratorul în 3 pași), cafenea, vouchere și sold, bon fiscal. La lansare: **doar numerar, cu rest** (§8.3). Mod personal pentru alimentare, golire, reconciliere și raport Z.

## Specificații

- [8.3 Chioșcul de Plăți (aparat 2) — numerar cu rest la lansare](../../docs/04-arhitectura/aplicatii/03-chiosc-plati.md)
- [5.7 Plăți](../../docs/02-reguli-business/07-plati.md)

## Decizii tehnice

[ADR-0007](../../docs/04-arhitectura/adr/0007-frontend-nextjs-vite.md), [ADR-0009](../../docs/04-arhitectura/adr/0009-bani-registru-contabil.md), [ADR-0012](../../docs/04-arhitectura/adr/0012-autentificare-dispozitive.md), [ADR-0013](../../docs/04-arhitectura/adr/0013-hardware-bridge.md), [ADR-0014](../../docs/04-arhitectura/adr/0014-chioscuri-ecrane-kiosk-os.md)

## Unde rulează

Subdomeniu: `kiosk-plati.<domeniu>` (doar dispozitive înregistrate) (§4.6). Poate fi rulată și publicată separat.

## Variabile de mediu planificate

Valorile reale stau doar în `.env` pe server, niciodată în git.

- URL-ul API-ului
- portul local al Hardware Bridge

## Rulare, testare, deploy

Etapa 0 nu conține cod. `.env.example`, `Dockerfile` (unde e cazul) și testele se adaugă în etapa care construiește componenta, împreună cu instrucțiunile de rulare, testare și deploy.
