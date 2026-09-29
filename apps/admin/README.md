# Panoul de admin (React + Vite)

> **Stare:** în construcție în Etapa 10 (început pe 29.09.2026). Gata: autentificarea cu 2FA, meniul după permisiuni și locație, tabloul de bord live, utilizatorii (R-004: detalii, roluri, activare, carduri, „fără nume pe ecrane”, ștergere GDPR), validarea nivelurilor (R-003). Urmează celelalte module din §8.6, în aceeași etapă.

## Ce face (§8.6)

Control total asupra datelor și setărilor clubului, pentru personal. Modulele planificate în Etapa 10:
- tablou de bord live, utilizatori, calendarul rezervărilor, resurse și prețuri;
- abonamente și corporate, antrenori și pilates, prezențe;
- liga, plăți și registru, numerar și fiscal, cafenea, evenimente;
- dispozitive, feature flags și setări, rapoarte, jurnalul de audit, roluri, starea sistemului.

Notificările, comunitatea, AI-ul, conținutul site-ului și traducerile vin cu etapele lor (11–12).

- **Autentificare:** email și parolă, apoi codul din aplicația de autentificare (2FA obligatorie, ADR-0011). La prima intrare, personalul își configurează 2FA și primește codurile de rezervă, o singură dată.
- **Permisiuni:** meniul arată doar modulele pe care rolul le permite la locația aleasă (`GET /api/v1/staff/panel/permissions`). Serverul verifică din nou orice acțiune și o trece în jurnal.
- **Tabloul de bord** (`GET /api/v1/staff/panel/dashboard`), reîncărcat la 30 de secunde:
  - ocuparea terenurilor azi, rezervările, numerarul încasat și veniturile zilei;
  - alertele: notificări necitite, decizii DE_CONFIRMAT, aparate dezactivate;
  - terenurile acum.
- Adminul tehnic Django (`/django-admin/`) rămâne „modul de urgență”, doar pentru rolul Admin.

## Rulare, testare

```bash
pnpm --filter @jungle/admin dev     # http://localhost:5179 (trimite /api la backend: VITE_API_ORIGIN, implicit http://127.0.0.1:8000)
pnpm --filter @jungle/admin test    # teste unitare (Vitest)
pnpm --filter @jungle/admin build   # build de producție
```

Primul cont de admin: `bootstrap_admin` (vezi `CLAUDE.md`).

## Deploy

Pagină statică pe `admin.<domeniu>` (§4.6). Proxy-ul (Caddy) trimite `/api` la backend, pe aceeași origine: cookie-ul de sesiune și verificarea CSRF funcționează fără reguli între domenii.

## Decizii tehnice

[ADR-0007](../../docs/04-arhitectura/adr/0007-frontend-nextjs-vite.md), [ADR-0011](../../docs/04-arhitectura/adr/0011-autentificare-utilizatori-personal.md), [ADR-0022](../../docs/04-arhitectura/adr/0022-feature-flags-configurare-versionata.md). Specificația: [§8.6](../../docs/04-arhitectura/aplicatii/06-panou-admin.md).
