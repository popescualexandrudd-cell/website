# Jungle Padel — sistemul digital al clubului

Sistemul propriu al clubului **Jungle Padel** (Șoseaua Biruinței, lângă Selgros Pantelimon): website, rezervări, abonamente, plăți la chioșc, liga de padel „Jungle”, ecrane live la terenuri și în lobby, cafenea, pilates Reformer, evenimente și asistent AI. Totul într-un singur sistem, al clubului, fără platforme de rezervări externe.

**Deschiderea clubului: martie 2027.**

## Unde suntem acum
**Etapa 0 (organizarea proiectului) este gata și așteaptă aprobarea ta.** Încă nu există cod de aplicație: el începe după aprobare, cu Etapa 1A (fundația sistemului) și Etapa 1B (pagina de pre-lansare cu listă de așteptare).

## Ce să citești, în ordine
1. [Progresul proiectului](docs/00-management/PROGRES.md) — unde suntem și cum verifici fiecare etapă.
2. [Întrebările deschise](docs/00-management/INTREBARI_DESCHISE.md) — deciziile pe care le ai de luat (cele `URGENTĂ` primele).
3. [Planul detaliat](docs/00-management/PLAN_DETALIAT.md) și [calendarul](docs/00-management/CALENDAR.md).
4. [Documentația completă](docs/README.md) — regulile clubului, liga, arhitectura, securitatea, marketingul.

## Cum e organizat
| Folder | Ce conține |
|---|---|
| [`docs/`](docs/) | Toată documentația, pe teme (în română) |
| [`apps/`](apps/) | Aplicațiile: backend, website, admin, chioșcul de ligă, chioșcul de plăți, ecranele, afișajul cafenelei |
| [`packages/`](packages/) | Piese folosite de mai multe aplicații: motorul ligii, identitatea vizuală, componente, traduceri |
| [`services/`](services/) | Serviciul local care leagă chioșcurile de aparate (scanner, numerar, casă de marcat) |
| [`deploy/`](deploy/) | Instalarea pe serverul propriu, backup, monitorizare, configurarea chioșcurilor |
| [`scripts/`](scripts/) | Comenzi utile (pornire, date demo, toate testele) |
| [`tests/`](tests/) | Teste care traversează mai multe aplicații |
| [`MEGA_PROMPT.md`](MEGA_PROMPT.md) | Documentul original al proiectului (nu se modifică) |
| [`CLAUDE.md`](CLAUDE.md) | Memoria de lucru pentru sesiunile de dezvoltare |

## Pornire rapidă: tot sistemul pe laptop
Pentru a vedea și încerca totul, cu date demo, pe Windows, macOS sau Linux.

**O singură dată:**
1. Instalați [Docker Desktop](https://www.docker.com/products/docker-desktop/) și porniți-l. Are nevoie de cel puțin 8 GB RAM liberi.
2. Instalați [Git](https://git-scm.com/downloads).
3. Într-un terminal (Windows: „PowerShell”), luați codul:
   ```
   git clone -b main https://github.com/popescualexandrudd-cell/website.git
   cd website
   ```
   Dacă depozitul e privat, Git vă cere să intrați cu contul GitHub care are acces (o fereastră de autentificare se deschide singură).

**Pornirea** (prima dată durează 10–20 de minute, cât se construiesc aplicațiile; apoi un minut):
```
docker compose -f deploy/compose/dev/compose.yaml up --build
```
Când în terminal apare `Listening on TCP address 0.0.0.0:8000`, deschideți:

| Ce | Adresa | Cum intrați |
|---|---|---|
| Site-ul complet | http://localhost:3000 | — |
| Panoul de admin | http://localhost:5179 | `manager@demo.invalid` sau `receptie@demo.invalid`, parola `Jungle-Demo-2026`; la prima intrare, scanați codul QR cu o aplicație de autentificare (Google Authenticator, Microsoft Authenticator) |
| API-ul (pentru programatori) | http://localhost:8000/api/v1/docs | — |

**Oprirea:** `Ctrl+C` în terminal. Datele demo rămân pentru data viitoare. Pentru a o lua de la zero: `docker compose -f deploy/compose/dev/compose.yaml down -v`.

**Bine de știut:**
- Totul e demo: clienții, rezervările și prețurile (marcate DE_STABILIT) sunt de test.
- Emailurile nu pleacă; apar în terminal.
- Chioșcurile, ecranele terenurilor și afișajul cafenelei au nevoie de Hardware Bridge și de aparatele lor. Le vedeți funcționând în testele cap-coadă (`scripts/test-e2e`) și pe server, după instalare.
- Dacă un port e ocupat (de exemplu 5432, de un PostgreSQL instalat pe laptop), opriți programul acela sau spuneți-ne.

**Pentru programatori** (fără Docker pentru aplicații):
- `scripts/setup` pregătește dependențele, baza de date și datele demo;
- `scripts/dev` pornește backend-ul;
- `pnpm --filter @jungle/web dev` și `pnpm --filter @jungle/admin dev` pornesc site-ul și panoul;
- toate verificările: `scripts/test-all`.

Detalii în [`CLAUDE.md`](CLAUDE.md) (secțiunea „Comenzi”). Instalarea pe serverul clubului: [`docs/08-deploy-si-mentenanta/06-instalarea-serverului.md`](docs/08-deploy-si-mentenanta/06-instalarea-serverului.md).
