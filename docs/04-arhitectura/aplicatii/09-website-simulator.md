# 9. WEBSITE-UL „SIMULATOR”

> **Sursa:** `MEGA_PROMPT.md` §9 (versiunea 1.0, 26.09.2026). Text preluat integral în Etapa 0, fără modificări de conținut.
> De acum, acest fișier este referința de lucru pentru această secțiune. Orice modificare ulterioară se notează aici, cu data și sursa („confirmat de proprietar la data X”); `MEGA_PROMPT.md` rămâne neschimbat, ca referință istorică.

## 9.1 Ideea (din videoul trimis de proprietar: DOAR INSPIRAȚIE, NU SE COPIAZĂ)
Proprietarul a trimis un video cu site-ul clubului lor de tenis (Clubul Tenis Elite), ca să arate **cum ar trebui să curgă** experiența, nu ce să copiezi. **Nu prelua textele, structura exactă, culorile (verde/lime), imaginile sau componentele.** Ce trebuie reținut ca IDEE:
- Site care **curge frumos în jos, pe secțiuni**, cu multă logică, ca o poveste la scroll.
- Un **hero cinematic** pe tot ecranul (video sau imagini de fundal, titlu mare, două butoane de acțiune) și tranziții de scroll cu text peste imagine.
- **Cifre animate** (contoare), **carduri de program** cu imagini, un **parcurs vizual pe etape** (în video: evoluția copilului pe vârste).
- Elementul central: un **simulator interactiv** („3 întrebări, pasul potrivit”): utilizatorul răspunde prin butoane-pastilă (pentru cine, vârstă, experiență, obiectiv), un element animat (mingea) reacționează, iar la final apare un **card de recomandare** personalizat, cu butoane de acțiune („Înscrie-te”, „Întreabă asistentul”) și „Încearcă din nou”.
- Un **asistent AI** în colțul ecranului, care știe ce a ales utilizatorul în simulator și continuă conversația, cu răspunsuri rapide pe butoane.
- **Formular de conversie** simplu (de exemplu ședințe gratuite de probă), program, **FAQ**, subsol complet.
- Header fix cu meniu, buton „Rezervă” mereu vizibil.

Pentru Jungle Padel, construiește o experiență **originală**, mai ambițioasă, cu identitate de junglă (secțiunea 12.4): mai multe simulatoare, date live, atmosferă nocturnă și luminoasă, premium, modernă.

## 9.2 Secțiunile paginii principale (propunere; se livrează ȘI se aprobă una câte una)
1. **Header fix**: logo, meniu (Padel · Liga · Tenis · Pilates · Pachete · Evenimente · Cafenea · Contact), selector de limbă, cont, buton „Rezervă”.
2. **Hero cinematic „Intră în junglă”**: video sau vizual al halei (plante, lumini), titlu, subtitlu, două acțiuni (Rezervă un teren · Vezi liga live), indicator de scroll.
3. **Turul clubului la scroll (simulator de tur)**: parcurgi clubul ca un vizitator: parcare → alee → recepție → terenuri → mezanin → cafenea → pilates → sala de evenimente, cu texte scurte care apar la scroll.
4. **„Acum în club” (live)**: starea terenurilor (liber/ocupat, fără date personale peste R-012), Meciul zilei, top 3 Regii Junglei, următorul eveniment.
5. **Padel (atracția principală)**: ce e padelul, de ce e ușor de început, terenurile, lecții cu antrenori, formate (Americano, Mexicano, King of the Court), acțiune: rezervă.
6. **Simulatorul „Care e nivelul tău?”**: întrebări pe pastile (experiență cu padel, tenis sau alte sporturi cu rachetă, frecvență, obiectiv), element animat (mingea de padel care ricoșează în pereții de sticlă), rezultat: nivel estimat 1.0–7.0 + recomandare (lecție de inițiere, meciuri deschise, ligă). Rezultatul poate precompleta chestionarul oficial, care rămâne de validat de antrenor (R-003).
7. **Liga Jungle**: explicația rangurilor pe o scară vizuală (Bronz → Diamant → Maestru → Regele Junglei), cum se câștigă LP, sezoane de 3 luni, minim de meciuri, recompense; **„Simulatorul de puncte”**: alegi nivelul tău și al adversarilor, rezultatul, și vezi câte LP câștigi sau pierzi (folosește exact formula din motorul ligii, prin API, nu o copie); previzualizare a clasamentului live și link către pagina completă a ligii.
8. **Tenis**: legătura cu Clubul Tenis Elite (Q20), prețuri, rezervare, lecții.
9. **Pilates Reformer**: tipurile de clase (R-101), program, instructor, rezervare, lista de așteptare.
10. **Configuratorul de pachete (simulator în 3 pași, R-081)**: alegi sporturile → intensitatea (4/8/12 sau „La cerere”) → perioada → prețul se actualizează live, cu reducerile vizibile și regula Start/vârf explicată clar.
11. **„Împarte ora” (simulator)**: alegi durata, banda orară și numărul de jucători și vezi prețul per persoană.
12. **Evenimente**: seri cu DJ, turnee, sala de evenimente (15–20 persoane), calendar.
13. **Cafeneaua de specialitate**.
14. **Comunitatea**: insigne, Hall of Fame, programul „Adu un prieten”.
15. **Echipa**: antrenori și instructor.
16. **Cifre** (contoare animate, doar cu date reale, după lansare).
17. **Locație și acces**: Șoseaua Biruinței, lângă Selgros Pantelimon; acces din două străzi; parcare 18 + 10 locuri; hartă fără dependență obligatorie de terți (hartă statică sau OpenStreetMap, cu link opțional spre aplicațiile de navigație).
18. **FAQ + Regulament** (inclusiv regulile de vârf, anulare, neprezentare, ligă).
19. **Subsol**: contact, program, rețele sociale, legal (termeni, GDPR, cookies), limbi.
- **Asistentul AI** plutitor, contextual (știe ce a ales utilizatorul în simulatoare și pe ce pagină e), multilingv (secțiunea 10).
- Parkourul: ascuns (feature flag), pregătit ca secțiune.

## 9.3 Pagini
`/` · `/padel` · `/liga` (clasamente complete pe Dublu/Simplu/Perechi, filtre pe rang, căutare, arhivă de sezoane, fișă publică a jucătorului doar cu câmpurile R-012, regulamentul ligii) · `/rezervari` · `/pachete` · `/tenis` · `/pilates` · `/evenimente` · `/cafenea` · `/corporate` · `/despre` · `/contact` · `/regulament` · `/gdpr` · `/cookies` · `/termeni` · `/blog` (SEO) · `/cont` (tablou personal: progres, rezervări, abonament, plăți, carduri, insigne, provocări, notificări, setări, confidențialitate, export și ștergere date).
Fiecare pagină există în toate limbile active, cu URL-uri localizate (`/ro/...`, `/en/...` etc.).

## 9.4 Reguli de UX, animație, performanță
- Animații la scroll fluide (de exemplu GSAP ScrollTrigger sau Framer Motion), cu varianta **„reduced motion”** complet funcțională.
- Performanță: Lighthouse ≥ 90 pe mobil la toate categoriile; LCP < 2,5 s; CLS < 0,1; imagini optimizate (AVIF/WebP), video comprimat, cu poster.
- Accesibilitate **WCAG 2.2 AA**: contrast, navigare din tastatură, texte alternative, focus vizibil.
- Mobil pe primul loc; PWA instalabilă (cont, rezervări, notificări push).
- Fiecare secțiune e o componentă separată, în fișierul ei, cu conținut din CMS (editabil din admin) și traduceri din catalog.
- Conținutul demo se marchează clar și nu inventează fapte (prețuri, cifre, recenzii) prezentate ca reale.

## Completări din Etapa 11 (alegeri făcute prin delegarea proprietarului din 29.09.2026)

### Secțiunea 6 — Simulatorul „Care e nivelul tău?” (30.09.2026)
- **Întrebările**, câte una, pe pastile:
  1. De cât timp joci padel (încă n-am jucat · sub un an · 1–3 ani · peste 3 ani).
  2. Ce descrie cel mai bine jocul tău (6 descrieri scurte, după [NIVELURI.md](../../03-liga/NIVELURI.md)).
  3. Turnee de padel (nu · de club · regionale sau naționale).
  4. Tenis sau alt sport cu rachetă (nu · din plăcere · la competiții).
  5. Cât de des joci (rar · de câteva ori pe lună · o dată pe săptămână · de mai multe ori pe săptămână).
  6. Ce îți dorești (să învăț · să joc cu alții · să intru în ligă).

  Cine n-a jucat încă padel răspunde doar la 1, 4 și 6.
- **Nivelul se calculează pe server** (`GET /api/v1/league/level-guess`, `jungle.league.level_guess`), cu formula chestionarului oficial (Q47). Răspunsurile devin răspunsurile chestionarului oficial (R-003):
  - **Treapta:** fiecare descriere acoperă două trepte (1.0/1.5, 2.0/2.5, 3.0/3.5, 4.0/4.5, 5.0/5.5; ultima, 6.0, e una singură). Se alege treapta de sus după cel puțin un an de padel jucat săptămânal sau mai des, altfel treapta de jos. Cine n-a jucat: treapta 1.0, fără turnee.
  - **Anii de padel:** capătul de jos al răspunsului (0, 0, 1, 3).
  - **Sportul cu rachetă și turneele:** trec neschimbate.

  Nu se păstrează nimic. Chestionarul oficial, precompletat din simulator, dă același nivel; antrenorul îl validează înainte de primul meci de ligă.
- **Recomandarea:**
  - un începător (n-a jucat sau are sub 2.0) începe cu o **lecție de inițiere**;
  - apoi, după obiectiv: **lecții cu antrenor** (să învăț), **meciuri deschise** (să joc cu alții) sau **Liga Jungle** (18+, chestionar validat, acord semnat la Chioșcul Ligii).
- **Precompletarea:** linkul „Continuă cu chestionarul oficial” duce la `/cont` cu `band`, `years_playing`, `racket_background` și `tournaments` în adresă. Pagina contului le va citi când va fi construită.
- **Mingea** ricoșează în pereții de sticlă la fiecare răspuns și aterizează, la rezultat, pe scara 1–7. Stă nemișcată la „mișcare redusă” și e decorativă: nivelul e scris și în text.

### Secțiunea 7 — Liga Jungle și simulatorul de puncte (30.09.2026)
- **Conținutul** vine din regulile ligii:
  - rangurile pe o scară care urcă, Bronz → Maestru → Regele Junglei (§6.5);
  - cum se câștigă LP (§6.6), plasarea (§6.4);
  - sezoanele și minimul de 12 meciuri (§6.10, §6.13, Q27);
  - premiile: Q6, răspunsul din 28.09.2026, și R-024.
- **Simulatorul de puncte** întreabă motorul ligii pe server (`GET /api/v1/league/lp-preview`, `jungle.league.lp_preview`), nu o copie a formulei. Folosește valorile sezonului în curs; înainte de primul sezon, setarea `league.config`.
  - **Ce alege vizitatorul:** cele patru niveluri (1.0–7.0, din jumătate în jumătate), rangul și LP-ul lui, rezultatul (câștig sau pierd), meciul (oficial sau de turneu).
  - **Ce primește:** LP-ul câștigat sau pierdut, șansa echipei lui, rangul înainte și după (promovare sau retrogradare) și rangul spre care îl duce liga în timp (rangul de plasare pentru nivelul lui, LG-061).
  - **Ce presupune:** un meci obișnuit de dublu, între jucători cu un sezon de meciuri (σ = 5 pentru toți, cât are un jucător după minimul de meciuri al unui sezon; `docs/03-liga/simulari/CALIBRARE.md`); meci terminat, nerepetat, fără protecția de după promovare.
  - Nu citește și nu salvează nimic despre vreun jucător.
- **Clasamentul live:** primii 5 din clasamentul de dublu al sezonului în curs, doar câmpurile publice (R-012), reîmprospătat la fiecare minut. Înainte de primul sezon, site-ul nu cere clasamentul serverului și spune când apare.

### Secțiunea 8 — Tenis (30.09.2026)
- Tenisul se joacă la **Clubul Tenis Elite**, al cărui site rămâne separat, cu legături reciproce (Q20). Adresa lui se pune din panou (`club.tennis_club_url`, public prin `GET /api/v1/config/links`, Q58); fără adresă, secțiunea nu are link. Răspunsul proprietarului la Q58 (30.09.2026): „nu avem adresa”; secțiunea rămâne fără link și fără promisiunea unuia.
- Faptele despre club sunt cele din §2.3: din 2013, 8 terenuri de zgură, 4 acoperite iarna, programe pentru copii și adulți. Numărul de recenzii nu apare: se schimbă.
- Legătura cu Jungle: lecțiile de tenis (R-090), abonamentele combinate (R-080) și Reformer pentru jucători (R-101).
- **Fără prețuri și fără program de terenuri:** acestea sunt ale clubului de tenis, pe site-ul lui. Terenul de tenis de pe amplasamentul Jungle e încă nedecis (§2.2) și nu apare.

### Secțiunea 9 — Pilates Reformer (30.09.2026)
- **Studioul în fapte:** 4 aparate Reformer, cu loc de creștere la 6 (R-100, Q46); grupuri de cel mult câte aparate sunt (R-101); instructorul clubului, cu programul și prezențele în sistem (R-103, R-032); în clădirea de alături, peste alee (schița proprietarului).
- **Desenul aparatelor** e generic și marcat ilustrativ, nu planul studioului (Q44).
- **Clasele:** cele 8 tipuri din R-101, fiecare cu o descriere scurtă a formatului, fără durate, prețuri sau promisiuni de rezultat.
- **Lista de așteptare și anulările:** R-102.
- **Programul săptămânii** vine live din `GET /api/v1/classes`: ordonat după oră, cu `limit`, reîmprospătat la 5 minute.
  - Se grupează pe zilele clubului (Europe/Bucharest), inclusiv în ziua trecerii la ora de vară.
  - Fiecare clasă arată ora, tipul, prenumele instructorului și locurile libere sau „Plin · listă de așteptare”.
  - Fără prețuri, ca la Padel: prețurile orientative apar în configuratorul de pachete și la rezervare.

### Secțiunea 10 — Configuratorul de pachete (30.09.2026)
- **Cei trei pași (R-081):** sporturile (padel, tenis, pilates; cel puțin unul), intensitatea fiecăruia (Start 4, Activ 8, Pro 12 sesiuni pe lună), perioada (lunar, trimestrial, anual).
- **Oferta și fiecare preț vin de la server:** `GET /api/v1/subscriptions/options` (intensitățile, reducerile, tarifele lunare) și `POST /api/v1/subscriptions/quote` (reducerile de pachet și de perioadă, una după alta, rotunjirea la leu întreg, R-084). Site-ul nu calculează nimic.
- **„Preț orientativ”** cât un tarif e DE_STABILIT (Q21). Regula Start e explicată (R-087, Q13: vârful 17–22 exclus).
- **Sub configurator:**
  - ce e o sesiune (R-083);
  - fără report (R-085);
  - înghețarea (R-086);
  - „La cerere”: la recepție, cu prețul clubului; sub 8 sesiuni pe lună, regula Start (Q12, confirmat de proprietar pe 30.09.2026);
  - unde se cumpără: la Chioșcul de Plăți, cu numerar (R-089, Q9);
  - pachetul de firmă (R-088, Q35).
- **Pe telefon,** rezultatul vine după cei trei pași. Nimic nu stă fixat peste controale.

### Secțiunea 11 — „Împarte ora” (30.09.2026)
- **Ce alege vizitatorul:** banda orară (vârf, semi-vârf, în afara vârfului), durata (duratele de rezervare permise, R-041) și câți plătesc (4, 3, 2 sau 1, adică organizatorul plătește tot).
- **Ce calculează serverul** (`GET /api/v1/pricing/{locație}/split`, `jungle.pricing.split`):
  - prețul terenului de padel la tariful clubului: închiriere, sezonul curent, client standard (R-051);
  - partea fiecăruia, cu aceeași funcție ca la Chioșcul de Plăți (R-061: în bani întregi, primul jucător plătește restul);
  - orele benzii din setări, în programul clubului (R-050, Q3).
- **Nu rezervă, nu încasează și nu salvează nimic.** Prețul e „orientativ” cât tariful e DE_STABILIT (Q21).
- **Sub simulator:** plata la Chioșcul de Plăți, fiecare cu cardul lui (R-060, Q9); fără credite la padel (invariantul 14); rezervarea online se plătește la club (R-063).

### Secțiunea 12 — Evenimente (30.09.2026)
- **Trei tipuri de evenimente (R-110):** serile cu DJ, turneele ligii (tablou, program și rezultate live, §6.14; înscrierea din cont sau la recepție, doar pentru jucătorii din ligă) și padelul social (Americano, Mexicano).
- **Calendarul clubului** (`GET /api/v1/events/calendar?location=…`, `jungle.events`):
  - evenimentele publicate din panou (Evenimente → „Calendarul public”): titlu și descriere scurtă în română și engleză (R-140), ziua și orele clubului, cel mult 24 de ore;
  - turneele ligii cu înscrieri deschise sau în desfășurare, cu formatul și locurile libere; nu se copiază nimic din ligă, se citesc la cerere;
  - în ordinea orei, cel mult 30, pe următoarele 4 luni;
  - un eveniment anulat rămâne pe site, marcat „Anulat”, până la ora lui de sfârșit, ca să nu vină nimeni degeaba;
  - datele demo (`seed_initial --demo`) apar marcate „Exemplu (demo)” (invariantul 12).
- **Un eveniment din calendar nu rezervă nimic:** terenurile sau sala se rezervă separat, din Calendar.
- **Sala de evenimente:** câte persoane primește și prețul pe oră (cea mai ieftină bandă a sezonului, „orientativ” cât tariful e DE_STABILIT, Q21), din date; în clădirea de alături, cu studioul de pilates (Q46); încălzită și răcită (§1). Cererea se face online, din cont, sau telefonic, iar pachetele, prețurile și rezervarea le confirmă un manager (Q34, confirmat de proprietar pe 30.09.2026); butonul „Sună la club” apare când telefonul e completat în datele firmei.
- **Randată pe server:** secțiunea nu trimite niciun script în browser. Datele se păstrează 5 minute; la orice schimbare vizibilă din panou, serverul cere site-ului reîmprospătarea (eticheta de cache `events`).

### Secțiunea 13 — Cafeneaua de specialitate (30.09.2026)
- **Unde:** la parter, împreună cu recepția și vestiarele, cu scară spre pasarela-lounge (planul proprietarului, Q46).
- **Cum se comandă (R-111, Q9):** la Chioșcul de Plăți, cu plata în numerar; bonul are numărul comenzii, comanda ajunge pe afișajul barului, iar numărul apare pe ecranul din lobby când e gata.
- **Meniul** (`GET /api/v1/cafe/menu?location=…`): exact cel din panou, doar produsele disponibile acum (R-112), pe categorii, cu prețul fiecăruia; „Prețuri orientative” cât un preț e DE_STABILIT (Q21).
- **Randată pe server,** fără script în browser. Meniul se păstrează 5 minute; la orice schimbare din panou (categorie sau produs), serverul cere site-ului reîmprospătarea (eticheta de cache `cafe`).

### Secțiunile 14–19 (30.09.2026, construite în Faza 3 a efectelor, ADR-0023)
Toate șase sunt randate pe server (fără script nou în browser), cu atributele efectelor (`data-reveal`, `data-tilt`, `data-count`) din prima zi.
- **14 — Comunitatea:**
  - cele 7 insigne ale ligii (§6.15), explicate pe scurt; insignele fiecărui jucător se văd doar în contul lui (R-012);
  - **Hall of Fame** din `GET /api/v1/league/hall-of-fame` (`src/lib/fame.ts`, 5 minute): câștigătorii fiecărui sezon încheiat, doar nume, rang și loc (LG-134); înainte de primul sezon încheiat: „Primii câștigători apar aici la finalul primului sezon.”;
  - **„Adu un prieten”** (R-120): câte o oră gratuită pentru amândoi, după prima plată a abonamentului prietenului.
- **15 — Echipa:** rolurile (antrenorii de padel cu lecțiile și validarea nivelului, R-003; instructorul de Reformer, R-101; recepția), apoi câte doi antrenori pentru padel, tenis și Pilates Reformer, cu nume fictive marcate „Nume fictiv” (Q65, decizia proprietarului din 30.09.2026; `apps/web/src/lib/team.ts`), fără fotografii până la echipa reală.
- **16 — Clubul în cifre:** doar cifrele de proiect din `docs/` (4 terenuri, pasarela la 3 m, 4 aparate Reformer cu loc pentru 6, sala de 20 de persoane, 28 de locuri de parcare, sezonul de 3 luni); numără în sus la apariție și se oprește mereu pe textul serverului. Cifrele din joc (meciuri, jucători) vin după deschidere, doar din date reale.
- **17 — Locație și acces:** adresa, accesul din două străzi, parcarea 18 + 10, planul clubului (schemă fără scară), OpenStreetMap și, opțional, Waze sau Google Maps. Doar linkuri, fără hartă încorporată și fără script de la terți.
- **18 — Întrebări frecvente:** 8 întrebări cu regulile pe scurt (programul și vârful, Q3; duratele, R-041, R-042; anularea, R-070, R-071; neprezentarea, R-072, R-073; plata în numerar, Q9, R-063; fără credite la padel, invariantul 14; cine intră în ligă, R-006; unde se introduc scorurile, invariantele 1 și 2), în `<details>` care se deschid fără cod; linkul spre Termeni și condiții.
- **19 — Subsolul:** pe site-ul complet, subsolul primește paginile clubului, programul (08:00–23:00) și limbile; datele firmei, paginile legale și ANPC SAL rămân neschimbate. Rețelele sociale apar când proprietarul are conturile.
