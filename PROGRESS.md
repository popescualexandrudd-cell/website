# Progres

Fiecare fază se încheie cu verificări și un commit. Dacă lucrul se întrerupe, se reia de la prima fază neterminată.

| Fază | Stare |
| --- | --- |
| 1. Plan de design (`DECISIONS.md`) | gata |
| 2. Fundație | gata |
| 3. Date | gata |
| 4. Sistem vizual și pagina principală | gata |
| 5. Pagini interioare | gata |
| 6. Rezervări și emailuri | gata |
| 7. Admin | — |
| 8. SEO, GDPR, securitate, performanță, accesibilitate | — |
| 9. Deploy | — |
| 10. QA final | — |

## Faza 2: Fundație

- Next.js 16.3.6, React 19, TypeScript 5.9 strict (`noUncheckedIndexedAccess`), ESLint 9 (config Next), Prettier.
- Tailwind CSS v4 cu tokens-urile din `DECISIONS.md` în `app/globals.css`.
- Fonturi prin `next/font/google` (descărcate la build, servite de pe domeniul propriu). Verificat cu fontTools:
  subseturile latin-ext ale Cormorant Garamond (drept și italic) și Hanken Grotesk conțin Ș ș Ț ț (U+0218–U+021B).
- `lib/env.ts`: validare Zod la pornire (`instrumentation.ts`), mesaje în română.
- `proxy.ts`: i18n (ro fără prefix, en sub `/en` cu căi traduse) și CSP cu nonce.
- `docker-compose.dev.yml`: PostgreSQL 16 și Mailpit.

## Faza 3: Date

- Schema Prisma completă (`prisma/schema.prisma`), migrarea inițială și migrarea SQL cu `btree_gist` +
  constrângerea de excludere pe `tstzrange(startsAt, blockedUntil)`.
- Seed idempotent din `config/antrenor.yml`: setări, profil, certificări, locație, terenuri, dotări și
  servicii, 8 programe (300–370 de cuvinte în română, traduse), prețuri, pachete, disponibilitate,
  orar de grupe (propunere), 10 scene, 15 întrebări, 3 articole-ciornă, 3 recenzii [EXEMPLU] nepublicate,
  pagini legale, antete de pagină. Rulat de două ori pe o bază nouă: a doua rulare nu creează nimic.

## Faza 4: Sistem vizual și pagina principală

- Placeholder-e SVG compoziționale pentru toate picturile (`scripts/placeholders.ts`), rasterizate de
  `npm run images` în AVIF/WebP pe breakpoint-uri, cu blurDataURL și manifest.
- Header (monogram, Rezervă, meniu overlay pe `<dialog>`), footer cu newsletter, bara mobilă.
- Pagina principală: 10 scene, stage lipit cu straturi, mingea călătoare, 8 tipuri de tranziții,
  halftone WebGL (fallback CSS), linii de teren și constelație desenate pe scroll, mască de pensulă,
  nori în parallax, index de scene cu progres, SplitText pentru cuvinte, Lenis.
- Trei layout-uri din același markup: cinematic (≥ 768 px), stivuit 9:16 pe mobil, static cu reduced-motion.
- Capturi verificate la 1440×900 și 390×844 pentru fiecare scenă și pentru mijlocul fiecărei tranziții;
  corectate: banda de programe, coloana textului din scena 6, lizibilitatea indexului, norii dublați,
  header-ul pe mobil.
- Motorul de disponibilitate, logica de rezervare, emailurile și widget-ul de rezervare din scena 10
  au fost construite deja aici, pentru că pagina principală depinde de ele.

## Faza 5: Pagini interioare

- Toate rutele din secțiunea 6, în română și în engleză (căi traduse): programe (grupate pe public),
  pagina fiecărui program (descriere, pentru cine, ce se lucrează, prețuri, orar grupe, întrebări,
  rezervare cu programul preselectat), facilități (hartă la click), despre, prețuri, rezervare în 4 pași,
  gestionarea rezervării prin token (anulare în termen, .ics), galerie (filtre + lightbox pe `<dialog>`),
  sfaturi, întrebări pe categorii, contact, pagini legale cu date completate din setări, listă de
  așteptare, recenzie din invitație, confirmare newsletter, 404 și 500.
- Metadate pe fiecare pagină (canonical, hreflang, Open Graph) și JSON-LD (Person, SportsActivityLocation,
  Service + Offer, FAQPage, BreadcrumbList, Article).
- Verificat în browser: o rezervare completă, cu emailul clientului în Mailpit.

## Faza 6: Rezervări, emailuri, worker

- Motorul de disponibilitate (`lib/availability.ts`): reguli − excepții − rezervări − ședințe de grupă,
  cu pauza dintre lecții pe ambele părți, preaviz minim, orizont, fus orar și ora de vară/iarnă.
- Crearea rezervării (`lib/booking.ts`): tranzacție cu `pg_advisory_xact_lock`, reverificare, iar
  constrângerea de excludere din Postgres ca ultimă garanție (eroarea 23P01 devine mesajul
  „Intervalul tocmai a fost ocupat. Alege altă oră.").
- Emailuri React Email (client și antrenor, în limba clientului), `.ics` atașat, jurnal `EmailLog` cu
  reîncercare și revendicare atomică (fără trimiteri duble).
- Worker node-cron separat (`worker/index.ts`, construit cu esbuild în `dist/worker.mjs`): reîncercări
  email, memento la 24 h, invitații la recenzie, anonimizare după perioada de retenție, curățenie.
- Teste: 41 (Vitest). Unitare: generarea intervalelor pe 29 martie și 25 octombrie 2026, ferestre care
  traversează schimbarea orei, pauze, preaviz, orizont, excepții, grupe, limita de anulare, `.ics`,
  token-uri, geometrie. Integrare pe PostgreSQL real (`<baza>_test`): 6 cereri simultane pe același
  interval → exact una reușește; pauza dintre lecții; inserare directă care ocolește aplicația →
  respinsă de constrângere; grupă plină la cereri simultane; anulare înainte și după limită; job-urile.
- Testele au prins o eroare reală: `;` nu era escapat în fișierul `.ics`.

## Următorul pas

Faza 7: panoul de administrare.
