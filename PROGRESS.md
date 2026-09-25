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
| 7. Admin | gata |
| 8. SEO, GDPR, securitate, performanță, accesibilitate | gata |
| 9. Deploy | gata |
| 10. QA final | gata |
| 11. Redesign: paleta de zgură, tipografie de academie, scene 3D, conținutul antrenorului | gata |

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
- Worker node-cron separat (`worker/index.ts`, construit cu esbuild în `dist/worker.mjs` de `npm run build:tools`): reîncercări
  email, memento la 24 h, invitații la recenzie, anonimizare după perioada de retenție, curățenie.
- Teste: 41 (Vitest). Unitare: generarea intervalelor pe 29 martie și 25 octombrie 2026, ferestre care
  traversează schimbarea orei, pauze, preaviz, orizont, excepții, grupe, limita de anulare, `.ics`,
  token-uri, geometrie. Integrare pe PostgreSQL real (`<baza>_test`): 6 cereri simultane pe același
  interval → exact una reușește; pauza dintre lecții; inserare directă care ocolește aplicația →
  respinsă de constrângere; grupă plină la cereri simultane; anulare înainte și după limită; job-urile.
- Testele au prins o eroare reală: `;` nu era escapat în fișierul `.ics`.

## Faza 7: Panou de administrare

- Autentificare cu argon2id, sesiuni în baza de date (cookie httpOnly, 30 de zile, reînnoire),
  blocare 15 minute după 5 parole greșite, limită de încercări pe IP și pe email, sesiune nouă la
  fiecare autentificare, roluri Proprietar/Editor verificate pe server în fiecare pagină și acțiune.
- Mobile-first: bară de jos cu Azi / Rezervări / Mesaje / Meniu, meniu lateral pe desktop.
- Tablou de bord (de confirmat, lecții săptămâna aceasta, mesaje, listă de așteptare, grad de ocupare
  pe 3 luni, avertismente: email lipsă, texte [DE COMPLETAT], pagini legale neverificate), Azi (cu
  Sună / WhatsApp / email), rezervări (listă cu filtre, săptămână, detaliu, confirmare/refuz/anulare cu
  motiv, efectuată/neprezentare, rezervare manuală, export CSV), confirmare din emailul antrenorului.
- Disponibilitate: intervale săptămânale, excepții (concediu, zile libere, ore extra) cu avertisment
  pentru rezervările afectate.
- Conținut: editor generic pentru scene, antete, profil, certificări, programe, prețuri și pachete,
  orarul grupelor, locații, terenuri, facilități, întrebări, recenzii, galerie, articole, pagini
  legale; câmpuri RO/EN, Markdown cu previzualizare identică cu site-ul, alegere de imagine cu
  încărcare, reordonare prin drag-and-drop (mouse, touch, tastatură) și butoane sus/jos,
  previzualizare pe site cu ciornele.
- Media: încărcare cu verificarea tipului real, 10 MB, re-encodare AVIF/WebP fără EXIF, text alternativ
  obligatoriu, tratament cald opțional; o imagine folosită nu poate fi ștearsă.
- Mesaje, listă de așteptare, clienți (istoric, pachet vândut, lecții rămase, note, export JSON și
  ștergere GDPR), newsletter (export CSV cu link de dezabonare), setări (toate setările site-ului,
  email de test, conturi), contul meu (parolă, deconectare de pe celelalte dispozitive), jurnal.
- Toate formularele păstrează textul introdus când validarea eșuează (și cele publice).
- Teste: 52 (11 noi: upload fără EXIF, SVG/fișier fals/prea mare refuzate, căi media în afara
  directorului, parsarea formularului generic, regula minorilor din galerie, versiunea politicii,
  export și ștergere GDPR, pluralul românesc, CSV). Verificat în browser la 390 px: creare, eroare de
  validare, previzualizare Markdown, salvare, ștergere, reordonare, încărcare, rol Editor fără acces
  la rezervări.

## Faza 8: SEO, GDPR, securitate, performanță, accesibilitate

- `sitemap.xml` (toate paginile publice, RO și EN cu hreflang, programele active și articolele
  publicate), `robots.txt` (fără admin, API și paginile personale cu token), `manifest.webmanifest`.
- Imagini Open Graph generate cu next/og pentru fiecare pagină; JSON-LD pe pagina principală
  (SportsActivityLocation + LocalBusiness, Person), pe lângă cele din faza 5.
- CSP cu nonce verificat în producție (`next build` + `next start`): nicio încălcare în consolă pe
  paginile publice, harta la click, admin. Antete: HSTS, nosniff, Referrer-Policy, Permissions-Policy,
  X-Frame-Options, COOP; adminul are `noindex` și `no-store`. Paginile publice nu setează cookie-uri.
- axe (WCAG 2.0/2.1/2.2 A și AA) pe 21 de pagini publice și 19 pagini de admin, desktop cu
  reduced-motion și mobil: 0 probleme (corectat: tabelele cu derulare orizontală primesc focus).
- Performanță: JS inițial 160 KB gzip pe mobil (zod scos din bundle-ul client, widget-ul de
  rezervare încărcat la apropiere), fonturi preîncărcate doar cele necesare, prima pictură
  preîncărcată, `content-visibility` pe scenele de mai jos. Lighthouse mobil: vezi decizia 48.
- `npm audit`: 0 vulnerabilități. Politica de cookie-uri menționează și cookie-ul de previzualizare.

## Faza 9: Deploy

- `Dockerfile` în patru etape (Node 22 Alpine, `standalone`, utilizator non-root, `HEALTHCHECK`),
  imagine de 728 MB; la pornire: migrări + conținut inițial doar pe o bază goală.
- `docker-compose.yml`: app, worker, db (rețea internă, nepublicată), Caddy (HTTPS, www → domeniu,
  compresie, `/media` din volum), backup (zilnic, 14 zile, rclone opțional), Umami (profil
  `analytics`). `Caddyfile` fără jurnal de acces.
- Scripturi: `setup-server.sh` (Ubuntu 24.04, idempotent: Docker, firewall, actualizări automate,
  swap, `.env` cu parole aleatorii), `deploy.sh` (backup, build, verificare, revenire automată),
  `backup.sh` (acum, listă, copiere), `restore.sh` (cu backup de siguranță).
- CI în GitHub Actions: diacritice, lint, tipuri, teste cu PostgreSQL, build, e2e cu Mailpit, audit,
  imaginea Docker, deploy opțional prin SSH.
- Documentație în română: `README.md`, `DEPLOY.md` (pas cu pas pentru nontehnici), `GHID-ADMIN.md`
  (cu 18 capturi de pe telefon), `CONTENT-TODO.md`, `CREDITS.md`, `docs/DIRECTIE-ARTISTICA.md`.
- Verificat dintr-o copie curată a depozitului: `docker compose up` pornește tot pe HTTPS; rezervare,
  confirmare din admin, emailuri cu `.ics`, încărcare de imagini servite de Caddy; backup și
  restaurare (baza de date și imaginile); `deploy.sh` cu o versiune stricată intenționat revine
  singur la versiunea anterioară. Testele au găsit și corectat trei erori reale (volumul `media`
  creat ca root, suprascrierea backup-ului din același minut, oprirea lui `deploy.sh` înainte de
  revenire).
- Teste end-to-end (Playwright): rezervare completă cu emailuri, confirmare din admin cu `.ics`,
  anulare prin link, două rezervări simultane pe același interval (una reușește), formular de
  contact (inclusiv eroare fără pierderea textului), autentificare greșită, axe pe paginile publice
  (fiecare scenă cinematică la poziția ei) și pe admin la 1440 și 390 px. 8 teste, toate trec.

## Faza 10: QA final

- `npm run lint`, `npm run typecheck`: fără erori. `npm test`: 52 de teste. `npm run test:e2e`:
  8 teste (rezervare, rezervare simultană, confirmare, anulare, contact, login greșit, axe public și
  admin). `npm audit`: 0 vulnerabilități.
- Pornire de la zero dintr-o clonă curată: `npm install`, migrări + seed (de două ori, a doua oară
  nu adaugă nimic), `npm run dev` generează imaginile și pornește; toate rutele publice răspund 200.
- Verificarea diacriticelor din criteriile de acceptare, pe clona curată: nimic găsit.
- Lighthouse mobil pe build-ul de producție: accesibilitate, bune practici și SEO 100 pe toate
  paginile; performanță 89–91 pe pagina principală și 91–94 pe celelalte (simulare, server local
  HTTP/1.1; cu încetinire reală, pagina principală are 98). CLS 0 peste tot.
- Corectat în această fază: textul animat cu SplitText avea `aria-label` pe elemente care nu îl
  permit (acum cititoarele de ecran primesc o copie ascunsă vizual), formularul de anulare
  ocolea handler-ul care păstrează textul, verificarea diacriticelor din CI conținea chiar
  caracterele căutate.

Proiectul e complet. Ce rămâne de completat de antrenor: `CONTENT-TODO.md`.

## Faza 11: Redesign (zgură, 3D, conținut, audit)

Cererea antrenorului: paleta terenului de zgură, fonturi moderne ca la marile academii, animații
3D realiste în locul picturilor, o secțiune personală pentru fotografia de pe teren, texte de
specialitate despre Alexandru Daniel Popescu și un audit al codului. Deciziile: `DECISIONS.md`,
partea a III-a (61–74).

- **Design**: paletă nouă (nisip, zgură, cărămidă, galben cald), Barlow Condensed + Inter (ă â î ș ț
  verificate în fișierele fontului), antet închis cu navigație, hero pe tot ecranul cu patru
  repere, secțiuni alternante, carduri de program, pagini interioare cu antet de zgură și terenul
  desenat la scară, 404 „Out”. Emailurile, imaginea Open Graph, pictograma și panoul de
  administrare folosesc aceeași paletă.
- **3D** (three.js, fișier separat de ≈ 160 KB gzip): meci pe zgură cu fizică reală a mingii
  (rezistența aerului, efect Magnus, ricoșeu cu frecare, urme și praf), jucători biomecanici cu
  cinematică inversă (dreapta, rever cu două mâini, serviciu, split-step, deplasare spre minge),
  laborator tehnic cu fazele loviturilor, încetinitor, cursor și patru unghiuri de cameră.
  Încărcare după afișarea paginii, afiș static fără WebGL, la randare software sau „economisire
  date”, cadru fix la „reduced motion”, rezoluție adaptivă și oprire pe dispozitive lente.
- **Conținut**: profil, parcurs, filozofie, rezultate și patru calificări (RO + EN) doar din
  informațiile date; secțiunile paginii principale și programele rescrise în registru de
  specialitate. Rămân de completat: fotografia, anii diplomelor, emitentul atestatului
  psihopedagogic, adresa clubului (lista: `CONTENT-TODO.md`).
- **Date**: migrarea `redesign_3d` (17 coloane și 3 enumerări ale picturilor eliminate, chei de
  secțiuni redenumite fără pierderi de text); `config/antrenor.yml` acceptă texte RO/EN.
- **Audit**: `turbopack.root` / `outputFileTracingRoot` (avertismentul despre `package-lock.json`
  din folderul utilizatorului), cod mort eliminat (GSAP, Lenis, halftone, regizorul cinematic,
  compozițiile SVG, manifestul de picturi, câmpul „pictură”, `data-page`, `x-pathname`),
  contrastul etichetelor pe zgură și numele accesibil al linkului din antet.
- **Verificări pe build-ul de producție**: `npm run lint`, `npm run typecheck`, Prettier: fără
  erori. `npm test`: 58 de teste (noi: fizica mingii, precizia țintirii, animația loviturilor).
  `npm run test:e2e`: 10 teste (noi: pagina principală și laboratorul, pagina fără WebGL; axe
  WCAG 2.2 AA pe toate paginile publice, cu și fără „reduced motion”, și pe admin). Verificarea
  diacriticelor: nimic în fișierele text.
- **Lighthouse** (simulare, server local): desktop 100 la toate categoriile pe pagina principală,
  Despre, Programe și Prețuri; mobil: performanță 89–93, accesibilitate, bune practici și SEO 100,
  CLS 0. JavaScript-ul inițial specific paginii principale: 4,6 KB gzip.
- Scena 3D a fost verificată vizual în Chromium (desktop și telefon) și în build-ul de producție,
  cu politica CSP activă.


## Academia de tenis (șablon pentru club)

- [x] Model de date: identitatea clubului (logo, culori verificate, deschidere video/foto), echipa
      de antrenori, grupele academiei de juniori, rezultate, cereri de evaluare, video în Media;
      migrarea `academy_template` testată pe o copie a bazei existente.
- [x] Video: încărcare în flux din admin, conversie ffmpeg (720p/1080p, poster, fără GPS), reluare
      din worker, servire cu byte-range, ffmpeg în imaginea Docker, limită separată în Caddy.
- [x] Design nou: paleta din culorile clubului, deschidere cinematică, cifre, programe suprapuse,
      etapele academiei, echipa, mozaicul galeriei; antet peste video.
- [x] Pagini: Academia de juniori (grupe, rezultate, evaluare), Echipa și profilul fiecărui
      antrenor, Despre academie, galeria cu video; sitemap și date structurate.
- [x] Texte în vocea academiei (interfață, emailuri, întrebări, pagini legale).
- [x] Teste: 76 unitare și de integrare (inclusiv conversia video reală), 14 end-to-end (inclusiv
      cererea de evaluare și axe WCAG 2.2 AA pe paginile noi).
- [ ] De la club: fotografiile și video-urile reale, programul și taxele grupelor, ceilalți
      antrenori (`CONTENT-TODO.md`).
