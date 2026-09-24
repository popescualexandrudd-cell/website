# Surse, licențe și mulțumiri

## Imagini

- **Picturile provizorii** (`art-src/placeholders/`, generate de `scripts/placeholders.ts`) și
  iconița cu mingea aurie (`app/icon.svg`) sunt create pentru acest proiect. Nu conțin elemente
  preluate din alte site-uri sau opere.
- **Picturile finale** nu sunt încă incluse. Specificațiile lor sunt în
  `docs/DIRECTIE-ARTISTICA.md`. Când le adaugi, trece aici autorul sau generatorul folosit și
  licența (de exemplu: „Generat cu …, drepturi de utilizare comercială conform termenilor …”).
- **Gravuri și picturi istorice**: niciuna folosită deocamdată. Dacă adaugi, doar din domeniul
  public, cu sursa exactă (de exemplu The Met Open Access, CC0; Rijksmuseum, CC0).
- **Harta** (doar după click): © contribuitorii OpenStreetMap, date sub licența ODbL
  (openstreetmap.org/copyright).

## Fonturi

Găzduite pe același server (nicio cerere către Google la vizitarea site-ului).

| Font | Autor | Licență |
| --- | --- | --- |
| Cormorant Garamond | Christian Thalmann (Catharsis Fonts) | SIL Open Font License 1.1 |
| Hanken Grotesk | Alfredo Marco Pradil (Hanken Design Co.) | SIL Open Font License 1.1 |

## Programe și biblioteci

| Componentă | Folosită pentru | Licență |
| --- | --- | --- |
| Next.js 16, React 19 | aplicația web | MIT |
| TypeScript, ESLint, Prettier | cod și verificări | Apache-2.0 / MIT |
| Tailwind CSS 4 | stiluri | MIT |
| GSAP 3 (ScrollTrigger, SplitText) | animațiile paginii principale | GSAP Standard „no charge” License |
| Lenis | derularea lină | MIT |
| Prisma 7, node-postgres | baza de date | Apache-2.0 / MIT |
| PostgreSQL 16 | baza de date | PostgreSQL License |
| next-intl | română și engleză | MIT |
| Zod | validarea datelor | MIT |
| date-fns, date-fns-tz | date, ore, fus orar | MIT |
| markdown-it | textele formatate | MIT |
| sharp | prelucrarea imaginilor | Apache-2.0 |
| Nodemailer, React Email | emailurile | MIT-0 / MIT |
| node-cron | sarcinile programate | ISC |
| dnd-kit | reordonarea prin tragere în admin | MIT |
| @node-rs/argon2 | parolele (argon2id) | MIT |
| yaml, dotenv | configurație | ISC / BSD-2-Clause |
| Vitest, Playwright, axe-core | teste | MIT / Apache-2.0 / MPL-2.0 |
| Caddy | HTTPS și server web | Apache-2.0 |
| Docker, Docker Compose | rulare pe server | Apache-2.0 |
| Umami (opțional) | statistici fără cookie-uri | MIT |
| Mailpit (dezvoltare) | prinde emailurile local | MIT |
| rclone (opțional) | copia backup-urilor în afara serverului | MIT |

Lista completă a dependențelor și versiunile exacte: `package.json` și `package-lock.json`.
