# Site pentru o academie de tenis

Site de prezentare cu rezervări online și panou de administrare, construit ca **șablon pentru
orice club sau academie de tenis**; datele de pornire sunt ale academiei de la Elite Tenis Club
(Pantelimon). Nivelul și structura urmează marile academii (Rafa Nadal Academy, IMG, Mouratoglou):
deschidere cinematică cu video real al clubului, programe, academie de juniori pe etape, echipa de
antrenori, galerie foto și video. Totul, de la culori și logo la texte, prețuri, fotografii și
video-uri, se editează din panoul de administrare.

- **Pentru un club nou**: cum adaptezi șablonul → [`SABLON.md`](SABLON.md).
- **Pentru club**: cum se folosește panoul → [`GHID-ADMIN.md`](GHID-ADMIN.md); ce mai trebuie
  completat, inclusiv fotografiile și video-urile → [`CONTENT-TODO.md`](CONTENT-TODO.md).
- **Pentru punerea online**: pas cu pas, fără cunoștințe tehnice → [`DEPLOY.md`](DEPLOY.md).
- **SEO, brand și marketing**: cercetarea cuvintelor cheie, poziționarea, Google Business,
  recenzii, conținut și campanii → [`docs/SEO-MARKETING.md`](docs/SEO-MARKETING.md).
- **Designul**: [`docs/DIRECTIE-ARTISTICA.md`](docs/DIRECTIE-ARTISTICA.md) și
  [`DECISIONS.md`](DECISIONS.md) (partea V: academia); progresul pe faze:
  [`PROGRESS.md`](PROGRESS.md); licențe: [`CREDITS.md`](CREDITS.md).

## Ce conține

- **Site public** în română (fără prefix) și engleză (`/en`, cu adrese traduse): pagina principală
  cu video de deschidere care se retrage într-un cadru la derulare, cifrele clubului, programe în
  carduri suprapuse, etapele academiei de juniori, echipa, metoda cu laboratorul tehnic 3D
  (opțional), baza sportivă, galeria; pagini pentru academia de juniori (grupe, rezultate, cerere
  de evaluare), echipă și fiecare antrenor, programe, club, prețuri, rezervare, galerie foto și
  video, sfaturi, întrebări, contact, listă de așteptare, pagini legale.
- **Identitatea clubului din admin**: nume, logo, două culori (restul paletei se calculează din
  ele, cu verificarea contrastului), video și fotografie de deschidere.
- **Video**: încărcare din admin (până la 500 MB), conversie automată cu ffmpeg în MP4 H.264
  (720p și 1080p) cu cadru de previzualizare, fără metadate (GPS); redare cu byte-range,
  pornire doar pe ecran, buton de pauză, fără pornire automată la „reduced motion” sau economisire
  de date.
- **Rezervări**: disponibilitate din reguli săptămânale minus excepții și rezervări, cu pauză între
  lecții, preaviz, orizont și ora de vară/iarnă; programe, tipuri de lecții și durată aleasă;
  rezervarea dublă e imposibilă (blocare în tranzacție + constrângere de excludere în PostgreSQL);
  emailuri cu `.ics`, anulare prin link, memento, invitație la recenzie.
- **Admin** mobile-first: rezervări, azi, disponibilitate, tot conținutul (RO/EN, Markdown,
  fotografii și video-uri, reordonare), echipa, grupele și rezultatele academiei, media, mesaje,
  evaluări și listă de așteptare, clienți (pachete, GDPR), newsletter, setări, conturi, jurnal.
- **Producție**: Docker Compose cu Caddy (HTTPS automat), PostgreSQL, worker, backup zilnic
  (14 zile, opțional off-site cu rclone), Umami opțional.

## Tehnologii

Next.js 16 (App Router, Server Components, Server Actions), React 19, TypeScript strict,
Tailwind CSS 4, PostgreSQL 16 + Prisma 7, next-intl, Zod, Nodemailer + React Email, sharp,
date-fns-tz, three.js, ffmpeg, Vitest, Playwright + axe, Docker, Caddy.

## Pornire locală

Ai nevoie de Node.js 22, Docker și ffmpeg (pentru video-uri: Windows `winget install ffmpeg`,
macOS `brew install ffmpeg`, Linux `apt install ffmpeg`).

```bash
docker compose -f docker-compose.dev.yml up -d   # PostgreSQL + Mailpit
npm install
cp .env.example .env                              # valorile implicite merg local
npm run db:reset                                  # creează baza de date și o completează din config/club.yml
npm run dev                                       # http://localhost:3000
npm run admin:create                              # contul tău pentru http://localhost:3000/admin
```

- Emailurile trimise local ajung în Mailpit: <http://localhost:8025>.
- Prima rulare a lui `npm run dev` generează pictogramele (câteva secunde).
- Datele inițiale vin din `config/club.yml`. Seed-ul nu suprascrie nimic: `npm run db:seed`
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
| `npm run worker` | sarcinile de fundal (emailuri, conversia video-urilor rămase, mementouri, retenție) în dezvoltare |
| `npm run build:tools` | worker-ul, seed-ul și admin-create ca fișiere JS pentru imaginea Docker |
| `node scripts/docs-screenshots.mjs` | capturile din `GHID-ADMIN.md` |

## Structura

```
app/            rutele: [locale]/ (site public), admin/, api/
components/     secțiunile paginii principale (home/), academia și echipa (academy/), scena 3D (court3d/), pagini, formulare, admin
lib/            baza de date, disponibilitate, rezervări, emailuri, autentificare, conținut, video, SEO
emails/         șabloanele emailurilor (React Email)
messages/       textele interfeței (ro.json, en.json)
prisma/         schema, migrările, seed-ul și conținutul inițial
config/         club.yml, datele clubului (șablonul)
worker/         sarcinile programate
scripts/        setup-server, deploy, backup, restore, images, admin-create
docker/         entrypoint-ul aplicației, imaginea de backup, configurații opționale Caddy
tests/          unit/, integration/, e2e/
docs/           direcția artistică, capturile ghidului
```

## Calitate

- TypeScript strict, fără `any`; ESLint; Prettier.
- Teste: motorul de disponibilitate (inclusiv 29 martie și 25 octombrie), rezervări concurente,
  constrângerea din baza de date, anulări, job-uri, încărcarea imaginilor, conversia video reală
  (fără GPS), byte-range, contrastul culorilor, un singur antrenor principal, acordul părinților la
  rezultate, GDPR, fizica mingii și animația loviturilor; end-to-end pentru rezervare, rezervare
  dublă simultană, confirmare din admin, anulare prin link, contact, login, cererea de evaluare
  din academie până în admin, echipa, pagina principală cu și fără WebGL, accesibilitate axe pe
  toate paginile.
- CI în GitHub Actions (`.github/workflows/ci.yml`): lint, tipuri, teste, build, e2e, audit,
  imaginea Docker, deploy opțional prin SSH.
