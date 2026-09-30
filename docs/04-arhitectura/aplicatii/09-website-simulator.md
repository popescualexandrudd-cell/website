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
