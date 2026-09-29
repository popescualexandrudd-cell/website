# Panoul de admin (React + Vite)

> **Stare:** în construcție în Etapa 10 (început pe 29.09.2026). Gata: autentificarea cu 2FA, meniul după permisiuni și locație, tabloul de bord live, utilizatorii (R-004: detalii, roluri, activare, carduri, „fără nume pe ecrane”, ștergere GDPR), validarea nivelurilor (R-003), calendarul rezervărilor, resursele, prețurile, abonamentele, firmele, clasele de pilates și prezențele, liga, plățile și registrul, numerarul și rapoartele Z, cafeneaua. Urmează evenimentele, dispozitivele, setările, rapoartele, jurnalul de audit și starea sistemului, în aceeași etapă.

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
- **Calendarul rezervărilor** (o zi, o coloană pe teren / aparat Reformer / sala de evenimente, rânduri de 30 de minute în programul zilei, `GET /api/v1/staff/panel/hours`):
  - o celulă liberă deschide o rezervare nouă pentru un client (căutat după nume, email sau telefon);
  - o rezervare se mută trăgând-o pe altă celulă sau din detaliile ei (și cu tastatura), cu motiv (`POST /api/v1/staff/bookings/{id}/move`: aceleași reguli ca online — grila, fără suprapuneri, antrenorul liber — iar locul eliberat merge la primul din lista de așteptare);
  - anularea cere motiv; „fără taxă de anulare” e o excepție trecută în jurnal.
  - Ora e mereu ora clubului (Europe/Bucharest), inclusiv în ziua trecerii la ora de vară (`src/clock.ts`).
- **Resurse** (toate, și cele scoase din uz: `GET /api/v1/staff/panel/resources`), **prețuri** (tarife pe oră și abonamente, cu marcajul DE_STABILIT până le hotărăște proprietarul), **abonamente** (vânzare la recepție, „La cerere”, plătite de firmă, înghețare R-086), **firme** (angajați, raportul lunii), **clase** (săptămâna, clasă nouă, lista participanților și prezența), **prezențe** (notificări, blocări după neprezentări R-073, prezență trecută manual).
- **Liga**: meciurile de decis (disputate, expirate, în așteptarea plății: aplic / redeschid / anulez, cu motiv — panoul nu are niciun câmp de scor, invariantul 1), sezoanele (toate, și cele planificate: `GET /api/v1/staff/panel/league/seasons`), turneele (tragere la sorți, meci pus pe teren după codul rezervării, meci terminat — Q28, anulare cu motiv) și Meciul zilei.
- **Plăți și registru** (`GET /api/v1/staff/panel/transactions`): tranzacțiile zilei cu înregistrările lor; o greșeală se corectează doar printr-o înregistrare inversă, cu motiv. Voucherele (`GET /api/v1/staff/panel/vouchers`): emitere și anulare cu motiv. O plată în numerar trecută de personal (excepție, Q9/Q10) poartă o cheie de idempotență per încercare (R-067).
- **Numerar și fiscal** (`GET /api/v1/staff/panel/cash`): ce e în fiecare Chioșc de Plăți și în seif, mișcările zilei, operațiunile personalului (alimentare, golire, numărare cu diferența față de registru, închiderea de zi cu raportul Z); PIN-ul propriu pentru modul personal al chioșcului (Q54).
- **Cafenea**: coada de comenzi (nouă → în preparare → gata → ridicată, anulare cu motiv), comanda la bar ca excepție și meniul complet (`GET /api/v1/staff/panel/cafe/menu`: și produsele scoase din meniu), cu prețurile DE_STABILIT până le hotărăște proprietarul.
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
