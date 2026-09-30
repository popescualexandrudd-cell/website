# Jurnalul modificărilor (CHANGELOG)

Formatul urmează [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versiunile urmează versionarea semantică (§14). Fiecare etapă aprobată primește un tag git (`etapa-0`, `etapa-1a` …).

## [Nelansat]

### Etapa 11, site-ul instalabil (PWA) — 30.09.2026 (livrat)
#### Adăugat
- Manifestul (`src/app/manifest.ts`): numele, pornirea, culorile, iconițele (192, 512, maskable), scurtăturile Rezervă / Contul meu / Liga doar pe site-ul complet; iconița pentru iPhone.
- Iconițele din `public/icons/`, desenate din emblemă cu `scripts/render-icons.mjs`.
- Service worker-ul (`public/sw.js`, `ServiceWorker`): paginile doar din rețea, niciodată păstrate; fișierele statice ale site-ului păstrate după prima vizită; fără internet, pagina `/offline` (RO/EN, `ReloadButton`).
- Testul `e2e/full/pwa.spec.ts`; celelalte teste rulează cu service worker-ul blocat (`page.route`).

### Etapa 11, restul contului — 30.09.2026 (livrat)
#### Adăugat
- Meniul contului (`AccountNav`): Rezervări, Cardul, Plăți și abonamente, Liga mea, Sala de evenimente, Profil și date; fiecare pagină cere intrarea în cont (`MemberOnly`, `useMember`).
- `/cont/card` (`AccountCard`): codul QR (ca imagine), numărul, Apple/Google Wallet când sunt active, blocarea cardului pierdut și un card nou (R-020 … R-022).
- `/cont/plati` (`AccountMoney`): credit și datorii, abonamentele (înghețare, anularea celor neplătite), voucherele, codul „Adu un prieten” și codul primit de la un prieten (R-120), istoricul (R-065).
- `/cont/liga` (`AccountLeague`, `LeagueCompetitions`): rang, nivel, LP, loc, pașii de intrare în ligă, turneele (înscriere, retragere, partener după pagina publică), provocările (doar vizualizare), schimbările de LP, insignele, acordul GDPR al ligii (retragere).
- `/cont/evenimente` (`AccountEvents`): cererea pentru sala de evenimente și răspunsul managerului (R-110, Q34).
- `/cont/profil` (`AccountProfile`): datele, parola, copiii (doar cu `child_accounts`, Q7), exportul datelor (GDPR art. 15 și 20), ștergerea contului cu parola (§12.2).
- `src/lib/member.ts` cu teste; `siteFlags().children`; texte `web.account.*`.
#### Schimbat
- Butonul „Cere sala de evenimente” din secțiunea Evenimente duce la cererea din cont.

### Etapa 11, contul și rezervările online — 30.09.2026 (livrate)
#### Adăugat
- `/cont` (`AccountArea`): intrarea în cont (cu codul 2FA doar când contul îl are), tabloul (profil, confirmarea emailului cu retrimitere, rezervările viitoare cu anulare, clasele, ieșirea).
- `/cont/inregistrare` (`RegisterForm`, cu versiunile curente ale Termenilor și Politicii de confidențialitate), `/cont/verificare-email`, `/cont/am-uitat-parola`, `/cont/parola-noua` (`AccountForms`); fără indexare.
- `/rezervari` (`BookingPicker`): ziua, durata, orele libere pe fiecare teren de padel, prețul, rezervarea cu contul; `src/lib/booking.ts` (ora clubului, grila de 30 de minute).
- `src/lib/account.ts` (sesiune + CSRF, ADR-0011), grupurile de texte `ACCOUNT_NAMESPACES`, `BOOKING_NAMESPACES`; texte `web.account.*`, `web.bookings.*`.
- `scripts/test-e2e`: `CSRF_TRUSTED_ORIGINS` pentru site și emailurile testelor citite și de site-ul complet.
#### Reparat
- Mesajele de eroare ale serverului apăreau ca un cod tehnic (next-intl citește punctul din cod ca separator); `src/lib/error-text.ts`, folosit și de lista de așteptare și de paginile din emailuri.
- Prețurile din cont și taxele turneelor, fără „lei”.

### Etapa 11, paginile de prezentare — 30.09.2026 (livrate)
#### Adăugat
- Paginile Padel, Tenis, Pilates, Pachete, Evenimente, Cafenea și Contact (`SitePage`, `sitePageMetadata`): titlu, introducere (`web.site.pageIntro.*`), apoi secțiunile aprobate; fiecare cu adresa canonică și hreflang.
- `ContactDetails`: telefonul (`tel:`) și emailul (`mailto:`) din datele firmei, programul; fără formular.
#### Schimbat
- Testul antetului și testul de efecte al Fazei 5 folosesc pagini cu conținut: nu mai există pagini „în construcție” în meniu.

### Etapa 11, paginile separate: Liga — 30.09.2026 (livrată)
#### Adăugat
- `/liga` (`LeaguePage`, randată pe server la fiecare cerere):
  - clasamentele Dublu, Simplu și Perechi;
  - arhiva sezoanelor, filtrul de rang, căutarea după nume fără diacritice;
  - rezultatele recente (Q49), turneele, regulile pe scurt.
- `/liga/jucator/{id}` (`PlayerPage`): pagina publică a jucătorului (R-012, Q49), fără indexare.
- `src/lib/league-page.ts`: citirea din API-ul public și alegerile din adresă. Texte `web.site.leaguePage.*` RO + EN.
- Etapa nouă „league-data” la finalul `scripts/test-e2e`: pagina Ligii cu datele reale ale Chioșcului Ligii și ale ecranelor.
#### Schimbat
- Testul antetului folosește pagina Tenis ca exemplu de pagină în construcție (Liga are acum conținut).

### Aprobare și Q65 — 30.09.2026
#### Schimbat
- Proprietarul aprobă efectele site-ului (Fazele 1–7) și secțiunile 14–19.
- Q65: secțiunea „Echipa” arată, sub roluri, câte doi antrenori pentru padel, tenis și Pilates Reformer, cu nume fictive marcate „Nume fictiv” (`src/lib/team.ts`, texte `web.site.team.people.*`). Q66 confirmată.

### Efectele site-ului, Fazele 4–7 — 30.09.2026 (livrate)
#### Adăugat
- Faza 4, secțiunile 3–13 (hero-ul rămâne neschimbat: imaginea LCP):
  - `data-reveal` pe etichete, titluri și texte, pe listele cu cascadă (`--i`) și pe desene (`mask`);
  - `data-tilt` pe carduri;
  - `data-count` pe cifrele din Tenis și pe capacitatea sălii de evenimente;
  - `fx-pop` + `key` pe valorile de la server (nivelul, LP-ul, prețul pachetului, partea fiecăruia, starea unui teren).
- Faza 5: paginile din meniu și paginile legale intră discret la navigare; paginile legale primesc atributele doar cu `web_effects` pornit (pre-lansarea neschimbată).
- `scripts/record-scroll.mjs` (înregistrarea derulării pentru rapoarte); înregistrările în `docs/00-management/verificare/etapa-11-efecte/inregistrari/`.
- Ghidul proprietarului: `docs/08-deploy-si-mentenanta/03-ghid-efecte-si-video.md`; ADR-0023, secțiunea „Implementarea”.
#### Schimbat
- `EffectsRuntime`:
  - pune nivelul de mișcare abia după primul raport al observatorului: ce e pe ecran rămâne afișat, fără recalcularea forțată a paginii;
  - elementele de sub ecran trec în starea inițială fără animație (`data-motion-init`). Înainte, sute de fade-uri invizibile la încărcare: TBT +150–200 ms, mediana pe telefon 86 în loc de 92.
- Tilt-ul: lumina se desenează doar cât stă mouse-ul pe card; fără `preserve-3d`.

### Efectele site-ului, Faza 3 — 30.09.2026 (livrată): secțiunile 14–19, cu efectele din prima zi
#### Adăugat
- Secțiunea 14 „Comunitatea” (`Community`): insignele ligii (§6.15, fiecare jucător își vede insignele doar în cont, R-012), Hall of Fame din `GET /api/v1/league/hall-of-fame` (`src/lib/fame.ts`; nume, rang și loc, LG-134), „Adu un prieten” (R-120).
- Secțiunea 15 „Echipa” (`Team`): rolurile, fără nume inventate (Q65).
- Secțiunea 16 „Clubul în cifre” (`Numbers`): doar cifre din `docs/`, care numără în sus la apariție (`data-count`).
- Secțiunea 17 „Locație și acces” (`Location`): adresa, accesul, parcarea, planul clubului, OpenStreetMap și, opțional, Waze sau Google Maps (doar linkuri, fără hartă încorporată).
- Secțiunea 18 „Întrebări frecvente” (`Faq`): regulile pe scurt (R-053, Q3, R-041, R-070–R-073, Q9, invariantul 14), `<details>` fără cod, cu link spre Termeni.
- Secțiunea 19, subsolul site-ului complet (`Footer full`): paginile clubului, programul și limbile; partea legală neschimbată.
- `src/lib/effects-dom.ts`: numărarea în sus (se termină mereu pe textul serverului), tilt-ul cardurilor după cursor (`data-tilt`), bara de progres din antet și linkul secțiunii din ecran (`data-active`); doar la nivelul „on”.
- Teste: `e2e/full/community.spec.ts`, `e2e/effects/details.spec.ts`, unitare pentru `fame` și `effects-dom`; Q65, Q66.
#### Schimbat
- `inventory.mjs --compare` compară câmpurile fără id-urile automate ale React (`useId`), care se schimbă când o secțiune se adaugă deasupra.
- `expectAccessible` (testele cap-coadă) verifică pagina cu efectele terminate: axe derulează la fiecare element și, altfel, măsura contrastul unui text la jumătatea fade-ului.

### Efectele site-ului, Faza 2 — 30.09.2026 (livrată)
#### Adăugat
- `HeroVideo`: videoul de prezentare peste randare, după încărcarea paginii, fără sunet, în buclă, cu buton de pauză (WCAG 2.2.2), estompat la derulare; cu „reducerea mișcării” sau „lite” doar la cerere; pe telefon, hala 3D așteaptă ieșirea videoului din ecran (`offScreen` în `src/lib/webgl.ts`).
- `pnpm --filter @jungle/web video:hero` (`scripts/video-hero.mjs`, ffmpeg): variantele MP4/WebM pentru calculator și telefon, imaginea de rezervă și `manifest.json`, cu bugetul verificat și recomprimare automată; `src/lib/hero-video.ts` citește manifestul.
- Folderul `apps/web/media-src/hero/` (originalul, cu instrucțiuni); testele cap-coadă cu un clip generat (`public/media/hero-e2e`, niciodată în git); CI instalează ffmpeg.
- Texte `web.site.hero.video.*` RO + EN.
#### Schimbat
- Pragul „telefon slab” al efectelor: ≤ 2 nuclee sau ≤ 2 GB (un laptop cu 4 nuclee primește efectele complete).

### Efectele site-ului, Faza 1 — 30.09.2026 (livrată)
#### Adăugat
- Tokenii de mișcare (`--motion-ease-spring`, `-duration-base`, `-stagger`, `-distance`, `-tilt-max`, `-perspective`, `-pop-from`).
- `EffectsRuntime` + `src/lib/effects.ts` (nivelurile „on / lite / reduced”) + CSS-ul `data-reveal`; comutatoarele `web_effects` și `web_hero_video` (oprite implicit, doar pe site-ul complet).
- Q34 pe site: fraza despre cererea online și telefonică și butonul „Sună la club” (cu telefonul din datele firmei); `src/lib/company.ts` (`companyDetails`, `telHref`), folosit și de subsol.
- `inventory.mjs --compare-shots` (regresia vizuală) și `REDUCED=1`; etapa „efecte pornite” în `scripts/test-e2e` (toate testele site-ului din nou, plus `e2e/effects/`).
#### Schimbat
- Textele componentelor client pleacă doar cu pagina care le folosește (`ClientTexts`): pagina principală a site-ului complet, 56,4 KB în loc de 61,7 KB.

### Efectele site-ului, Faza 0 — 30.09.2026 (livrată)
#### Adăugat
- `apps/web/scripts/inventory.mjs` (`pnpm --filter @jungle/web inventory`): inventarul site-ului complet (pagini RO/EN, calculator și telefon; secțiuni, titluri, linkuri, butoane, câmpuri, imagini, regiuni, meta, apeluri API; din cod: componente client, chei `web.*`, comutatoare), capturi pe toată pagina (`SHOTS`) și `--compare` (pică dacă a dispărut ceva).
- Referința: `docs/00-management/verificare/etapa-11-efecte/INVENTAR_INAINTE.json` (commit `382c7f9`), capturile paginii principale, viteza de referință.
- ADR-0023 (propus): sistemul de efecte al site-ului. Întrebările Q59–Q64.

### Etapa 11, secțiunile 11–13 — aprobate 30.09.2026
#### Schimbat
- Proprietarul a aprobat secțiunile 11 („Împarte ora”), 12 (Evenimente) și 13 (Cafeneaua); intră în `main`.
- Q33 rezolvată (fără stoc, fără imprimantă de bonuri) și Q34 rezolvată (sala se cere online și telefonic; pachetele, prețurile și confirmarea le aprobă un manager).

### Etapa 11, secțiunea 13 — 30.09.2026 (livrată)
#### Adăugat
- Cafeneaua de specialitate (§9.2, secțiunea 13): `Cafe`, randată pe server, meniul din `src/lib/cafe.ts`.
  - cum se comandă: Chioșcul de Plăți, numerar, bonul cu numărul, ecranul din lobby (R-111, Q9);
  - meniul exact din panou, doar ce e disponibil (R-112), marcat „Prețuri orientative” (Q21);
  - texte `web.site.cafe.*` RO + EN.
- Server: orice schimbare de meniu (categorie, produs) cere site-ului reîmprospătarea (eticheta nouă `cafe`, acceptată și de `POST /api/revalidate`).
- Teste: un test pe server extins (fiecare schimbare de meniu cere reîmprospătarea), 4 unitare pe site, 4 cap-coadă (`e2e/full/cafe.spec.ts`). Lighthouse mobil 90–94 (patru măsurători), desktop 100 · 100 · 100 · 100.

### Etapa 11, secțiunea 12 — 30.09.2026 (livrată)
#### Adăugat
- Evenimente (§9.2, secțiunea 12, R-110): `Events`, randată pe server (niciun script nou în browser), logica în `src/lib/events.ts`.
  - serile cu DJ, turneele ligii, padelul social;
  - calendarul clubului: evenimentele publicate și turneele ligii deschise sau în desfășurare, în ora clubului; „Anulat” și „Exemplu (demo)” la vedere;
  - sala de evenimente: câte persoane și prețul pe oră din date („orientativ”, Q21), cererea din cont confirmată de manager (Q34);
  - texte `web.site.events.*` RO + EN.
- Server: aplicația `jungle.events` (modelul `ClubEvent`).
  - public: `GET /api/v1/events/calendar`;
  - personal (`events.manage`, pe locație): `GET|POST /api/v1/staff/club-events`, `PUT /api/v1/staff/club-events/{id}`, `POST …/{id}/publication`, `POST …/{id}/cancel`, toate în jurnalul de audit;
  - coduri de eroare noi: `events.event_not_found`, `events.invalid_time`, `events.already_cancelled`;
  - după orice schimbare vizibilă, serverul cere site-ului reîmprospătarea (eticheta nouă `events`, acceptată și de `POST /api/revalidate`);
  - `seed_initial --demo` adaugă două evenimente demo, marcate;
  - 100% acoperire pe ramuri, impusă de `scripts/test-all`.
- Panou: Evenimente → „Calendarul public” (`ClubCalendar`): adaugă (ciornă sau publicat), modifică, publică, retrage, anulează, cu motiv; texte `admin.events.calendar.*` RO + EN.
- Teste: 11 pe server (+ datele demo), 3 în panou, 9 unitare pe site, 4 cap-coadă (`e2e/full/events.spec.ts`). Lighthouse mobil 92 · 100 · 100 · 100, desktop 100 · 100 · 100 · 100.
#### Schimbat (viteza pe telefon, tot site-ul)
- Linkurile site-ului nu mai pre-descarcă paginile (`Link` din `src/i18n/navigation.tsx`, `prefetch` oprit implicit).
- Verificarea plăcii video pentru scenele 3D se face pe un fir separat (`public/gpu-probe.js`, `realGpu()` în `src/lib/webgl.ts`), cu verificarea veche ca rezervă.
- Fontul Fraunces cursiv nu se mai preîncarcă (nu îl folosește niciun text).

### Etapa 11, secțiunea 11 — 30.09.2026 (livrată)
#### Adăugat
- „Împarte ora” (§9.2, secțiunea 11): `Split` + `SplitHour`.
  - banda, durata și câți plătesc;
  - partea fiecăruia, calculată pe server cu tariful terenului de padel (R-051) și împărțirea chioșcului (R-061);
  - orele benzii din setări;
  - fără credite (invariantul 14);
  - texte `web.site.split.*` RO + EN.
- Server: `GET /api/v1/pricing/{locație}/split` (`jungle.pricing.split`, schema `CourtSplitOut`; nu rezervă și nu salvează nimic); `pricing.services.rate_for` (fostul `_rate`), public.
- Teste: 13 pe server, 4 cap-coadă (`e2e/full/split.spec.ts`). Lighthouse mobil 90 · 100 · 100 · 100, desktop 100 · 100 · 100 · 100.

### Etapa 11, secțiunile 9–10 — aprobate 30.09.2026
#### Schimbat
- Proprietarul a aprobat secțiunile 9 (Pilates Reformer) și 10 (configuratorul de pachete); intră în `main`.
- Q12 confirmată: `subscriptions.start_rule_below_sessions` (8) e marcată confirmată.

### Etapa 11, secțiunea 10 — 30.09.2026 (livrată)
#### Adăugat
- Configuratorul de pachete (§9.2, secțiunea 10): `Packages` + `PackageConfigurator`, logica în `src/lib/packages.ts`.
  - sporturile, intensitatea și perioada (R-081);
  - prețul de la server, cu reducerile la vedere și rotunjirea la leu (R-084), marcat „Preț orientativ” (Q21);
  - regula Start (R-087, Q13);
  - notele (R-083, R-085, R-086, Q12, R-089, Q9) și pachetul de firmă (R-088, Q35);
  - texte `web.site.packages.*` RO + EN.
- Teste: 6 unitare pe site, 4 cap-coadă (`e2e/full/packages.spec.ts`, fiecare preț comparat cu serverul).
#### Schimbat
- Spre browser pleacă doar textele componentelor interactive (`src/lib/client-messages.ts`, `CLIENT_NAMESPACES`, păzite de un test), nu tot catalogul. Pagina principală a scăzut de la 75 la 58 KB pe rețea. Lighthouse mobil 91 · 100 · 100 · 100, desktop 100 · 100 · 100 · 100.

### Etapa 11, secțiunea 9 — 30.09.2026 (livrată)
#### Adăugat
- Pilates Reformer (§9.2, secțiunea 9): `Pilates` + `ClassSchedule`, logica în `src/lib/classes.ts`.
  - studioul în fapte (R-100, R-103, Q46), cu un desen ilustrativ al aparatelor;
  - cele 8 clase din R-101 și lista de așteptare (R-102);
  - programul săptămânii, live din `GET /api/v1/classes`, în ora clubului, cu locurile libere sau „Plin · listă de așteptare”;
  - texte `web.site.pilates.*` RO + EN.
- Teste: 3 unitare pe site, 4 cap-coadă (`e2e/full/pilates.spec.ts`). Lighthouse mobil 91 · 100 · 100 · 100, desktop 100 · 100 · 100 · 100.
#### Schimbat
- `GET /api/v1/classes` întoarce clasele în ordinea orelor, cel mult `limit` (1–200, implicit 100); test nou.

### Etapa 11, secțiunile 2–8 — aprobate 30.09.2026
#### Schimbat
- Proprietarul a aprobat secțiunile 2–8 („Aprob și continuă”); intră în `main`.
- Q58 rezolvată („nu avem adresa”): secțiunea Tenis nu mai are fraza „Legătura spre site-ul Clubului Tenis Elite apare aici în curând.”; butonul spre site-ul de tenis apare doar dacă se completează adresa în panou (`club.tennis_club_url`, acum marcată confirmată).

### Etapa 11, secțiunea 8 — 30.09.2026 (livrată)
#### Adăugat
- Tenis (§9.2, secțiunea 8): `Tennis`. Clubul Tenis Elite pe scurt (§2.3), lecțiile de tenis, abonamentele combinate, Reformer pentru jucători; fără prețuri sau program de terenuri (sunt ale clubului de tenis). Texte `web.site.tennis.*` RO + EN.
- Setarea `club.tennis_club_url` (DE_CONFIRMAT, Q58), publică prin `GET /api/v1/config/links`; site-ul o citește cu `src/lib/links.ts` (doar `https://`).
- Teste: 1 pe server, 2 unitare pe site, 2 cap-coadă (`e2e/full/tennis.spec.ts`). Lighthouse mobil 92 · 100 · 100 · 100, desktop 100 · 100 · 100 · 100.
- Întrebare nouă: Q58.

### Etapa 11, secțiunea 7 — 30.09.2026 (livrată)
#### Adăugat
- Liga Jungle (§9.2, secțiunea 7): `League` + `PointsSimulator` + `StandingsPreview`, rangurile în `src/lib/league.ts`.
  - rangurile pe o scară care urcă, Bronz → Regele Junglei;
  - cum se câștigă LP; sezoanele (minimum 12 meciuri, Sezonul 0); premiile (Q6, R-024);
  - simulatorul de puncte;
  - clasamentul live (primii 5, R-012);
  - texte `web.site.league.*` RO + EN.
- Server: `GET /api/v1/league/lp-preview` (public, nu citește și nu salvează nimic despre jucători), `jungle.league.lp_preview`. Motorul ligii calculează LP-ul, șansa, rangul după meci și rangul spre care duce nivelul, cu valorile sezonului în curs (σ = 5 pentru toți, meci obișnuit de dublu).
- Teste: 24 pe server, 4 unitare pe site, 5 cap-coadă (`e2e/full/league.spec.ts`).
#### Reparat
- Testul antetului așteaptă titlul paginii noi înainte de verificarea de accesibilitate (pica uneori după schimbarea limbii).
- Lighthouse mobil 95 · 100 · 100 · 100, desktop 100 · 100 · 100 · 100.

### Etapa 11, secțiunea 6 — 30.09.2026 (livrată)
#### Adăugat
- Simulatorul „Care e nivelul tău?” (§9.2, secțiunea 6): `Level` + `LevelSimulator`, întrebările în `src/lib/level.ts`. Câte o întrebare pe pastile (6, sau 3 pentru cine n-a jucat); mingea ricoșează în pereții de sticlă și aterizează pe scara 1–7. Rezultat: nivelul estimat, descrierea treptei, ce să încerci (lecție de inițiere, lecții cu antrenor, meciuri deschise, Liga Jungle) și linkul spre chestionarul oficial, precompletat (R-003). Texte `web.site.level.*` RO + EN.
- Server: `GET /api/v1/league/level-guess` (public, nu salvează nimic), `jungle.league.level_guess`. Răspunsurile devin răspunsurile chestionarului oficial, iar nivelul e estimarea lui (Q47): simulatorul și chestionarul dau același număr. Regulile, în `docs/04-arhitectura/aplicatii/09-website-simulator.md`.
- Teste: 24 pe server, 5 unitare pe site, 5 cap-coadă (`e2e/full/level.spec.ts`).
#### Schimbat
- Pe paginile în română, fonturile cu literele ă, ș, ț se cer de la început (preload), nu după așezarea textului.
- Lighthouse mobil 91 · 100 · 100 · 100 (LCP simulat 3,3 s, de măsurat pe serverul real, Etapa 14), desktop 100 · 100 · 100 · 100.

### Etapa 11, secțiunea 5 — 30.09.2026 (livrată)
#### Adăugat
- Padel (§9.2, secțiunea 5): `Padel` + `PadelCourt` (schema unui teren standard 20 × 10 m, ilustrativă); ce e padelul, de ce e ușor de început, terenurile clubului, lecțiile (R-090, R-003), cum rezervi (R-041, Q3, ora împărțită între jucători; fără prețuri, Q21), formatele de turneu Americano / Mexicano / King of the Court (după `league.draws`), „Rezervă un teren”. Texte `web.site.padel.*` RO + EN.
- Teste cap-coadă `e2e/full/padel.spec.ts` (inclusiv: niciun preț în secțiune). Lighthouse mobil 95 · 100 · 100 · 100, desktop 100 · 100 · 100 · 100.

### Etapa 11, secțiunea 4 — 30.09.2026 (livrată)
#### Adăugat
- „Acum în club” (§9.2, secțiunea 4): `NowInClub` + `LiveClub`, din API-ul public, reîmprospătat la fiecare minut. Terenurile: liber / liber până la / ocupat până la (rezervările lipite se adună) / închis, fără nume (R-012); Meciul zilei (Q49); primii 3 Regi ai Junglei (R-012); următorul turneu. Ora clubului (`src/lib/live.ts`, Europe/Bucharest); „Regii” se cer doar într-un sezon activ (fără cereri eșuate în browser înainte de primul sezon). Texte `web.site.live.*` RO + EN; `LOCATION_SLUG` în `src/lib/site.ts`.
- Teste: 4 unitare (`src/lib/live.test.ts`), 3 cap-coadă (`e2e/full/live.spec.ts`: API-ul real, oră fixată cu date controlate și actualizare după un minut, server indisponibil). Lighthouse mobil 93 · 100 · 100 · 100, desktop 100 · 100 · 100 · 100.

### Etapa 11, secțiunea 3 — 29.09.2026 (livrată; alegerile Etapei 11 delegate de proprietar)
#### Adăugat
- Turul clubului la scroll (§9.2, secțiunea 3): `Tour` + `TourStops`, opt opriri în ordinea vizitatorului (parcare → alee → recepție → terenuri → mezanin → cafenea → pilates → sala de evenimente), lângă planul redesenat după schiță (`SitePlan`, fără randări inventate, Q44). Oprirea din mijlocul ecranului se luminează pe plan și primește punctul „ești aici” (`aria-current="step"`); fără JavaScript sau cu mișcare redusă, o listă simplă. Pe telefon, planul rămâne sus. Texte `web.site.tour.*` RO + EN, doar fapte confirmate. „Descoperă clubul” din Hero duce aici.
- Teste cap-coadă `e2e/full/tour.spec.ts`; Lighthouse mobil 93 · 100 · 100 · 100, desktop 100 · 100 · 100 · 100 (în `verificare/etapa-11/` rămân doar cele mai recente rapoarte).

### Etapa 11, secțiunea 2 — 29.09.2026 (livrată)
#### Adăugat
- Hero-ul site-ului complet (§9.2, secțiunea 2), `FullHero`: randarea arenei aprobată în Etapa 1B (imaginea statică, apoi scena 3D pe aparatele capabile), marcată ilustrativă (Q44); „Intră în junglă.” / „Step into the jungle.”; „Rezervă un teren” (`/rezervari`) și „Vezi liga live” (`/liga`); „Descoperă clubul” spre secțiunea următoare. Mișcare doar prin transformări (randarea se așază, textul urcă o dată, săgeata respiră), oprită pentru „mișcare redusă”. Texte `web.site.hero.*` RO + EN.
- Pagina principală a site-ului complet: Hero-ul, apoi harta secțiunilor (acum h2, `BUILT = 2`).
- Teste cap-coadă `e2e/full/hero.spec.ts` (acțiunile RO/EN, indicatorul de scroll, mișcarea redusă); Lighthouse mobil 95 · 100 · 100 · 100, desktop 100 · 100 · 100 · 100 (rapoartele în `verificare/etapa-11/`).

### Reparat — 29.09.2026 (panoul de admin, calendarul)
- O rezervare care nu intră în orele zilei afișate (de exemplu 23:00–00:30, văzută în ziua de după) era desenată peste celula de la 08:00, cu înălțime aproape zero, și o acoperea (găsit de verificarea de accesibilitate, WCAG 2.5.8, când testele au rulat seara). Acum partea din program se desenează normal, iar o rezervare fără nicio parte în program apare sub calendar, în „În afara programului zilei”, de unde se deschide ca oricare alta.
- `manage.py payments_demo`: rezervarea demo cade în programul clubului (Q3); seara târziu, a doua zi dimineață.
- Testul cap-coadă al ecranului de teren pica între 23:00 și 24:00: antrenamentul de după meciul demo începea după miezul nopții, iar ecranul arată corect doar rezervările de azi (§8.5). `manage.py screens_demo` spune acum dacă „următorul” e azi (`next_today`), iar testul verifică varianta potrivită orei; acceptă și „Timp rămas: 01:00” (imediat după începutul unei jumătăți de oră).

### Etapa 11, secțiunea 1 — 29.09.2026 (aprobată 29.09.2026; Q57 rezolvată: site-ul complet apare doar când îl publică proprietarul)
#### Adăugat
- Comutatorul `full_site` (ADR-0022, Q57, DE_CONFIRMAT, oprit implicit): oprit, vizitatorii văd pagina de pre-lansare (Etapa 1B), iar paginile site-ului complet răspund 404; pornit, site-ul complet. Se schimbă din panou (Setări și feature flags) sau cu `manage.py set_flag <cheie> on|off --reason ...` (în jurnal, ca SYSTEM).
- Reîmprospătarea imediată a site-ului: după salvarea unui comutator sau a unei setări, backend-ul cere site-ului (`POST /api/revalidate`, parola comună `WEB_REVALIDATE_SECRET` = `REVALIDATE_SECRET`, comparată în timp constant; doar etichetele `flags` și `config`) să-și reîmprospăteze paginile (`jungle.configuration.web`, semnale `post_save`, după commit). Fără semnal, cel târziu în 5 minute.
- Site-ul complet, secțiunea 1 (§9.2): antetul fix (logo, meniul Padel · Liga · Tenis · Pilates · Pachete · Evenimente · Cafenea · Contact cu pagina curentă marcată, RO/EN pe aceeași pagină, contul, „Rezervă” mereu vizibil); sub 1280 px, meniul într-un panou (Escape, focusul înapoi pe buton, derularea paginii oprită cât e deschis).
- Adresele localizate din §9.3 (`/ro/padel`, `/ro/liga`, `/ro/tenis`, `/ro/pilates`, `/ro/pachete`, `/ro/evenimente`, `/ro/cafenea`, `/ro/contact`, `/ro/rezervari`, `/ro/cont` și echivalentele EN), deocamdată „În construcție”, `noindex`; pagina principală a site-ului complet arată harta celor 19 secțiuni (previzualizare internă).
- Teste: 6 backend (`test_web.py`), 5 unitare pe site, 7 cap-coadă pe calculator și telefon (`e2e/full/`, după pornirea comutatorului în `scripts/test-e2e`); partea `E2E_ONLY=web`.
- `.dockerignore`: imaginile nu primesc nimic construit local (`.next`, `node_modules`) și niciun `.env` sau cheie.
#### Reparat la revizuire
- Panoul meniului pe telefon (limba și contul sub listă); pragul meniului întreg mutat la 1280 px (nu se mai lovește de butoane); harta secțiunilor nu mai iese din ecran la 320 px; memoria de date a unei construcții anterioare (`.next/cache/fetch-cache`) nu mai ajunge în construcția testelor.

### Reparat — 29.09.2026 (CI roșu pe `main`, Chioșcul Ligii)
- Chioșcul Ligii, ecranul de repaus (§8.2): cerea clasamentul în fiecare secundă, nu la 30 s, și rotirea Dublu / Simplu / Perechi reîncepea mereu (nu se vedea decât Dublu). Încărcarea depinde acum doar de API (`useEffectEvent`), iar chioșcul păstrează clasamentele între sesiuni: după o ieșire ecranul revine direct cu ele, fără ecran gol și fără saltul paginii (90 px) care făcea să se piardă un clic în testele cap-coadă.
- `packages/kiosk-kit`, `useIdle`: ceasul bate doar cât numără (sesiune deschisă sau plată în curs); un chioșc în repaus nu mai e redesenat în fiecare secundă.
- Chioșcul de Plăți, la fel: oferta de abonamente rămâne între sesiuni (după o ieșire, ecranul nu mai „sare” când sosește). Ecranele de repaus ale ambelor chioșcuri spun când încă se încarcă (`aria-busy`).
- Testele cap-coadă ale chioșcurilor așteaptă ecranul de repaus gata înainte să apese ceva (un test al modului personal apăsa „Personal” chiar când pagina se mișca) și trimit scanarea simulată cu Enter (un clic e verificat de Playwright doar la apăsare). La un test picat al Chioșcului Ligii, jurnalul arată ce a făcut pagina (mesajele bridge-ului, fără coduri de card; cererile; erorile); `scripts/test-e2e` afișează și ce arăta pagina la final, așteaptă oprirea serverelor la ieșire și verifică pornirea Redis.

### Etapa 10 — 29.09.2026 (aprobată 29.09.2026; Q56 rămâne deschisă)
#### Adăugat
- `apps/admin` (React + Vite, port 5179): panoul de administrare (§8.6), pe aceeași adresă cu API-ul (proxy `/api`, cookie de sesiune + CSRF).
  - Intrare cu parolă și cod TOTP (2FA obligatoriu, ADR-0011); la prima intrare, configurarea 2FA și cele 10 coduri de rezervă, arătate o singură dată.
  - Meniul arată doar modulele permise rolului la locația aleasă; serverul verifică din nou orice acțiune.
  - Module: tablou de bord live; utilizatori (R-004) și niveluri (R-003); calendarul rezervărilor pe resurse, cu rezervare nouă, mutare prin tragere sau din detalii, anulare, plată în numerar ca excepție (Q9, cheie de idempotență R-067); resurse; prețuri cu marcajul DE_STABILIT; abonamente (R-082, Q12, R-086) și firme (R-088, Q35); clase și prezențe (R-101, R-070); prezențe și blocări după neprezentări (R-073); liga (decizii cu motiv, sezoane, turnee, Meciul zilei; fără câmp de scor, invariantul 1); plăți și registru (corecții doar prin înregistrări inverse), vouchere; numerar, seif, operațiunile personalului, rapoartele Z, PIN-ul pentru chioșc (Q54); cafenea (coadă, comandă la bar, meniu); evenimente; rapoarte și exporturi CSV (în jurnal, protejate de formule); personal și roluri; dispozitive (înrolare, token arătat o dată, oprire cu motiv); setări versionate și feature flags; jurnalul de audit; starea sistemului. Modulele Etapelor 11–12 apar marcate.
  - Ora clubului (Europe/Bucharest) peste tot, și la trecerea la ora de vară (`src/clock.ts`); RO/EN (`admin.*`).
- `jungle.panel` (100% acoperire pe ramuri): permisiunile pe locații, tabloul de bord, programul zilei, toate resursele, antrenorii, abonamentele, firmele, clasele săptămânii, sezoanele, registrul zilei, numerarul și operațiunile, voucherele, meniul complet al cafenelei, rapoartele pe perioade, exporturile CSV, personalul și matricea rolurilor, starea sistemului.
- `POST /api/v1/staff/bookings/{id}/move`: mutarea unei rezervări cu aceleași reguli ca o rezervare nouă (R-041, R-043, Q3, antrenorul liber), cu motiv în jurnal; locul eliberat merge la primul din lista de așteptare (R-074). Cod nou: `booking.not_movable`.
- Permisiunea nouă `reports.view` (admin, manager; Q56, DE_CONFIRMAT). Setarea `JUNGLE_VERSION` (versiunea afișată în starea sistemului). Lista setărilor are descrierea fiecărei chei.
- `manage.py panel_demo` (conturi demo de manager și recepție fără 2FA, rezervări demo); partea `admin` în `scripts/test-e2e` (`E2E_ONLY=admin`).
#### Reparat la revizuire
- Orele alese în panou se trimit în ora clubului, nu a calculatorului; plățile trecute de personal au cheie de idempotență per încercare; doar numerar (Q9); un preț pe oră cu număr impar de bani e refuzat, nu rotunjit; celulele calendarului de sub o rezervare nu mai sunt ținte ascunse (accesibilitate).

### Q55 aplicată — 29.09.2026 (răspunsul proprietarului)
#### Schimbat
- Ecranele: toți jucătorii de pe teren apar pe nume; cei din ligă au insigna „Ligă” și, doar ei, rangul, LP-ul și nivelul (R-012). Un cont șters sau o persoană care s-a opus (GDPR art. 21, `screens.NameObjection`, notată de recepție în adminul tehnic) apare ca „Jucător”. Politica de confidențialitate (ciorna RO + EN) spune asta.
#### Adăugat
- Chioșcul Ligii: „Echipele pe teren”. Cei 4 jucători scanați pe un teren își aleg singuri echipele („Cu cine joci?”); ecranul terenului se schimbă imediat (`POST /kiosk/league/lineups`, `/lineups/{booking_id}`; `screens.CourtLineup`, în jurnal). Nu după introducerea meciului, nu la turnee sau provocări. Coduri noi: `screens.not_on_court`, `screens.teams_fixed`.
- `screens.pairs_from_scan_order` și `screens.announcements` sunt confirmate de proprietar.

### Etapa 9 — 29.09.2026 (aprobată 29.09.2026; Q55 rezolvată)
#### Adăugat
- `jungle.screens` (§8.5, 100% acoperire pe ramuri): `GET /api/v1/device/screen/state`, doar pentru ecrane înrolate, active, din rețeaua clubului (refuzurile în jurnal).
  - **Ecranul unui teren:** sesiunea curentă cu tipul, durata și jucătorii (doar câmpurile R-012; cine nu e public apare „Jucător”, Q55), echipele (din meciul de la chioșc, meciul de turneu, provocarea acceptată sau scanările de la intrarea pe teren), următoarea rezervare, Meciul zilei, cod QR spre liga de pe site.
  - **Ecranul de lobby:** toate terenurile, clasamentele, Regii Junglei, evenimentele, anunțurile clubului, comenzile de cafenea gata.
- Timp real (ADR-0005): Django Channels + daphne, un bilet de o singură folosință pentru WebSocket (`POST /device/screen/ticket`), anunțuri după commit la orice rezervare, intrare pe teren, schimbare în ligă sau comandă de cafenea; prin Redis între procese.
- Aparatele: un ecran poate avea terenul lui (`resource_id` la înrolare). Configurări noi: `screens.pairs_from_scan_order`, `screens.announcements` (Q55, DE_CONFIRMAT), `screens.qr_url`.
- `apps/court-screens` (React + Vite): ecranul de teren exact ca exemplul din §8.5, vizualul „jungle” animat cât terenul e liber, ecranul de lobby, legătura live cu reconectare, ultima stare păstrată (fără ecrane goale), indicator discret de conexiune, RO/EN.
- `manage.py screens_demo` (exemplul din §8.5, cu numele cerute; `--rental` pentru o schimbare live); testele cap-coadă cu backendul real, Redis și câte un Hardware Bridge pe fiecare ecran; Redis în CI.
#### Reparat la revizuire
- Clasamentele de pe ecrane lasă deoparte imediat un jucător care s-a retras din ligă, chiar înainte ca tabelul clasamentului să fie rescris.
- Lobby-ul nu încăpea pe un ecran Full HD (Meciul zilei împingea clasamentul în afara ecranului); indicatorul de conexiune acoperea textul de sub codul QR.

### Reparat — 29.09.2026 (CI pe `main`)
- Hardware Bridge: o scanare sau o bancnotă se trimite acum tuturor paginilor deodată, iar o pagină care nu o preia în 2 secunde (de exemplu una care tocmai se închide) e deconectată și se reconectează singură. Înainte, o pagină pe cale să se închidă putea întârzia scanarea pentru pagina vie până la 10 secunde (testul cap-coadă al abonamentului a picat o dată în CI).
- Hardware Bridge: o încasare terminată (sau oprită de un defect) se consideră încheiată înainte ca pagina să afle, deci următoarea comandă a paginii nu mai primește „busy”.
- CI: la un test cap-coadă picat se păstrează 7 zile urmele Playwright (capturi, trace), iar scriptul afișează ultimele 200 de rânduri din jurnalul serverului.
- Ca emailurile „Run failed” să nu mai apară: 5 din cele 6 rulări CI picate (27–29.09) veneau din commit-uri împinse înainte ca `scripts/test-all` să fie verde (lint, un test de setări de producție, tipuri TypeScript). Hook-ul nou `.githooks/pre-push` rulează toate verificările pe exact commit-ul împins și refuză push-ul dacă pică sau dacă arborele de lucru nu e curat; `scripts/setup` îl activează. Regula e în `CLAUDE.md` (regula 9) și în `CHECKLIST_LIVRARE.md`.

### Etapa 8 — 29.09.2026 (aprobată 29.09.2026; Q53 și Q54 noi, deschise)
#### Adăugat
- `jungle.checkout` (§8.3, 100% acoperire pe ramuri): plata cu numerar la Chioșcul de Plăți: coș (rezervări întregi sau o parte din oră, clase, abonamente, taxe de turneu, cafenea), întrebarea „dă rest?” înainte de bani, „doar suma exactă” sau restul ca credit cu acordul clientului, notele semnate de bridge trimise imediat, restul (parțial dacă aparatul nu poate, diferența devine credit), registrul (câte o plată pe articol, în casa chioșcului), bonul fiscal (R-066) și închiderea; anularea cu banii înapoi; reconcilierea după cădere de curent și a banilor sosiți târziu sau necunoscuți; plata din credit (R-067) și cu voucher (R-121); abonament la chioșc (configuratorul R-081) și înghețare (R-086); împărțirea orei (R-060, R-061); datoriile primele; check-in (R-030); alertele aparatului către recepție.
- Modul personal al chioșcului (Q54): PIN de 6 cifre setat din cont cu 2FA, blocare după greșeli; alimentare rest, golire casetă, numărare comparată cu registrul (diferența la manager, R-064), raportul Z cu totalurile zilei.
- API-ul afișajului cafenelei (`/api/v1/device/cafe`, §8.7) și `POST /kiosk/payments/events` cu confirmarea semnată `journal.ack` pentru bridge.
- Hardware Bridge: escrow (bancnota se poate înapoia), „doar suma exactă”, rest parțial raportat exact, bon fiscal o singură dată, raport Z, alimentare/golire/numărare, alerte „rest scăzut” și „casetă plină”.
- `packages/kiosk-kit`: ce au în comun ecranele aparatelor (legătura cu bridge-ul, `useDevice`, `useIdle`, erori API, texte RO/EN, lei, ora clubului, tastaturi, stilul și fonturile); Chioșcul Ligii mutat pe el.
- `apps/kiosk-payments` (React + Vite): toate fluxurile din §8.3, RO/EN, ieșire după 60 s (niciodată cu bani în aparat), reconcilierea la pornire; `apps/cafe-display`: coada live pe trei coloane, semnal sonor.
- `manage.py payments_demo` (DEMO); testele cap-coadă cu două Hardware Bridge reale (chioșcul și afișajul).
- Q53 și Q54 (variante implicite DE_CONFIRMAT).
#### Reparat la revizuire
- Descrierile rezervărilor și ale claselor (pe bon, în registru, la chioșc) erau în ora UTC; acum sunt în ora clubului (ADR-0010).
- 10 scheme OpenAPI cu același nume se suprascriau în clientul generat (inclusiv din etapele anterioare); numele sunt acum unice și un test le verifică.
- Mesajul de blocare a PIN-ului arăta un minut în plus.
- Abonamentul comandat la chioșc cerea email confirmat, deși clientul e identificat cu cardul clubului (Q53).
- O plată oprită cu bani în aparat nu mai poate fi închisă de pe ecran fără a da banii înapoi.

### Etapa 7 — 28.09.2026 (aprobată 28.09.2026; Q51 și Q52 confirmate)
#### Adăugat
- Autentificarea aparatelor (ADR-0012): înrolare din API cu token afișat o dată (se păstrează doar amprenta SHA-256), certificat client (mTLS) obligatoriu în producție, cheia publică a Hardware Bridge; refuzurile în jurnal, limitate pe adresă; `GET /device/whoami`.
- API-ul Chioșcului Ligii (`/api/v1/kiosk/league/*`, doar aparate autentificate): ecranul de repaus, clasamente cu căutare, sesiunea jucătorului (60 s pe server, legată de aparat, `POST /logout`), acordul GDPR, scorul, confirmări, provocări, meciuri de turneu și validarea directorului, check-in (R-030). Cu bridge înrolat, scanările trebuie semnate (nonce, fereastră de 2 minute).
- `services/hardware-bridge` (ADR-0013): serviciu asyncio pe 127.0.0.1, doar pentru originea chioșcului; interfețele aparatelor cu simulatoare complete și defecte; cheie Ed25519, scanări și evenimente de numerar semnate, comenzi de numerar semnate de server, executate o singură dată; jurnal de numerar SQLite doar-adăugare (WAL, `synchronous=FULL`), recuperare după cădere de curent; 100% acoperire pe ramuri.
- `apps/kiosk-league` (React + Vite): ecranul de repaus, sesiunea cu ieșire după 30 s, toate acțiunile din §8.2, RO/EN, tastatură pe ecran, mesaje din codurile de eroare; teste unitare și cap-coadă cu backendul și bridge-ul reale (axe).
- `deploy/kiosk-os`: instalarea pe Debian (bridge ca serviciu, Chromium în `cage` cu politică restrictivă, pagină locală „temporar indisponibil”, watchdog, blocarea sistemului, actualizări de securitate), verificată fără instalare de `scripts/test-all`; procedura de instalare și înrolare, varianta Windows (`docs/09-hardware/`).
- `manage.py kiosk_demo` (DEMO, refuzat în producție); `KIOSK_ALLOW_LOOPBACK` doar pentru dezvoltare.
- LG-099 (Q51, confirmat): un meci contează doar pentru jucătorii deja în ligă când s-a jucat.
#### Reparat la revizuire
- Un jucător intrat în ligă imediat după meci bloca scorul abia la ultima confirmare (acum: refuz imediat, cu mesaj).
- Codul motorului `league.score_tournament_unfinished` lipsea din lista de erori (test nou pentru toate codurile motorului).
- În producție, serverul refuză să pornească fără Redis (sesiunile chioșcului și anti-replay-ul trebuie să fie comune tuturor proceselor).
- Construirea versiunii publicate a chioșcului e refuzată dacă un token de aparat e setat.

### Etapa 6 — 28.09.2026 (aprobată 28.09.2026)
#### Modificat la aprobare (răspunsurile proprietarului)
- Q6: top 3 din fiecare rang aleg din cont între 15% la abonament și 4 vouchere de 20% la rezervări (`POST /league/me/rewards/{id}/choose`); Regii Junglei: 2 ore gratuite, o cutie de mingi, card special.
- Q49: R-012 extins: rezultatele meciurilor de ligă (`GET /league/results`), pagina publică a jucătorului cu istoricul (`GET /league/players/{id}`), terenul și ora la meciurile de turneu și la Meciul zilei; jucătorii retrași apar ca „Jucător retras”; acordul ligii versiunea 2 (RO/EN).
- Q11, Q27, Q28, Q47, Q48, Q50 confirmate.
#### Adăugat
- `jungle.league`: evenimente de ligă doar-adăugare, starea în cache și recalculare de la zero identică (§6.16), clasamente cu doar câmpurile R-012, intrarea în ligă (chestionar Q47, validarea antrenorului, acordul de la chioșc, 18+) și ieșirea (retragerea acordului, ștergerea contului), sezoane cu valori fixate la pornire (ADR-0022) și pornire din sezonul anterior (LG-130).
- Fluxul scorului (§6.9): doar la Chioșcul de Ligă activ, al clubului, din rețeaua clubului (invariantul 1, refuzurile în jurnal); fereastra de 30 de minute; confirmare de toți; dispută; validare doar cu rezervarea plătită integral (Q11, 24 h), cu validare automată la plata ulterioară; expirare; rezolvarea managerului cu motiv (aplică, redeschide, anulează + recalculare); jurnal doar-adăugare al fiecărui pas; o singură aplicare la confirmări simultane (LG-162).
- Provocări (§6.11, la chioșc), decay zilnic și avertizări (LG-106, LG-107), închiderea sezonului cu recompense ca vouchere (Q6), Regii Junglei și cardul special, Hall of Fame, insigne, cardul Diamant automat (R-024), Meciul zilei (§6.15).
- Turnee (§6.14): eliminatoriu, grupe + eliminatoriu, fiecare cu fiecare, Americano, Mexicano, King of the Court; tragere după rang sau la sorți cu sămânță; taxa de participare în registru; scorul la chioșc (Q28); LP × 1,5 și bonus pe fază.
- Motor: meciurile de turneu nu au limită zilnică și nici randament descrescător (Q49, DE_CONFIRMAT); simularea neschimbată.
- `manage.py expire_league_matches` (la 5 minute), `manage.py league_daily` (zilnic); emailuri RO/EN pentru provocări, decay și recompense.
- `scripts/test-all` impune 100% acoperire pe ramuri și pentru `jungle/league`; 135 de teste noi (490 în backend).
#### Reparat la revizuire
- Managerul nu mai poate scrie un scor la o dispută (redeschide fereastra de la chioșc).
- Meciurile terminate în același minut nu mai forțează recalcularea întregului sezon.
- Starea salvată și recalcularea de la zero sunt identice până la ultimul caracter (ora în UTC).
- Un sezon închis nu mai poate primi evenimente de la o cerere începută înainte de închidere.
- Setările de tip listă de opțiuni ale motorului (al treilea refuz) sunt citite corect.
- Grupele de turneu nu mai pot avea o singură pereche; referința bonusului de turneu încape în baza de date.

### Etapa 5 — 27.09.2026 (aprobată 27.09.2026)
#### Adăugat
- `jungle.cards`: card de membru cu cod QR aleatoriu și revocabil (R-020, R-022), reemitere care invalidează cardurile vechi, blocare de către personal, scanare cu codul cardului (R-025), coada de carduri de tipărit și PDF-ul CR80 cu fontul inclus (R-021), cardul Diamant cu emblemă aleasă, o singură dată (R-024, Q1).
- Apple Wallet (la cererea proprietarului, 27.09.2026): `.pkpass` semnat, serviciul web PassKit, notificări de actualizare prin APNs; Google Wallet: link „Adaugă în Google Wallet” semnat, actualizări prin API; actualizare automată la orice schimbare a cardului (R-023); `manage.py wallet_check`; activare după certificatele clubului (Q24).
- `jungle.privacy`: acordul ligii doar la Chioșcul de Ligă și doar de la 18 ani, cu toate câmpurile R-011; retragere din cont; exportul complet al datelor; ștergerea contului ca „Jucător retras” (§12.2).
- Textul acordului ligii (RO/EN), ghidul pentru conturile Apple/Google, imagini de exemplu ale cardului.
- 47 de teste noi (355 în backend).
#### Reparat la revizuire
- Cheia serviciului Apple Wallet se compară în timp constant.
- Schimbarea numelui actualizează cardul din Wallet.
- Recomandările în așteptare ale unui cont șters se anulează.

### Etapa 4 — 27.09.2026 (aprobată 27.09.2026)
#### Modificat la aprobare (răspunsurile proprietarului)
- Q21: prețuri orientative în sistem de la prima pornire (`seed_initial`), marcate DE_STABILIT, cu nota „Preț orientativ”.
- Q35: un singur pachet de firmă, 20% reducere (`corporate.discount_percent`, confirmat); reducerea per firmă a fost scoasă.
- Q9: doar numerar la lansare; Q13: Start permis în semi-vârf (confirmat).
#### Adăugat
- `jungle.ledger`: registru cu dublă înregistrare în bani întregi, tabele doar-adăugare, tranzacții echilibrate verificate la commit, chei de idempotență, corecții prin înregistrări inverse; plăți în numerar cu rest și bon (simulator, Q23), din credit, cu voucher; împărțirea orei (R-061); datorii la anulare târzie, neprezentare și sesiuni jucate; credit la anularea gratuită (Q14); excepțiile de plată ale personalului doar cu motiv (Q10).
- `jungle.subscriptions`: configuratorul în 3 pași, prețul pachetului cu reduceri multiplicative rotunjit la leu (R-084), comandă și activare la plată, sesiuni consumate de lecții și clase, regula Start fără vârf (R-087, Q13), fără reportare (R-085), sesiuni de recuperare (Q14), înghețare 14 zile/an (R-086), intensități „La cerere” (Q12), conturi corporate cu raport lunar (R-088, Q35).
- `jungle.rewards`: vouchere (oră gratuită, sumă, procent), „Adu un prieten” (R-120, Q32), emitere manuală de către manager (R-121).
- `jungle.cafe`: meniu, comenzi plătite și numerotate pe zi, coada de la bar, numerele gata pentru lobby, anulare cu restituire (R-111, R-112, Q33).
- Date DEMO (DE_STABILIT) pentru abonamente și cafenea în `seed_initial --demo`.
- `scripts/test-all` impune 100% acoperire pe ramuri pentru modulele de bani; 104 teste noi (308 în backend).
#### Reparat la revizuire
- Contul unei firme nu încăpea în registru (câmp prea scurt).
- Un voucher folosit și apoi anulat la timp s-ar fi transformat în credit cheltuibil; acum redevine voucher.
- Două plăți simultane din același credit ar fi putut trece amândouă; acum se fac pe rând.

### Etapa 3 — 27.09.2026 (aprobată 27.09.2026)
#### Modificat la aprobare (răspunsurile proprietarului)
- Q3: ora de vârf 17:00–22:00 (15:00–17:00 devine semi-vârf, implicit); programul 08:00–23:00 confirmat.
- Q2, Q15, Q16 confirmate: durate 60–180 min, fereastra de 90 de zile, 2 ore de anulare gratuită după promovare. Q21 rămâne deschisă.
#### Adăugat
- `jungle.bookings`: rezervări de terenuri și ședințe private pe Reformer (grilă de 30 min, durate Q2, program Q3, tipul sesiunii schimbabil până la check-in Q29), rezervare la recepție pentru un client, anulări gratuite/cu plată/scutite (R-070, R-071), lista de așteptare cu promovare automată și email (R-074, Q16), clase de pilates cu capacitate ≤ aparate active și listă de așteptare (R-100 … R-102), cereri pentru sala de evenimente aprobate de manager (Q34).
- Garanții în PostgreSQL: excluderea suprapunerilor pe resursă, pe antrenor și pe sală (btree_gist), grila și duratele (CHECK); rezervările simultane se pun la rând (advisory lock), fără deadlock.
- `jungle.pricing`: tarife pe 30 de minute pe bandă orară, sezon, tip client și produs; ofertă proporțională, corectă și în zilele cu schimbarea orei; tarife publice; modificări auditate. Tarife DEMO marcate DE_STABILIT în `seed_initial --demo`.
- `jungle.attendance`: scanări (sosire, teren, clasă) legate automat de rezervare sau clasă; neprezentări după 15 min; blocare la a treia în 90 de zile, cu notificare pentru antrenorul/instructorul responsabil sau manager (R-072, R-073, Q15); deblocare cu motiv; comanda `process_no_shows`.
- API: `/bookings`, `/classes`, `/events`, `/pricing`, `/staff/bookings`, `/staff/classes`, `/staff/events`, `/staff/scans`, `/staff/restrictions`, `/staff/notices`, `/staff/pricing/rates`; coduri de eroare noi traduse RO/EN; emailul `spot_promoted`.
- 71 de teste noi (202 în backend), cu ID-ul regulii în nume.
#### Reparat la revizuire
- Calculele de timp pe ziua schimbării orei se fac acum în UTC.
- Două rezervări simultane pe același teren dădeau „deadlock” în loc de „loc ocupat”.
- Un antrenor putea fi rezervat la o lecție în timpul propriei clase de pilates.
- Rezervarea online cere emailul confirmat.

### Etapa 1B, revizia 3 „Noapte și alamă” — 27.09.2026 (aprobată 27.09.2026)
#### Modificat
- Identitatea B4 aleasă de proprietar: tokeni noi (noapte, os, alamă, pădure), contrast AAA pe fundalurile întunecate; fonturile Fraunces și Instrument Sans (auto-găzduite, reduse).
- Arena 3D după schița clubului: 4 terenuri 2 × 2, pasarela-lounge la 3 m între rânduri, lumină de seară; cardul de membru cu reflexii mai discrete.
- Textele RO/EN după planul real (pasarela dintre terenuri, cafeneaua cu scară, pilates și evenimente în clădirea de alături).
#### Adăugat
- Planul clubului (schemă după schiță) în secțiunea Locație.
- `docs/12-branding/05-identitate-provizorie-noapte-si-alama.md`; întrebarea Q46.

### Etapa 2 — 27.09.2026 (aprobată 27.09.2026)
#### Adăugat
- `packages/league-engine` (Python pur): MMR Weng-Lin Thurstone–Mosteller verificat față de `openskill`; nivelul 1.0–7.0; chestionar și plasare; ranguri Bronz IV → Maestru, LP, promovare/retrogradare/protecție, departajare, Regele Junglei; validatorul de scor și meciurile neterminate; anti-abuz (minimum de meciuri, limită zilnică, randament descrescător, decay); provocări; turnee; resetarea de sezon; evenimente înainte/după, aplicare idempotentă, recalculare deterministă.
- 173 de teste cu ID-ul regulii în nume, 100% acoperire pe ramuri, teste de proprietate (hypothesis); incluse în `scripts/test-all`.
- Simularea mare (`tools/simulate.py`: 500 de jucători, 50.000 de meciuri, 8 sezoane) cu rapoarte și grafice în `docs/03-liga/simulari/`.
- `docs/03-liga/ID-URI-REGULI.md` (LG-001 … LG-162), `NIVELURI.md`, `simulari/CALIBRARE.md`; sursa FIP pentru regula la 40–40 („Star Point”, din 2026).
- Întrebarea nouă Q45 (valorile implicite ale ligii).
#### Modificat la calibrare
- `LP_total_așteptat` calibrat prin simulare la `(Nivel − 1,3)/4,6 × 2000` (DE_CONFIRMAT, se recalibrează după Sezonul 0).
#### Reparat la revizuire
- Două promovări posibile dintr-un singur meci cu bonus mare de turneu: surplusul se plafonează la 99 LP.
- Bonusurile se pierdeau la un câștig plafonat la +60: acum se adaugă după plafonare.
- Simulatorul socotea ziua în UTC (motorul, corect, în ora României): acum folosesc aceeași regulă.

### Etapa 1B, revizia 2 „Premium Light” — 27.09.2026 (așteaptă aprobarea)
#### Modificat
- Identitatea vizuală provizorie „Premium Light” înlocuiește „Neon Jungle”: fundal deschis, bleumarin, smarald, accente metalice, fontul Inter (`docs/12-branding/04-identitate-provizorie-premium-light.md`); contrast AAA pentru text.
- Pagina de pre-lansare refăcută pe povestea clubului: deschidere cu vederea din lounge-ul de la 3 m, Arena (4 terenuri), Ecosistemul (rezervare → acces digital → ieșire), Facilități integrate, Liga și cardurile de statut (Argint, Aur, Platină, Diamant), Locație, Lista de așteptare.
- Scene 3D noi cu materiale fizice (PBR) și reflexii: arena văzută din lounge (privirea coboară la derulare, GSAP ScrollTrigger) și cardul de membru metalic; imagini statice proprii, cu text alternativ, când 3D-ul nu rulează.
- Lista de așteptare: doar nume, email și, opțional, nivelul de joc (minimizarea datelor); telefonul și interesele au fost eliminate.
#### Adăugat
- Pagini legale RO/EN: Termeni și condiții, Politica de confidențialitate, Politica de anulare și rambursare, Politica de cookies (redactate fără avocat, Q41).
- Gestionar de cookies propriu: statisticile pornesc doar după „Accept”; refuzul are aceeași greutate; alegerea se poate schimba din subsol.
- Subsol cu datele de identificare ale firmei (din configurare, `GET /api/v1/config/company`), linkurile legale și linkul ANPC SAL.
- Meniu pe mobil, legătură „Sari la conținut”, focus vizibil, etichete explicite pe butoane.
- Întrebarea nouă Q44 (randări sau fotografii reale ale spațiilor).
#### Reparat la revizuire
- Linkurile din texte nu erau subliniate (se distingeau doar prin culoare, WCAG 1.4.1).
- Linkul spre politica de rambursare din termeni ducea la o adresă greșită.
- Biblioteca 3D se descărca și pe dispozitivele fără placă video; acum placa video se verifică înainte (mobil: performanță 86 → 95).
- Textul din deschidere avea contrast slab peste randare; adăugat un voal deschis în spatele lui.

### Etapa 1B — 27.09.2026 (așteaptă aprobarea)
#### Adăugat
- `apps/web` (Next.js 16): pagina de pre-lansare RO/EN cu adrese traduse, scenă 3D în timp real (Three.js), carduri 3D, medalii 3D ale rangurilor, apariții la derulare, contoare, hartă stilizată; SEO (metadate, hreflang, sitemap, robots, date structurate, imagine Open Graph); antete de securitate (CSP).
- `packages/design-tokens`: identitatea provizorie „Neon Jungle” (Style Dictionary), cu test de contrast WCAG.
- Backend `waitlist`: dublă confirmare, email de bun venit, dezabonare cu ștergerea datelor, ștergerea înscrierilor neconfirmate, listă/statistici/export CSV pentru manager.
- Nota de informare GDPR pentru lista de așteptare (RO/EN), comanda `publish_legal_document` (refuză textele cu `DE_CONFIRMAT`).
- Teste cap-coadă Playwright + axe (`scripts/test-e2e`, inclus în `scripts/test-all`); Dockerfile pentru site.
#### Reparat la revizuire
- Performanța pe mobil (57 → 93): scena 3D doar cu accelerare grafică reală și după încărcare, 30 fps pe telefoane; fonturi reduse de la 207 KB la 58 KB; CSS inclus în pagină.
- `EMAIL_FILE_PATH` nu era citit din mediu.

### Etapa 1A — 27.09.2026 (aprobată 27.09.2026)
#### Adăugat
- `apps/backend`: Django 5.2 LTS + Django Ninja, API `/api/v1` cu schemă OpenAPI; erori cu coduri stabile.
- Conturi: înregistrare cu acorduri versionate (hash), verificarea emailului, resetarea parolei, schimbarea parolei, profil; conturi rapide pentru invitați (Q8); conturi de copii în spatele unui comutator (Q7).
- Personal: roluri pe acțiuni, globale sau pe locație; 2FA TOTP obligatorie cu coduri de recuperare și protecție la reutilizare; blocare temporară după încercări greșite; limită de înregistrări pe IP.
- Locații și resurse administrabile fără cod; dispozitive; date inițiale (`seed_initial`, `--demo`).
- Jurnal de audit, versiuni de configurare și acorduri: tabele doar-adăugare (trigger PostgreSQL).
- Feature flags și configurare versionată, cu lista valorilor `DE_CONFIRMAT`.
- Admin tehnic de urgență (doar Admin + 2FA, modificări auditate).
- `packages/i18n` (RO/EN, test de completitudine), `packages/api-client` (generat din OpenAPI).
- `scripts/test-all`, `scripts/setup`, `scripts/dev`, `scripts/generate-api-client`; Dockerfile, Docker Compose de dezvoltare, pre-commit, GitHub Actions.
- Întrebarea nouă Q43 (vârsta minimă pentru cont propriu).
#### Reparat la revizuire
- Link de resetare cu `uid` invalid → eroare 500; acum „link invalid”.
- Câmpul 2FA lipsea de pe pagina de login a adminului de urgență.

### Etapa 0 — 26.09.2026 (aprobată 26.09.2026, tag `etapa-0`)
#### Adăugat
- Structura monorepo din §4.4 (`apps/`, `packages/`, `services/`, `deploy/`, `scripts/`, `tests/`, `docs/`), cu README în fiecare folder.
- `MEGA_PROMPT.md` (neschimbat, referință istorică).
- Documentația împărțită pe secțiuni în `docs/` (text preluat integral, cu ID-urile regulilor păstrate).
- `CLAUDE.md` — memoria operațională a proiectului.
- ADR-0001 … ADR-0022 (decizii de stack și de arhitectură, stare „Propus”).
- Diagrame de arhitectură (Mermaid).
- `INTREBARI_DESCHISE.md` (Q1–Q42), `PROGRES.md`, `PLAN_DETALIAT.md`, `CALENDAR.md`.
- Criterii de achiziție hardware.
- `.gitignore`, `.editorconfig`, `.gitattributes`.
#### Modificat la aprobare
- Răspunsurile proprietarului înregistrate în `INTREBARI_DESCHISE.md` (stare nouă `PARȚIAL`).
- ADR-0001 … ADR-0022: stare „Acceptat”.
- Apple Wallet amânat (Q24); textele legale redactate fără avocat, cu mențiune obligatorie (Q41).
