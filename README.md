# Site pentru un antrenor de tenis

Site de prezentare cu rezervări online și panou de administrare pentru Alexandru Daniel Popescu,
antrenor de tenis la Elite Tennis Club. Designul urmează academiile de tenis: culorile zgurii,
titluri în majuscule condensate și, pe pagina principală, un meci 3D în timp real (fizică reală a
mingii) plus un laborator tehnic 3D cu fazele loviturilor. Totul, de la texte la prețuri și
imagini, se editează din panoul de administrare.

- **Pentru antrenor**: cum se folosește panoul → [`GHID-ADMIN.md`](GHID-ADMIN.md); ce mai trebuie
  completat → [`CONTENT-TODO.md`](CONTENT-TODO.md).
- **Pentru punerea online**: pas cu pas, fără cunoștințe tehnice → [`DEPLOY.md`](DEPLOY.md).
- **Designul și fotografiile**: paleta, tipografia, scena 3D și cum faci fotografia ta pe teren →
  [`docs/DIRECTIE-ARTISTICA.md`](docs/DIRECTIE-ARTISTICA.md).
- **De ce e făcut așa**: [`DECISIONS.md`](DECISIONS.md) (planul de design și deciziile tehnice);
  progresul pe faze: [`PROGRESS.md`](PROGRESS.md); licențe: [`CREDITS.md`](CREDITS.md).

## Ce conține

- **Site public** în română (fără prefix) și engleză (`/en`, cu adrese traduse): pagina principală
  cu scenă 3D (three.js, încărcată după afișarea paginii, cu afiș static fără WebGL sau la
  randare software și cadru fix la „reduced motion”), secțiunea personală cu rama pentru
  fotografie, laboratorul tehnic 3D, programe, facilități, despre, prețuri, rezervare, galerie,
  sfaturi, întrebări, contact, listă de așteptare, pagini legale.
- **Rezervări**: disponibilitate din reguli săptămânale minus excepții și rezervări, cu pauză între
  lecții, preaviz, orizont și ora de vară/iarnă; lecții individuale exclusive și grupe cu capacitate;
  rezervarea dublă e imposibilă (blocare în tranzacție + constrângere de excludere în PostgreSQL);
  emailuri cu `.ics`, anulare prin link, memento, invitație la recenzie.
- **Admin** mobile-first: rezervări, azi, disponibilitate, tot conținutul (RO/EN, Markdown,
  imagini, reordonare), media, mesaje, listă de așteptare, clienți (pachete, GDPR), newsletter,
  setări, conturi, jurnal.
- **Producție**: Docker Compose cu Caddy (HTTPS automat), PostgreSQL, worker, backup zilnic
  (14 zile, opțional off-site cu rclone), Umami opțional.

## Tehnologii

Next.js 16 (App Router, Server Components, Server Actions), React 19, TypeScript strict,
Tailwind CSS 4, PostgreSQL 16 + Prisma 7, next-intl, Zod, Nodemailer + React Email, sharp,
date-fns-tz, three.js, Vitest, Playwright + axe, Docker, Caddy.

## Pornire locală

Ai nevoie de Node.js 22 și Docker.

```bash
docker compose -f docker-compose.dev.yml up -d   # PostgreSQL + Mailpit
npm install
cp .env.example .env                              # valorile implicite merg local
npm run db:reset                                  # creează baza de date și o completează din config/antrenor.yml
npm run dev                                       # http://localhost:3000
npm run admin:create                              # contul tău pentru http://localhost:3000/admin
```

- Emailurile trimise local ajung în Mailpit: <http://localhost:8025>.
- Prima rulare a lui `npm run dev` generează pictogramele (câteva secunde).
- Datele inițiale vin din `config/antrenor.yml`. Seed-ul nu suprascrie nimic: `npm run db:seed`
  adaugă doar ce lipsește; `npm run db:reset` reconstruiește tot din fișier.

## Comenzi

| Comandă | Ce face |
| --- | --- |
| `npm run dev` | serverul de dezvoltare |
| `npm run build`, `npm start` | build de producție și pornirea lui |
| `npm run lint`, `npm run typecheck`, `npm run format` | verificări și formatare |
| `npm test` | teste unitare și de integrare (Vitest, pe o bază `<nume>_test` separată) |
| `npm run test:e2e` | teste end-to-end cu Playwright și axe (pornește singur serverul de producție pe portul 3100) |
| `npm run db:migrate` | o migrare nouă după ce modifici `prisma/schema.prisma` |
| `npm run db:seed`, `npm run db:reset` | date inițiale / reconstruirea bazei |
| `npm run images` | pictogramele (apple-icon, 512 px, ornamentul din emailuri) din `app/icon.svg` |
| `npm run admin:create` | cont de administrator (sau resetarea parolei) |
| `npm run worker` | sarcinile de fundal (emailuri, mementouri, retenție) în dezvoltare |
| `npm run build:tools` | worker-ul, seed-ul și admin-create ca fișiere JS pentru imaginea Docker |
| `node scripts/docs-screenshots.mjs` | capturile din `GHID-ADMIN.md` |

## Structura

```
app/            rutele: [locale]/ (site public), admin/, api/
components/     secțiunile paginii principale, scena 3D (court3d/), pagini, formulare, admin
lib/            baza de date, disponibilitate, rezervări, emailuri, autentificare, conținut, SEO
emails/         șabloanele emailurilor (React Email)
messages/       textele interfeței (ro.json, en.json)
prisma/         schema, migrările, seed-ul și conținutul inițial
config/         antrenor.yml, datele clientului
worker/         sarcinile programate
scripts/        setup-server, deploy, backup, restore, images, admin-create
docker/         entrypoint-ul aplicației, imaginea de backup, configurații opționale Caddy
tests/          unit/, integration/, e2e/
docs/           direcția artistică, capturile ghidului
```

## Calitate

- TypeScript strict, fără `any`; ESLint; Prettier.
- Teste: motorul de disponibilitate (inclusiv 29 martie și 25 octombrie), rezervări concurente,
  constrângerea din baza de date, anulări, job-uri, încărcarea imaginilor, GDPR, fizica mingii și
  animația loviturilor; end-to-end pentru rezervare, rezervare dublă simultană, confirmare din
  admin, anulare prin link, contact, login, pagina principală cu și fără WebGL.
- CI în GitHub Actions (`.github/workflows/ci.yml`): lint, tipuri, teste, build, e2e, audit,
  imaginea Docker, deploy opțional prin SSH.
