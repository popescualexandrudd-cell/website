# Clubul Tenis Elite — site-ul clubului

Site-ul Clubului Tenis Elite din Pantelimon (8 terenuri de zgură, 4 acoperite, deschis zilnic
07:00–22:00): prezentare, rezervări online, închirierea terenurilor, turnee, echipa de antrenori și
panou de administrare. Totul e scris din perspectiva clubului. Codul este construit ca șablon, deci
servește la nevoie și altui club: culorile, logoul, textele, prețurile, fotografiile și
video-urile se editează din panoul de administrare.

- **Pentru club**: cum se folosește panoul → [`GHID-ADMIN.md`](GHID-ADMIN.md); ce mai poate face
  clubul (fotografii, video-uri, fapte de confirmat) → [`CONTENT-TODO.md`](CONTENT-TODO.md).
- **Analiza completă**: marketing, brand, design, SEO cu cercetarea cuvintelor cheie, tehnic,
  performanță și rezultatele verificărilor → [`docs/ANALIZA.md`](docs/ANALIZA.md).
- **Pentru punerea online**: pas cu pas, fără cunoștințe tehnice → [`DEPLOY.md`](DEPLOY.md)
  (inclusiv actualizarea unei instalări vechi la noua structură).
- **Pentru alt club**: cum adaptezi șablonul → [`SABLON.md`](SABLON.md).
- **Designul**: [`docs/DIRECTIE-ARTISTICA.md`](docs/DIRECTIE-ARTISTICA.md) și
  [`DECISIONS.md`](DECISIONS.md); istoricul pe faze: [`PROGRESS.md`](PROGRESS.md); licențe:
  [`CREDITS.md`](CREDITS.md).

## Ce conține

- **Site public** în română (fără prefix) și engleză (`/en`, cu adrese traduse). Meniul de sus are
  cinci intrări (Programe, Închiriere teren, Turnee, Echipa, Contact), iar subsolul opt. Prima
  pagină: video de prezentare, campania de iarnă, povestea din 2013, cifrele, „Ce face diferența”,
  programele, drumul de la mingea roșie la cea galbenă, „3 întrebări, pasul potrivit”, antrenorii,
  tipurile de antrenament, turneele, baza sportivă, galeria, întrebările și rezervarea. Pagini
  pentru programe (cu grupele de minitenis, juniori și seniori și înscrierea copiilor la 2 ședințe
  gratuite), închiriere, turnee, echipă și fiecare antrenor, facilități, prețuri, rezervare,
  galerie, sfaturi, întrebări, contact, card cadou, liga amatorilor, partener de joc, palmares,
  școli și pagini legale. Video-ul clubului rulează pe fundal în antetul fiecărei pagini.
- **Identitatea clubului din admin**: nume, logo, două culori (restul paletei se calculează din
  ele, cu verificarea contrastului), video și fotografie de deschidere.
- **Video**: încărcare din admin (până la 500 MB), conversie automată cu ffmpeg în MP4 H.264
  (360p, 720p și 1080p) cu cadru de previzualizare, fără metadate (GPS); redare cu byte-range,
  pornire doar pe ecran, buton de pauză, fără pornire automată la „reduced motion” sau economisire
  de date.
- **Rezervări**: disponibilitate din reguli săptămânale minus excepții și rezervări, cu pauză între
  antrenamente, preaviz, orizont și ora de vară/iarnă; programe, tipuri de antrenament (individual,
  în 2, în 3, de grup) și durată aleasă;
  rezervarea dublă e imposibilă (blocare în tranzacție + constrângere de excludere în PostgreSQL);
  emailuri cu `.ics`, anulare prin link, memento, invitație la recenzie.
- **Clubul complet**: povestea clubului, închirierea terenurilor cu cerere online, turneele
  găzduite (FRT, Tenis10) cu edițiile următoare, programul pentru școli și grădinițe, „Găsește-ți
  programul” (recomandare în 3 întrebări), `/llms.txt`.
- **Comunitatea clubului**: carduri cadou („Oferă un antrenament de tenis”: cerere, activare din admin,
  card de tipărit cu QR, cod folosit o dată la rezervare), liga amatorilor (clasament calculat din
  scoruri) și „Găsește partener” (listă pe niveluri, contact prin club), palmaresul clubului, nota
  de pe Google cu invitația automată la recenzie și coduri QR de tipărit.
- **Asistentul clubului**: răspunde vizitatorilor la orice oră despre vârste, grupe, prețuri,
  program și oferte, doar din conținutul publicat, și îi trimite spre înscriere sau rezervare.
  Funcționează și fără cheie AI (răspunsuri construite din datele clubului); cu o cheie Anthropic
  răspunde liber, cu aceleași reguli. Nu salvează conversațiile; limite pe vizitator și pe zi.
- **Măsurarea campaniilor**: sursa fiecărei rezervări, înscrieri și mesaj (UTM, reclame,
  căutare, rețele), raport și generator de linkuri în admin; Google Analytics, Google Ads și Meta
  Pixel opționale, încărcate doar după acordul din bannerul de cookie-uri.
- **Admin** mobile-first: rezervări, azi, disponibilitate, tot conținutul (RO/EN, Markdown,
  fotografii și video-uri, reordonare), echipa, grupele și rezultatele clubului, media, mesaje,
  înscrieri și listă de așteptare, clienți (pachete, GDPR), newsletter, campanii, setări, conturi,
  jurnal.
- **Producție**: Docker Compose cu Caddy (HTTPS automat), PostgreSQL, worker, backup zilnic
  (14 zile, opțional off-site cu rclone), Umami opțional.

## Tehnologii

Next.js 16 (App Router, Server Components, Server Actions), React 19, TypeScript strict,
Tailwind CSS 4, PostgreSQL 16 + Prisma 7, next-intl, Zod, Nodemailer + React Email, sharp,
date-fns-tz, ffmpeg, Vitest, Playwright + axe, Docker, Caddy.

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
| `npm run images` | pictogramele site-ului din logoul clubului și ornamentul din emailuri din `art-src/icon.svg` |
| `npm run admin:create` | cont de administrator (sau resetarea parolei) |
| `npm run worker` | sarcinile de fundal (emailuri, conversia video-urilor rămase, mementouri, retenție) în dezvoltare |
| `npm run build:tools` | worker-ul, seed-ul și admin-create ca fișiere JS pentru imaginea Docker |
| `node scripts/docs-screenshots.mjs` | capturile din `GHID-ADMIN.md` |

## Structura

```
app/            rutele: [locale]/ (site public), admin/, api/
components/     secțiunile paginii principale (home/), grupele și echipa (academy/), pagini, formulare, admin
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
  rezultate, GDPR; end-to-end pentru rezervare, rezervare
  dublă simultană, confirmare din admin, anulare prin link, contact, login, înscrierea copiilor
  la 2 ședințe gratuite până în admin, echipa, pagina principală, accesibilitate axe pe
  toate paginile.
- CI în GitHub Actions (`.github/workflows/ci.yml`): lint, tipuri, teste, build, e2e, audit,
  imaginea Docker, deploy opțional prin SSH.
