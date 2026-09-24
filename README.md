# Site pentru un antrenor de tenis

Site de prezentare cu rezervări online și panou de administrare, pentru un antrenor de tenis
din România. Pagina principală e o poveste în zece scene pictate, parcurse la derulare, cu o minge
aurie care trece dintr-o scenă în alta. Totul, de la texte la prețuri și imagini, se editează din
panoul de administrare.

- **Pentru antrenor**: cum se folosește panoul → [`GHID-ADMIN.md`](GHID-ADMIN.md); ce mai trebuie
  completat → [`CONTENT-TODO.md`](CONTENT-TODO.md).
- **Pentru punerea online**: pas cu pas, fără cunoștințe tehnice → [`DEPLOY.md`](DEPLOY.md).
- **Picturile**: prompturi, dimensiuni, zone de text → [`docs/DIRECTIE-ARTISTICA.md`](docs/DIRECTIE-ARTISTICA.md).
- **De ce e făcut așa**: [`DECISIONS.md`](DECISIONS.md) (planul de design și deciziile tehnice);
  progresul pe faze: [`PROGRESS.md`](PROGRESS.md); licențe: [`CREDITS.md`](CREDITS.md).

## Ce conține

- **Site public** în română (fără prefix) și engleză (`/en`, cu adrese traduse): pagina principală
  cinematică (GSAP, ScrollTrigger, Lenis, shader WebGL; variantă verticală simplificată pe mobil și
  statică la „reduced motion”), programe, facilități, despre, prețuri, rezervare, galerie, sfaturi,
  întrebări, contact, listă de așteptare, pagini legale.
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
date-fns-tz, GSAP + Lenis, Vitest, Playwright + axe, Docker, Caddy.

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
- Prima rulare a lui `npm run dev` generează imaginile (aproximativ 2 minute); după aceea pornește
  imediat.
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
| `npm run images` | picturile din `art-src/` → AVIF/WebP responsive în `public/art/` |
| `npm run admin:create` | cont de administrator (sau resetarea parolei) |
| `npm run worker` | sarcinile de fundal (emailuri, mementouri, retenție) în dezvoltare |
| `npm run build:tools` | worker-ul, seed-ul și admin-create ca fișiere JS pentru imaginea Docker |
| `node scripts/docs-screenshots.mjs` | capturile din `GHID-ADMIN.md` |

## Structura

```
app/            rutele: [locale]/ (site public), admin/, api/
components/     scene, pagini, formulare, admin, animații
lib/            baza de date, disponibilitate, rezervări, emailuri, autentificare, conținut, SEO
emails/         șabloanele emailurilor (React Email)
messages/       textele interfeței (ro.json, en.json)
prisma/         schema, migrările, seed-ul și conținutul inițial
config/         antrenor.yml, datele clientului
art-src/        picturile originale și compozițiile provizorii
public/art/     imaginile optimizate (generate) și compozițiile SVG
worker/         sarcinile programate
scripts/        setup-server, deploy, backup, restore, images, admin-create
docker/         entrypoint-ul aplicației, imaginea de backup, configurații opționale Caddy
tests/          unit/, integration/, e2e/
docs/           direcția artistică, capturile ghidului
```

## Calitate

- TypeScript strict, fără `any`; ESLint; Prettier.
- Teste: motorul de disponibilitate (inclusiv 29 martie și 25 octombrie), rezervări concurente,
  constrângerea din baza de date, anulări, job-uri, încărcarea imaginilor, GDPR; end-to-end pentru
  rezervare, rezervare dublă simultană, confirmare din admin, anulare prin link, contact, login.
- CI în GitHub Actions (`.github/workflows/ci.yml`): lint, tipuri, teste, build, e2e, audit,
  imaginea Docker, deploy opțional prin SSH.
