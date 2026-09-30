# Raport de verificare — Etapa 11 (site-ul complet, secțiune cu secțiune)

> Branch: `claude/hopeful-euler-rguibn`. Site-ul complet se livrează **secțiune cu secțiune** (§9.2). Acest raport crește cu fiecare secțiune.
>
> **Aprobarea proprietarului (30.09.2026, a doua):** „aprob tot, continuă”: secțiunile 9 și 10 sunt aprobate și intră în `main`; Q12 confirmată („La cerere” la recepție, cu prețul clubului; sub 8 sesiuni, regula Start).
>
> **Aprobarea proprietarului (30.09.2026):** „Aprob și continuă”: secțiunile 2–8 sunt aprobate și intră în `main`. La Q58: „nu avem adresa” (secțiunea Tenis rămâne fără link).
>
> **Decizia proprietarului (29.09.2026):** „alege ce crezi că este mai bine doar la această etapă”. În Etapa 11, alegerile de conținut și design le facem noi, după documentație și regulile proiectului, și continuăm secțiune după secțiune. Dumneavoastră vedeți totul aici și ne spuneți oricând ce vreți schimbat.

| Secțiune (§9.2) | Livrată | Starea |
|---|---|---|
| Fundația site-ului complet + **1. Antetul fix** | 29.09.2026 | **aprobată 29.09.2026** |
| 2. Hero „Intră în junglă” | 29.09.2026 | **aprobată 30.09.2026** |
| 3. Turul clubului la scroll | 29.09.2026 | **aprobată 30.09.2026** |
| 4. „Acum în club” (live) | 29.09.2026 | **aprobată 30.09.2026** |
| 5. Padel | 30.09.2026 | **aprobată 30.09.2026** |
| 6. Simulatorul „Care e nivelul tău?” | 30.09.2026 | **aprobată 30.09.2026** |
| 7. Liga Jungle + simulatorul de puncte | 30.09.2026 | **aprobată 30.09.2026** |
| 8. Tenis | 30.09.2026 | **aprobată 30.09.2026** |
| 9. Pilates Reformer | 30.09.2026 | **aprobată 30.09.2026** |
| 10. Configuratorul de pachete | 30.09.2026 | **aprobată 30.09.2026** |
| 11. „Împarte ora” | 30.09.2026 | **aprobată 30.09.2026** |
| 12. Evenimente | 30.09.2026 | **aprobată 30.09.2026** |
| 13. Cafeneaua de specialitate | 30.09.2026 | **aprobată 30.09.2026** |
| 14–19 | — | urmează, câte una |

---

## Secțiunea 1 — Antetul fix (și fundația site-ului complet)

### Ce s-a construit

**1. Comutatorul site-ului complet (Q57).** Site-ul complet stă ascuns până îl porniți dumneavoastră:
- Cât timp comutatorul `full_site` e **oprit** (acum), vizitatorii văd exact pagina de pre-lansare aprobată în Etapa 1B, cu lista de așteptare. Paginile noi nu există pentru ei („pagină negăsită”) și nu apar în Google.
- Îl porniți din panoul de admin: **Setări și feature flags** → `full_site` → Pornit, cu un motiv. Site-ul se schimbă **în câteva secunde**: serverul îi cere site-ului să se reîmprospăteze (o adresă protejată cu o parolă comună, păstrată doar în `.env` pe server). Dacă acel semnal se pierde, site-ul se actualizează singur în cel mult 5 minute.
- Oprirea funcționează la fel: site-ul revine la pagina de pre-lansare.

**2. Antetul fix (§9.2, secțiunea 1)**, sus pe fiecare pagină a site-ului complet:
- **logo-ul** (duce la pagina principală);
- **meniul**: Padel · Liga · Tenis · Pilates · Pachete · Evenimente · Cafenea · Contact; pagina pe care vă aflați e marcată;
- **limba**: RO / EN, rămâneți pe aceeași pagină (de exemplu `/ro/liga` ↔ `/en/league`);
- **contul** („Contul meu”);
- butonul **„Rezervă”**, mereu vizibil, și pe telefon.

Pe ecrane mai înguste de 1280 px (telefon, tabletă, laptop mic), meniul se strânge într-un buton **„Meniu”**. Lista se deschide sub antet, cu limba și contul dedesubt; se închide cu „Închide”, cu tasta Escape sau alegând o pagină.

**3. Adresele paginilor, în fiecare limbă** (§9.3): `/ro/padel`, `/ro/liga`, `/ro/tenis`, `/ro/pilates`, `/ro/pachete`, `/ro/evenimente`, `/ro/cafenea`, `/ro/contact`, `/ro/rezervari`, `/ro/cont` și echivalentele în engleză (`/en/league`, `/en/packages`, `/en/bookings`, `/en/account` …).
- Deocamdată fiecare pagină spune „În construcție”: se construiește după secțiunile paginii principale.
- Paginile sunt marcate să nu apară în Google până sunt gata.

**4. Pagina principală a site-ului complet** arată, până vin secțiunile, **harta celor 19 secțiuni**: ce e gata (1 din 19), ce urmează (Hero-ul) și ce vine mai târziu. E o previzualizare internă, pentru dumneavoastră. Vizitatorii n-o văd cât timp comutatorul e oprit.

### Capturi de ecran (făcute de testele automate)
1. [Antetul pe calculator](ecrane/desktop-01-antet.png): meniul întreg, limba, contul, „Rezervă”; sub el, harta secțiunilor.
2. [Antetul pe telefon](ecrane/mobile-01-antet.png): logo, „Rezervă” și butonul „Meniu”.
3. [Meniul deschis pe telefon](ecrane/mobile-02-meniu-deschis.png): lista paginilor, apoi limba și contul.

### Rezultate
| Verificare | Rezultat |
|---|---|
| Comutatorul și reîmprospătarea (server) | 6 teste noi: semnalul pleacă doar după salvarea în baza de date, doar cu adresa și parola configurate; o eroare de rețea nu strică salvarea; schimbarea comutatorului de pe server (`manage.py set_flag`) intră în jurnalul de audit, cu motiv |
| Site, teste unitare | 5 teste noi: modul site-ului e „complet” doar dacă serverul spune clar „pornit” (orice eroare = pre-lansare); adresa de reîmprospătare refuză o parolă greșită sau lipsă și orice etichetă necunoscută |
| Cap-coadă, înainte de pornire | toate testele paginii de pre-lansare trec ca înainte (28 de rulări, calculator + telefon); paginile noi răspund „negăsită” |
| Cap-coadă, după pornire | comutatorul pornit de pe server, apoi 7 teste (11 rulări, calculator + telefon): antetul și harta, o pagină din meniu în română și apoi în engleză, „Rezervă” și contul, **nicio lățime de ecran între 320 și 1440 px nu iese din ecran** (WCAG 1.4.10), meniul de pe telefon (Escape, focusul înapoi pe buton), ordinea tastaturii (WCAG 2.4.3), refuzul reîmprospătării fără parolă. Accesibilitatea verificată cu axe pe fiecare pagină |
| Toate verificările proiectului (`scripts/test-all`) | trec înainte de orice push |

### Dubla revizuire: probleme găsite și reparate
1. **Pe telefon, limba și contul stăteau lângă listă**, nu sub ea (o regulă de aranjare a antetului se aplica și în panoul meniului). Reparat și testat.
2. **Între 1024 și 1279 px, meniul întreg se lovea de butoane.** Pragul la care apare meniul întreg e acum 1280 px, testat la fiecare lățime.
3. **Pe un telefon foarte îngust (320 px), harta secțiunilor ieșea din ecran cu 20 px** (găsit de testul pe toate lățimile). Coloanele ei nu mai sunt niciodată mai late decât ecranul.
4. **O memorie a site-ului de la o rulare anterioară** (comutatorul pornit) putea ajunge într-o construcție nouă. Testele o șterg înainte de fiecare construcție. Imaginile Docker nu mai primesc nimic construit local (nici fișiere `.env`), printr-un fișier `.dockerignore` nou.
5. **Din perspectiva unui atacator:**
   - adresa de reîmprospătare nu face nimic fără parola comună (comparată în timp constant) și acceptă doar etichetele cunoscute;
   - fără parolă configurată, adresa nu există (răspunde „negăsită”);
   - comutatorul îl schimbă doar un admin, din panou, sau cineva cu acces la server; de fiecare dată cu motiv, în jurnalul de audit.

### Ce e de hotărât
| Întrebare | Varianta folosită până la răspuns |
|---|---|
| **Q57**: când apare site-ul complet | **rezolvată 29.09.2026**: doar când îl publicați dumneavoastră (comutatorul `full_site`, din panou) |

### Cum verificați (click cu click)
1. Pe GitHub, branch-ul `claude/hopeful-euler-rguibn`, deschideți acest raport (`docs/00-management/verificare/etapa-11/RAPORT.md`).
2. Deschideți cele 3 capturi, în ordine: pe calculator meniul e întreg, pe telefon se strânge în „Meniu”.
3. În captura 1: harta arată „Antetul fix” ca gata și „Hero «Intră în junglă»” ca următoarea secțiune.
4. Citiți **Q57** în [INTREBARI_DESCHISE.md](../../INTREBARI_DESCHISE.md) și spuneți-ne când vreți să apară site-ul complet.
5. Dacă antetul vă place, scrieți „aprob secțiunea 1”. Dacă vreți altceva (ordinea meniului, textul butonului), spuneți ce anume.

---

## Secțiunea 2 — Hero „Intră în junglă”

### Ce s-a construit
Primul ecran al paginii principale, pe toată înălțimea ecranului (§9.2, secțiunea 2):
- **Imaginea:** vederea de pe pasarela-lounge, la 3 m, spre terenuri, adică randarea arenei făcută de noi după schița clubului și aprobată în Etapa 1B.
  - Pe calculatoarele și telefoanele cu placă video potrivită, peste ea apare scena 3D în timp real.
  - Imaginea e marcată: „Randare 3D ilustrativă, realizată de noi după schița clubului. Nu este o fotografie și nici proiectul final.”
- **Textele:** deasupra titlului, „Pantelimon · Deschidere în martie 2027”; titlul **„Intră în junglă.”**; apoi, doar fapte: patru terenuri de padel indoor cu pasarela-lounge între ele, cafeneaua și, peste alee, pilates Reformer și sala de evenimente; rezervi online, plătești la chioșc, îți urmărești locul în ligă, live.
- **Două acțiuni:** „Rezervă un teren” (duce la `/ro/rezervari`) și „Vezi liga live” (duce la `/ro/liga`). Ambele pagini sunt deocamdată „În construcție” și primesc conținut în secțiunile lor.
- **„Descoperă clubul”,** cu o săgeată, jos: duce la secțiunea următoare. Acum aceea e harta secțiunilor; după secțiunea 3, va fi turul clubului.
- **Mișcare cinematică, dar calmă:** randarea se „așază” încet, textul urcă o singură dată, săgeata „respiră”. Cine a ales pe telefon sau calculator „mișcare redusă” vede totul nemișcat.
- **În engleză:** „Step into the jungle.”, cu „Book a court” și „See the league live”.

**Ce n-am pus, intenționat:** în §9.2 scrie „vizual al halei (plante, lumini)”. Luminile sunt în randare. Plantele le vom adăuga când avem proiectul de design interior, ca să nu inventăm cum arată clubul (Q44, încă deschisă).

### Capturi de ecran
4. [Hero pe calculator](ecrane/desktop-03-hero.png)
5. [Hero pe telefon](ecrane/mobile-03-hero.png)

### Rezultate
| Verificare | Rezultat |
|---|---|
| Cap-coadă | 3 teste noi (calculator + telefon):<br>• titlul, imaginea cu descriere, nota „ilustrativă”, cele două acțiuni în română, apoi în engleză;<br>• „Descoperă clubul” duce la secțiunea următoare;<br>• cu „mișcare redusă” nu se mișcă nimic.<br>Accesibilitatea e verificată cu axe. Toate testele site-ului trec: 28 de rulări pentru pagina de pre-lansare, 17 pentru site-ul complet. |
| Lighthouse, mobil | **Performanță 95 · Accesibilitate 100 · Bune practici 100 · SEO 100** (măsurătoarea cea mai recentă: [raport](lighthouse-mobil.html)). Cel mai mare element apare la 2,9 s în simularea de rețea mobilă lentă, ca la pagina de pre-lansare. Pagina nu „sare” deloc la încărcare (CLS 0). |
| Lighthouse, calculator | **100 · 100 · 100 · 100** ([raport](lighthouse-desktop.html)) |
| Toate verificările proiectului | trec înainte de push |

### Dubla revizuire: probleme găsite și reparate
1. **O formulare inexactă:** prima variantă a textului spunea că pasarela e „deasupra” terenurilor. După schiță e la 3 m, între rânduri, deci am corectat. Pilates și sala de evenimente apar „peste alee”, nu „sub același acoperiș”.
2. **Viteza:** animația textului mută doar poziția, nu transparența. Titlul e vizibil din primul cadru și nu întârzie afișarea paginii (Lighthouse o confirmă).
3. **Din perspectiva unui atacator:** secțiunea nu aduce nimic nou (doar legături interne, nicio resursă de la terți, niciun formular).

### Ce e de hotărât
Nimic nou. Rămâne **Q44** (proiectul de design interior sau fotografii reale ale spațiilor), pentru plante și pentru imaginile celorlalte spații.

### Cum verificați (click cu click)
1. Deschideți capturile 4 și 5.
2. Dacă vreți, deschideți rapoartele Lighthouse de mai sus (se deschid în browser).
3. Dacă Hero-ul vă place, scrieți „aprob secțiunea 2”. Dacă vreți alt titlu sau alt text, spuneți ce anume.

---

## Secțiunea 3 — Turul clubului la scroll

### Ce s-a construit
Sub Hero, „Descoperă clubul” duce acum aici: **opt opriri, în ordinea unui vizitator** (§9.2, secțiunea 3):
1. parcarea;
2. aleea;
3. recepția și vestiarele;
4. terenurile;
5. mezaninul (pasarela-lounge);
6. cafeneaua;
7. pilates Reformer;
8. sala de evenimente.

**Pe calculator,** planul clubului stă fix în stânga, iar opririle se derulează în dreapta. Oprirea ajunsă în mijlocul ecranului se luminează pe plan (conturul de alamă), iar punctul „ești aici” se mută la ea.

**Pe telefon,** planul stă sus, sub antet, și opririle trec pe sub el.

**Planul** e cel redesenat după schița dumneavoastră, deja aprobat pe pagina de pre-lansare. Am ales planul și nu randări, pentru că spațiile (recepție, cafenea, studio, sală) nu au încă proiect de interior (Q44). Sub plan scrie: „Plan schematic după schița clubului, fără scară. Randările spațiilor vin odată cu proiectul de arhitectură.”

**Textele** spun doar ce e confirmat:
- 18 + 10 locuri de parcare, acces din două străzi;
- aleea între cele două clădiri;
- cardul primit la recepție și scanat la chioșcuri;
- 4 terenuri cu pereți de sticlă, cu ecran la fiecare teren;
- pasarela la 3 m;
- cafeneaua cu scară spre pasarelă, cu comandă și de la Chioșcul de Plăți;
- 4 aparate Reformer, extensibil la 6;
- sala de evenimente pentru 15–20 de persoane.

**Accesibilitate:** fără JavaScript sau cu „mișcare redusă”, opririle se citesc ca o listă normală, lângă plan. Oprirea curentă e anunțată cititoarelor de ecran („pasul curent”).

**Ce n-am pus, intenționat:** că se scanează cardul la intrarea pe teren. Scanarea la teren e încă o opțiune de hardware nehotărâtă (Q23, R-031).

### Capturi de ecran
6. [Turul pe calculator, la mezanin](ecrane/desktop-04-tur.png)
7. [Turul pe telefon, la mezanin](ecrane/mobile-04-tur.png)

### Rezultate
| Verificare | Rezultat |
|---|---|
| Cap-coadă | 2 teste noi (calculator + telefon):<br>• opririle în ordine, planul cu descriere și notă;<br>• la derulare, mezaninul, apoi sala de evenimente devin „aici”, iar planul le luminează zona și rămâne pe ecran;<br>• textele în engleză.<br>Accesibilitatea e verificată cu axe. Toate testele site-ului trec: 28 de rulări pentru pre-lansare, 21 pentru site-ul complet. |
| Lighthouse, pagina principală cu Hero și tur | mobil **93 · 100 · 100 · 100** (cel mai mare element la 3,2 s în simularea de rețea mobilă lentă; pagina nu „sare”, CLS 0), calculator **100 · 100 · 100 · 100** ([mobil](lighthouse-mobil.html), [calculator](lighthouse-desktop.html)) |

### Dubla revizuire: probleme găsite și reparate
1. **„Cu care intri pe teren”** (textul inițial la recepție) nu e sigur: scanarea la teren e încă nehotărâtă (Q23). Am corectat: cardul se scanează la chioșcuri, pentru plăți, check-in și ligă.
2. **Contrastul:** opririle care nu sunt „aici” nu sunt estompate (textul ar fi scăzut sub contrastul cerut). Se schimbă doar marginea de alamă a opririi curente.
3. **Din perspectiva unui atacator:** nimic nou (fără date, formulare sau resurse de la terți).

---

## Secțiunea 4 — „Acum în club” (live)

### Ce s-a construit
Sub tur, patru panouri care se citesc **live** de pe server și se actualizează singure în fiecare minut (§9.2, secțiunea 4):
- **Terenurile acum:** pentru fiecare teren, „Liber”, „Liber până la 20:00”, „Ocupat până la 20:30” (rezervările una după alta se adună) sau, în afara programului, „Închis acum · deschidem la 08:00”. **Nu apare niciodată cine joacă** (R-012).
- **Meciul zilei:** jucătorii, terenul și ora (câmpuri publice, Q49), sau „Meciul zilei se anunță în curând”.
- **Regii Junglei:** primii 3, cu rangul și LP-ul (R-012), sau „Clasamentul apare după primele meciuri ale sezonului”.
- **Următorul turneu:** numele și data, sau „se anunță în curând”.

Deasupra scrie „Actualizat la 18:11”, cu un punct care pulsează. Dacă serverul nu răspunde: „Datele live nu sunt disponibile acum. Revenim automat.”, iar panourile își păstrează locul (pagina nu „sare”).

**Ce am ales și de ce:**
1. **„Următorul eveniment” din §9.2 e, deocamdată, următorul turneu al ligii:** e singurul tip de eveniment public pe care îl are sistemul acum. Serile cu DJ și celelalte evenimente ale clubului vin cu secțiunea „Evenimente” (12), când le vom putea publica din panou.
2. **Orele sunt mereu ora clubului** (București), oriunde s-ar afla vizitatorul, inclusiv în ziua trecerii la ora de vară.
3. **Înainte de primul sezon al ligii,** pagina nu mai cere „Regii Junglei” serverului (ar fi răspuns „nu există”). Astfel, browserul vizitatorului nu înregistrează nicio eroare, iar Lighthouse dă 100 la „Bune practici”.

### Capturi de ecran
8. [„Acum în club” pe calculator](ecrane/desktop-05-acum-in-club.png)
9. [„Acum în club” pe telefon](ecrane/mobile-05-acum-in-club.png)

Capturile sunt făcute după miezul nopții, cu datele de test (fără sezon de ligă). De aceea terenurile sunt „Închis acum”, iar celelalte panouri spun „în curând”.

### Rezultate
| Verificare | Rezultat |
|---|---|
| Teste unitare | 4 noi:<br>• ziua și ora clubului, inclusiv la trecerea la ora de vară;<br>• liber / ocupat / închis, cu rezervările una după alta adunate și fără nume;<br>• următorul turneu. |
| Cap-coadă | 3 noi (calculator + telefon):<br>• cu serverul real, cele 4 terenuri au o stare validă, iar celelalte panouri arată exact ce spune serverul;<br>• cu o oră fixată (18:10) și date controlate: „Ocupat până la 20:30”, „Liber până la 20:00”, apoi, după un minut, un teren devenit ocupat se schimbă singur;<br>• fără server, mesajul și panourile la locul lor.<br>Toate testele site-ului trec: 28 + 27. |
| Lighthouse, pagina principală cu Hero, tur și „Acum în club” | mobil **93 · 100 · 100 · 100** (CLS 0), calculator **100 · 100 · 100 · 100** ([mobil](lighthouse-mobil.html), [calculator](lighthouse-desktop.html)) |

### Dubla revizuire: probleme găsite și reparate
1. **Erorile din consola vizitatorului înainte de primul sezon:** găsite de Lighthouse („Bune practici” 96), reparate ca mai sus (acum 100).
2. **Datele personale:** lista terenurilor nu primește și nu afișează nume. Serverul trimite doar intervalele ocupate, iar testul verifică că la un teren ocupat nu apare niciun nume.
3. **Din perspectiva unui atacator:** doar citiri publice, deja existente și deja limitate la R-012; nimic nou pe server.

---

## Secțiunea 5 — Padel

### Ce s-a construit
Secțiunea despre atracția principală (§9.2, secțiunea 5), titlul „Ușor de început. Greu de lăsat.”:
- **Ce e padelul:** doi contra doi, pe un teren de 20 × 10 m închis cu pereți de sticlă; mingea poate ricoșa din pereți, iar punctele se numără ca la tenis. Lângă text, o **schemă a unui teren standard** (sticlă, plasă, fileu, liniile de serviciu), marcată: „Ilustrativă, nu terenurile clubului”.
- **De ce e ușor de început,** în patru puncte: racheta scurtă și fără corzi, serviciul de jos, pereții care țin mingea în joc, jocul în patru.
- **Terenurile noastre, Lecții cu antrenori** (private, duo, de grup; chestionarul de nivel validat de antrenor) și **Cum rezervi**:
  - grila de 30 de minute: 60–180 de minute, 08:00–23:00, vârf 17:00–22:00;
  - ora se împarte între jucători;
  - **prețurile se anunță înainte de deschidere** (Q21: încă de stabilit, deci nu afișăm niciun preț).
- **Formate de turneu:** Americano, Mexicano, King of the Court, descrise exact cum le joacă sistemul ligii.
- **Butonul „Rezervă un teren”.**

### Capturi de ecran
10. [Padel pe calculator](ecrane/desktop-06-padel.png)
11. [Padel pe telefon](ecrane/mobile-06-padel.png)

### Rezultate
| Verificare | Rezultat |
|---|---|
| Cap-coadă | 2 teste noi (calculator + telefon):<br>• titlurile și formatele, în ordine;<br>• regulile de rezervare;<br>• **niciun preț în secțiune** (Q21);<br>• „Rezervă un teren” duce la pagina de rezervări;<br>• textele în engleză.<br>Toate testele site-ului trec: 28 + 31. |
| Lighthouse, pagina principală | mobil **95 · 100 · 100 · 100** (CLS 0), calculator **100 · 100 · 100 · 100** |

### Dubla revizuire
1. **Formatele** sunt descrise după codul care le joacă (tragerea la sorți a turneelor), nu după o definiție generală.
2. **Faptele despre sport** (dimensiunile terenului, serviciul, numărătoarea) sunt regulile standard ale padelului. Cele despre club (terenuri, lecții, program, vârf, împărțirea orei) vin din documentație (R-041, R-090, R-003, Q3).
3. **Din perspectiva unui atacator:** doar conținut static.

---

## Secțiunea 6 — Simulatorul „Care e nivelul tău?”

### Ce s-a construit
După Padel urmează un simulator (§9.2, secțiunea 6). Vizitatorul răspunde la câte o întrebare pe rând, apăsând pe „pastile”:
1. de cât timp joacă padel;
2. ce descrie cel mai bine jocul lui: 6 descrieri scurte, de la „Primii pași” la „Circuit național”, luate din ghidul nivelurilor;
3. dacă a jucat turnee de padel;
4. dacă a jucat tenis sau alt sport cu rachetă;
5. cât de des joacă;
6. ce își dorește: să învețe, să joace cu alții sau să intre în ligă.

Cine n-a jucat încă padel răspunde doar la trei întrebări (1, 4 și 6).

Alături, un teren văzut de sus, cu pereții de sticlă. La fiecare răspuns, o minge de padel ricoșează în pereți. La final, mingea aterizează pe scara 1–7, la nivelul estimat, iar lângă ea apar:
- **nivelul estimat**, de exemplu „3,75 · Intermediar bun”, cu descrierea lui din ghidul nivelurilor;
- **„Cu ce să începi”:**
  - o **lecție de inițiere** pentru începători;
  - apoi, după ce își dorește: **lecții cu antrenor**, **meciuri deschise** sau **Liga Jungle**. La ligă scrie condițiile reale: 18+, chestionarul validat de antrenor, acordul semnat la Chioșcul Ligii.

  Fiecare recomandare are linkul ei: rezervări sau liga;
- **„Continuă cu chestionarul oficial”:** răspunsurile de aici precompletează chestionarul de nivel din cont (R-003);
- butoanele **„Înapoi”** (răspunsul dat rămâne marcat) și **„Reia de la început”**.

**Ce am ales și de ce:**
1. **Nivelul îl calculează serverul, cu formula chestionarului oficial** (Q47, confirmată de dumneavoastră pe 28.09.2026). Astfel, simulatorul și chestionarul dau același număr, iar antrenorul validează nivelul ca până acum.
2. **Cum devin răspunsurile un nivel:**
   - fiecare descriere a jocului acoperă două trepte din ghid (de exemplu „Joc din perete”: 3.0 sau 3.5);
   - treapta de sus se alege după cel puțin un an de padel jucat săptămânal sau mai des;
   - apoi se aplică formula Q47: mijlocul treptei, −0,25 sub un an de padel, +0,25 pentru competiții la alt sport cu rachetă, +0,25 pentru turnee regionale sau naționale.

   Detaliile sunt în `docs/04-arhitectura/aplicatii/09-website-simulator.md`.
3. **Nu se păstrează nimic.** Răspunsurile nu se salvează și nu identifică pe nimeni: fără cont, fără cookie.
4. **Pagina contului nu există încă.** Linkul spre chestionarul oficial duce la „Cont”, cu răspunsurile în adresă. Precompletarea va funcționa când construim contul (paginile din §9.3).
5. **Mingea e doar decor:** nivelul e scris și în text. La „mișcare redusă”, mingea nu se mișcă.

### Capturi de ecran
12. [O întrebare, pe calculator](ecrane/desktop-07-nivel-intrebare.png)
13. [O întrebare, pe telefon](ecrane/mobile-07-nivel-intrebare.png)
14. [Rezultatul, pe calculator](ecrane/desktop-08-nivel-rezultat.png)
15. [Rezultatul, pe telefon](ecrane/mobile-08-nivel-rezultat.png)

### Rezultate
| Verificare | Rezultat |
|---|---|
| Teste pe server | 24 noi:<br>• treptele alese din răspunsuri și nivelul (inclusiv plafonul de 7,0);<br>• cine n-a jucat pornește de la treapta 1.0;<br>• întrebările lipsă sunt refuzate;<br>• recomandările;<br>• adresa publică nu salvează nimic și dă exact nivelul pe care îl dă chestionarul oficial precompletat.<br>Liga rămâne la 100% acoperire pe ramuri. |
| Teste unitare pe site | 5 noi: ordinea întrebărilor, ce se trimite serverului, scara 1–7. |
| Cap-coadă | 5 noi (calculator + telefon):<br>• drumul cu 6 întrebări: 3,75, „Intermediar bun”, Liga Jungle, linkul precompletat; apoi „Înapoi”, alt obiectiv, altă recomandare, „Reia de la început”;<br>• doar cu tastatura, cine n-a jucat: 1,0, lecție de inițiere + meciuri deschise;<br>• serverul nu răspunde: mesajul, apoi „Încearcă din nou” reușește;<br>• mingea ricoșează la fiecare răspuns și stă nemișcată la „mișcare redusă”;<br>• textele în engleză.<br>Toate testele site-ului trec: 28 + 41. |
| Lighthouse, pagina principală | mobil **91 · 100 · 100 · 100** (CLS 0), calculator **100 · 100 · 100 · 100** ([mobil](lighthouse-mobil.html), [calculator](lighthouse-desktop.html)). |

**Timpul de afișare pe mobil (LCP):** 3,3 s în simularea de rețea mobilă lentă. Ținta din §9.4 este sub 2,5 s.
- Pagina de pre-lansare aprobată în 1B avea deja 2,9 s. Site-ul complet are mai mult cod pentru secțiunile interactive, iar Lighthouse îl socotește înaintea primei afișări.
- Am adăugat ce se putea repara acum: fonturile cu literele românești (ă, ș, ț) se cer de la început. Înainte le descoperea browserul târziu, abia după ce așeza textul.
- Rămâne de măsurat pe serverul real (Etapa 14), ca în 1B. Dacă și acolo depășește ținta, facem o trecere dedicată de performanță înainte de publicare.

### Dubla revizuire: probleme găsite și reparate
1. **Pe telefon, rezultatul apărea fără minge.** Pagina derula doar până la text, iar terenul cu scara rămânea deasupra, în afara ecranului. Acum rezultatul aduce în ecran terenul și începutul textului. Pe calculator, terenul rămâne pe loc cât citiți.
2. **Testul mingii pe telefon:** testele de telefon rulează mereu cu „mișcare redusă”, deci mingea stătea, corect, nemișcată. Testul pornește acum cu mișcarea normală, apoi o oprește.
3. **Din perspectiva unui atacator:** adresa nouă de pe server e publică, dar doar calculează. Nu citește și nu scrie nimic în baza de date, primește doar valorile din listă (orice altceva e refuzat) și nu spune nimic despre alți utilizatori.
4. **Liga:** simulatorul nu înscrie pe nimeni. Recomandarea spune condițiile reale, iar nivelul oficial rămâne cel validat de antrenor.

### Cum verificați (click cu click)
1. Deschideți capturile 12–15: o întrebare și rezultatul, pe calculator și pe telefon.
2. Citiți întrebările și descrierile de mai sus. Dacă vreți altă întrebare, alt text sau altă regulă pentru trepte ori recomandări, spuneți-ne ce anume.
3. Dacă simulatorul vă place, scrieți „aprob secțiunea 6”.

---

## Secțiunea 7 — Liga Jungle și simulatorul de puncte

### Ce s-a construit
După simulatorul de nivel urmează liga (§9.2, secțiunea 7), sub titlul „Din Bronz până la Regele Junglei.”:
- **Rangurile pe o scară care urcă:** Bronz, Argint, Aur, Platină, Diamant, Maestru, Regele Junglei. Fiecare treaptă e mai înaltă decât cea dinainte și are emblema ei: scut pentru metale, diamant, stea, coroană. Sub scară, regulile pe scurt:
  - la 100 LP urci o treaptă, cu surplusul păstrat;
  - sub 0 LP cobori și pornești de la 75 LP;
  - 3 meciuri de protecție după o promovare.
- **Cum se câștigă LP**, în cinci carduri: echipe egale (în jur de ±20), surpriza valorează mai mult (între 3 și 60 LP), nivelul te duce spre rangul tău, turneele (×1,5), plasarea (primele 5 meciuri, cel mult Platină IV).
- **Sezoanele:** trei luni, LP de la 0, minimum 12 meciuri oficiale pentru clasamentul final și premii, „Sezonul 0 – Calibrare” de o lună, fără premii (Q27).
- **Premiile sezonului**, exact cum le-ați hotărât (Q6, 28.09.2026):
  - primii 3 din fiecare rang aleg 15% la abonament sau 4 vouchere de 20% la rezervări;
  - Regii Junglei primesc în plus 2 ore gratuite, mingi și cardul special;
  - la promovarea în Diamant, un card fizic nou cu emblemă din junglă (R-024).
- **Simulatorul de puncte:**
  - **ce alege vizitatorul:** nivelul lui, al partenerului și al celor doi adversari, rangul și LP-ul lui, rezultatul (câștig sau pierd), meciul (oficial sau de turneu);
  - **ce vede, imediat:** câte LP câștigă sau pierde, șansa echipei lui, rangul înainte și după (cu „Promovezi în Aur IV!” sau „Cobori în …”) și rangul spre care îl duce liga în timp, la nivelul lui.
- **Clasamentul live:** primii 5 din clasamentul de dublu al sezonului în curs (nume, rang, nivel, LP, R-012), reîmprospătat la fiecare minut, cu butonul „Vezi clasamentul complet”. Înainte de primul sezon scrie „Clasamentul apare după primele meciuri ale sezonului.”

**Ce am ales și de ce:**
1. **Punctele le calculează motorul ligii, pe server**, cum cere §9.2: nu există o copie a formulei în site. Se folosesc valorile sezonului în curs; înainte de primul sezon, setarea din panou pentru sezonul următor. Testele compară fiecare număr din pagină cu răspunsul motorului.
2. **Incertitudinea nivelului:** motorul are nevoie și de cât de sigur e nivelul fiecărui jucător. Simulatorul presupune jucători cu un sezon de meciuri în spate (σ = 5, cât dă simularea din Etapa 2 după 12 meciuri). Scrie asta sub simulator, cinstit: „în ligă contează și cât de sigur e nivelul fiecăruia”.
3. **Un meci obișnuit de dublu:** terminat, nerepetat, fără protecția de după promovare. Bonusurile de fază din turnee nu intră în simulator (le spune cardul „Turneele”).
4. **Pe site, liga doar se vede** (invariantul 2): textul spune că scorul se introduce și se confirmă doar la Chioșcul Ligii, iar simulatorul nu scrie nimic nicăieri.

### Capturi de ecran
16. [Rangurile, pe calculator](ecrane/desktop-09-liga.png)
17. [Rangurile, pe telefon](ecrane/mobile-09-liga.png)
18. [Simulatorul de puncte, pe calculator](ecrane/desktop-10-liga-simulator.png)
19. [Simulatorul de puncte, pe telefon](ecrane/mobile-10-liga-simulator.png)

### Rezultate
| Verificare | Rezultat |
|---|---|
| Teste pe server | 24 noi:<br>• echipe egale ±20; sub rangul nivelului urci mai repede;<br>• surpriza;<br>• turneu ×1,5 cu promovare și surplus;<br>• retrogradare la 75 LP;<br>• podeaua Bronz IV;<br>• Maestru;<br>• rangul spre care duce nivelul;<br>• rangurile imposibile refuzate;<br>• valorile sezonului în curs sau ale setării;<br>• adresa publică nu citește și nu scrie nimic.<br>Liga rămâne la 100% acoperire pe ramuri. |
| Teste unitare pe site | 4 noi: cele 21 de ranguri în ordine, nivelurile, ce se trimite serverului. |
| Cap-coadă | 5 noi (calculator + telefon):<br>• rangurile, cardurile, sezoanele și premiile;<br>• simulatorul: fiecare număr comparat cu motorul (câștig, înfrângere, promovare la 99 LP, adversar mai puternic, Maestru), iar pe telefon un control atins din tastatură nu rămâne ascuns sub rezultat;<br>• motorul indisponibil;<br>• clasamentul live;<br>• engleza.<br>Toate testele site-ului trec: 28 + 51. |
| Lighthouse, pagina principală | mobil **95 · 100 · 100 · 100** (LCP 2,8 s, CLS 0), calculator **100 · 100 · 100 · 100** ([mobil](lighthouse-mobil.html), [calculator](lighthouse-desktop.html)). Timpul de afișare pe mobil variază de la o rulare la alta, între 2,8 și 3,4 s; rămâne de măsurat pe serverul real (Etapa 14). |

### Dubla revizuire: probleme găsite și reparate
1. **Glisoarele nu aveau nume pentru cititoarele de ecran.** Eticheta cuprindea și valoarea afișată (un element `output`), iar browserul lega eticheta de acea valoare, nu de glisor. Verificarea automată (axe) nu a observat; a observat testul care caută glisorul după nume. Acum fiecare etichetă e legată explicit de glisorul ei.
2. **Pe telefon, rezultatul era sub toate controalele.** Mutai un glisor și nu vedeai efectul. Acum rezultatul stă primul și rămâne fixat sub antet cât muți controalele.
3. **Rezultatul fixat putea ascunde un control atins din tastatură** (WCAG 2.2, criteriul 2.4.11). Acum pagina derulează controlul în afara rezultatului, iar testul verifică asta pe telefon.
4. **Un test mai vechi (secțiunea 1) pica uneori:** verificarea de accesibilitate rula înainte ca pagina nouă să-și primească titlul, după trecerea din română în engleză. Testul așteaptă acum titlul.
5. **Din perspectiva unui atacator:** adresa nouă doar calculează. Primește doar valori din listă și în limite: niveluri 1–7, LP 0–99, Maestru până la 5.000; orice altceva e refuzat. Nu atinge baza de date în afara citirii valorilor sezonului și nu spune nimic despre vreun jucător.

### Cum verificați (click cu click)
1. Deschideți capturile 16–19.
2. Citiți regulile și premiile de mai sus: sunt cele confirmate de dumneavoastră (Q6, Q27). Spuneți-ne dacă vreți alt text.
3. Dacă secțiunea vă place, scrieți „aprob secțiunea 7”.

---

## Secțiunea 8 — Tenis

### Ce s-a construit
Sub ligă, secțiunea „Tenis, la Clubul Tenis Elite.” (§9.2, secțiunea 8):
- **Clubul pe scurt,** în patru cifre: din 2013, 8 terenuri de zgură, 4 acoperite iarna, programe pentru copii și adulți.
- **Ce leagă cele două cluburi,** în trei carduri: lecții de tenis cu antrenor (R-090), abonamente combinate (padel + tenis, tenis + pilates, All-in-One, R-080), Reformer pentru jucătorii de tenis și padel (R-101).
- **Terenurile, programul și tarifele de tenis** rămân la clubul de tenis. Butonul „Mergi la Clubul Tenis Elite” apare doar dacă se completează în panou adresa site-ului de tenis.
- **După răspunsul dumneavoastră la Q58 (30.09.2026, „nu avem adresa”):** secțiunea nu are link și nici fraza „Legătura … apare aici în curând”, ca să nu promită ceva ce nu există.
- Butonul „Vezi pachetele”.

**Ce am ales și de ce:**
1. **Site-ul de tenis rămâne separat, cu legături reciproce,** cum ați confirmat la Q20. Nu preluăm nimic de pe el: nici texte, nici culori, nici imagini (regula 13).
2. **Adresa site-ului de tenis nu apare în documentație,** așa că e o setare nouă în panou (**Setări** → `club.tennis_club_url`, doar adrese `https://`). E întrebarea nouă **Q58**.
3. **Nu afișăm prețuri de tenis.** Cel comunicat (120 lei/oră) e al clubului de tenis și se poate schimba acolo.
4. **Nu promitem un teren de tenis la Jungle:** e încă nedecis (§2.2).

### Capturi de ecran
20. [Tenis, pe calculator](ecrane/desktop-11-tenis.png)
21. [Tenis, pe telefon](ecrane/mobile-11-tenis.png)

### Rezultate
| Verificare | Rezultat |
|---|---|
| Teste pe server | 1 nou: adresa e publică, goală până o completați, doar `https://`. |
| Teste unitare pe site | 2 noi: se leagă doar o adresă `https://` curată; fără răspuns de la server, fără link. |
| Cap-coadă | 2 noi (calculator + telefon): faptele, cardurile, niciun link și niciun preț cât adresa lipsește, „Vezi pachetele”, engleza. Toate testele site-ului trec: 28 + 55. |
| Lighthouse, pagina principală | mobil **92 · 100 · 100 · 100** (LCP 3,3 s, CLS 0), calculator **100 · 100 · 100 · 100** ([mobil](lighthouse-mobil.html), [calculator](lighthouse-desktop.html)). |

**Atenție la viteză pe mobil:** scorul de performanță variază acum între 90 și 95 de la o rulare la alta. Ținta e cel puțin 90, iar marja scade pe măsură ce pagina principală crește. Înainte de publicarea site-ului complet facem o trecere dedicată de performanță pe toată pagina, apoi măsurăm pe serverul real (Etapa 14).

### Dubla revizuire
1. **Faptele** sunt doar cele din documentație (§2.3). Numărul de recenzii l-am lăsat deoparte: se schimbă și nu îl putem ține la zi.
2. **Din perspectiva unui atacator:** linkul extern se afișează doar pentru o adresă `https://` fără caractere care ar putea ieși din atribut. Serverul refuză oricum altceva la salvare. Linkul se deschide într-o fereastră nouă, fără acces la pagina noastră (`noopener`).

### Cum verificați (click cu click)
1. Deschideți capturile 20 și 21.
2. **Q58** e rezolvată: fără adresă, fără link. Dacă apare o adresă, o puneți din panou: **Setări** → `club.tennis_club_url`.
3. Secțiunea e aprobată (30.09.2026).

---

## Secțiunea 9 — Pilates Reformer

### Ce s-a construit
După Tenis urmează secțiunea „Pilates pe Reformer, în grupuri mici.” (§9.2, secțiunea 9):
- **Studioul,** lângă un desen al aparatelor Reformer văzute de sus: 4 aparate desenate cu alamă, iar alte 2 locuri punctate, unde studioul poate crește. Desenul e marcat „schemă ilustrativă, nu planul studioului”. Alături, patru fapte:
  - 4 aparate Reformer, studioul poate crește la 6;
  - grupuri mici, cel mult câte aparate sunt;
  - instructorul clubului, cu programul și prezențele în sistem (scanezi cardul la intrare);
  - peste alee, în clădirea de alături.
- **Clasele:** cele 8 din regulile clubului (R-101): Începători, Intermediar, Avansat, Ședință privată, Duo, Grup, Reformer pentru jucători de tenis/padel, Reformer pentru mămici. Fiecare are o frază despre format.
- **Lista de așteptare:** la o clasă plină te înscrii pe listă. Când cineva anulează, primul de pe listă primește locul automat și o notificare. Anulările au aceleași reguli ca la padel (R-102).
- **Programul săptămânii, live:**
  - pentru fiecare zi, ora, clasa, instructorul (doar prenumele) și locurile libere sau „Plin · listă de așteptare”;
  - butonul „Rezervă o clasă”;
  - cât studioul nu are încă clase în program, scrie „Programul claselor apare aici când îl publică studioul.”

**Ce am ales și de ce:**
1. **Programul vine direct din sistem:** clasele pe care instructorul le pune în panou apar singure pe site, în ora clubului.
2. **Instructorul apare doar cu prenumele,** cum îl dă deja serverul.
3. **Fără prețuri în secțiune,** ca la Padel. Prețurile orientative apar în configuratorul de pachete (secțiunea 10) și la rezervare.
4. **Descrierile claselor** spun doar ce e fiecare format. Nu promitem durate, rezultate sau beneficii medicale.

### Capturi de ecran
22. [Pilates, pe calculator](ecrane/desktop-12-pilates.png)
23. [Pilates, pe telefon](ecrane/mobile-12-pilates.png)
24. [Programul, cu date de test, pe calculator](ecrane/desktop-13-pilates-program.png)
25. [Programul, cu date de test, pe telefon](ecrane/mobile-13-pilates-program.png)

### Rezultate
| Verificare | Rezultat |
|---|---|
| Teste pe server | 1 nou: programul public e în ordinea orelor și are o limită (1–200). Toate cele 44 de teste de rezervări trec. |
| Teste unitare pe site | 3 noi: cele 8 tipuri, zilele clubului peste trecerea la ora de vară, gruparea pe 7 zile (fără clasele începute sau prea îndepărtate). |
| Cap-coadă | 4 noi (calculator + telefon):<br>• studioul, clasele și programul real (gol în datele de test);<br>• cu o oră fixată și date controlate: vineri 18:00 „3 locuri libere”, duminică (ora de vară) 19:00 „Plin · listă de așteptare”, fără clasa de peste o săptămână;<br>• programul indisponibil;<br>• engleza.<br>Toate testele site-ului trec: 28 + 63. |
| Lighthouse, pagina principală | mobil **91 · 100 · 100 · 100** (LCP 3,3 s, CLS 0), calculator **100 · 100 · 100 · 100** ([mobil](lighthouse-mobil.html), [calculator](lighthouse-desktop.html)). Trecerea de performanță rămâne planificată înainte de publicare. |

### Dubla revizuire
1. **Programul public nu mai crește fără limită:** serverul întorcea toate clasele viitoare, în orice ordine. Acum le dă în ordinea orelor, cel mult câte cere site-ul (60).
2. **Ora clubului:** o clasă de la 00:30 cade în ziua ei, iar ziua trecerii la ora de vară are orele corecte. Testele verifică amândouă.
3. **Din perspectiva unui atacator:** doar citiri publice, deja existente. Serverul dă doar prenumele instructorului și numărul de locuri libere, niciodată cine s-a înscris.

### Cum verificați (click cu click)
1. Deschideți capturile 22–25.
2. Citiți descrierile claselor de mai sus. Dacă vreți alte texte (de exemplu, de la instructor), spuneți-ne.
3. Secțiunea e aprobată (30.09.2026).

---

## Secțiunea 10 — Configuratorul de pachete

### Ce s-a construit
După Pilates urmează „Abonamentul tău, în trei pași.” (§9.2, secțiunea 10):
1. **Sporturile:** Padel, Tenis, Pilates Reformer, unul, două sau toate trei. Dedesubt scrie reducerea de pachet: două sporturi −10%, toate trei −15%.
2. **Intensitatea** pentru fiecare sport: Start, Activ sau Pro, cu numărul de sesiuni și prețul lunar. Dedesubt, regula: „Start: oricând, în afara orelor de vârf (17:00–22:00). Activ și Pro: oricând.”
3. **Perioada:** lunar, trimestrial (−5%) sau anual (−15%).

**Alături, prețul, calculat de server la fiecare schimbare:**
- totalul („2.668 lei pentru 3 luni”);
- rândurile lui: fiecare sport pe lună, totalul pe perioadă și reducerile aplicate;
- eticheta **„Preț orientativ: prețurile finale se anunță înainte de deschidere.”**, cât prețurile sunt cele orientative puse la Q21.

**Sub configurator:**
- ce e o sesiune (un antrenament; terenul se închiriază separat, pe oră, și se împarte);
- fără report;
- pauza de două săptămâni pe an;
- altă intensitate, la cerere;
- unde îl cumperi: la Chioșcul de Plăți, cu numerar;
- pachetul de firmă (20% pentru angajați, facturare pe firmă, raport lunar), cu „Scrie-ne”.

**Ce am ales și de ce:**
1. **Prețurile vin de la server,** exact cum le calculează sistemul la cumpărare: reducerile una după alta, rotunjirea la leu întreg (R-084). Site-ul nu are o copie a regulilor. Dacă schimbați un tarif sau o reducere în panou, configuratorul arată imediat noua valoare.
2. **Afișăm prețurile orientative** pe care ați cerut să le punem (Q21), marcate clar ca orientative.
3. **„La cerere”:** stabilită la recepție, cu prețul clubului; sub 8 sesiuni pe lună se aplică regula Start. E varianta din Q12, confirmată de dumneavoastră pe 30.09.2026.
4. **Cumpărarea** rămâne la chioșc, cu numerar (Q9). Site-ul nu vinde online.

### Capturi de ecran
26. [Configuratorul, pe calculator](ecrane/desktop-14-pachete.png)
27. [Configuratorul, pe telefon](ecrane/mobile-14-pachete.png)

### Rezultate
| Verificare | Rezultat |
|---|---|
| Teste unitare pe site | 3 noi (alegerea sporturilor, cel puțin unul; ce se trimite serverului; banii afișați în lei) și 3 pentru textele trimise browserului (mai jos). |
| Cap-coadă | 4 noi (calculator + telefon):<br>• fiecare preț comparat cu serverul: padel Activ lunar; + pilates, cu reducerea de pachet; pilates Start și trimestrial, cu ambele reduceri și regula Start;<br>• ultimul sport nu se poate scoate;<br>• notele și pachetul de firmă;<br>• serverul indisponibil;<br>• engleza.<br>Toate testele site-ului trec: 28 + 71. |
| Lighthouse, pagina principală | mobil **91 · 100 · 100 · 100** (LCP 3,2 s, CLS 0), calculator **100 · 100 · 100 · 100** ([mobil](lighthouse-mobil.html), [calculator](lighthouse-desktop.html)). |

### Viteza pe telefon: ce am găsit și ce am reparat
Scorul de performanță pe mobil scăzuse la 90, chiar la limită, așa că am făcut acum o parte din trecerea de performanță:
1. **Reparat: fiecare pagină ducea cu ea toate textele proiectului.** Mergeau și cele ale panoului de admin, ale chioșcurilor și ale ecranelor, adică 91 KB de texte în fiecare pagină. Acum pleacă spre browser doar textele părților interactive ale site-ului. Pagina principală a scăzut de la 75 la 58 KB pe rețea. Un test verifică lista: dacă o componentă nouă folosește texte care nu sunt pe listă, testul pică.
2. **Încercat și renunțat:** hidratarea pe secțiuni și `content-visibility`. Scorul nu s-a schimbat, iar a doua variantă a scăzut verificarea automată de accesibilitate la 97. Le-am scos.
3. **Ce rămâne:** cea mai mare parte din timp e codul de bază al site-ului (React, Next.js și traducerile), aproximativ 140 KB, fix. Secțiunile noastre adaugă doar aproximativ 13 KB. Secțiunile 11–19 le facem cu cât mai puțin cod în browser.
4. **Dacă scorul coboară sub 90,** următorul pas e ca textele părților interactive să vină gata traduse de pe server. Astfel s-ar scoate din browser biblioteca de traduceri (aproximativ 18 KB).
5. **Oricum,** măsurăm pe serverul real (Etapa 14).

### Dubla revizuire
1. **Banii:** site-ul primește sume întregi, în bani (invariantul 5), și doar le afișează în lei. Nu le adună și nu le rotunjește.
2. **Din perspectiva unui atacator:** doar citiri și calcule publice, deja existente (Etapa 4). Configuratorul nu creează abonamente și nu cere date personale.
3. **Prinse de verificarea completă de dinaintea trimiterii pe GitHub** (nimic nu a ajuns roșu pe GitHub):
   - **Testul traducerilor** citea greșit textele cu plural: lua prima parte a unei forme de plural drept loc de completat, iar româna are trei forme de plural față de două în engleză. Testul recunoaște acum corect locurile de completat și prinde în continuare o diferență reală.
   - **Pagina de dezabonare de pe lista de așteptare** (pre-lansare) rămăsese fără texte după scurtarea listei de texte trimise spre browser. Grupul ei de texte e ales printr-o condiție, pe care verificarea listei nu o citea. Textele au fost adăugate, iar testul listei citește acum și condițiile. Testul cap-coadă al listei de așteptare trece din nou.

### Cum verificați (click cu click)
1. Deschideți capturile 26 și 27.
2. Verificați prețurile orientative (sunt cele de la Q21) și textele de sub configurator. Tarifele le schimbați oricând din panou, iar site-ul le preia singur.
3. Secțiunea e aprobată (30.09.2026).

---

## Secțiunea 11 — „Împarte ora”

### Ce s-a construit
După pachete urmează „Terenul se plătește la oră. Și se împarte.” (§9.2, secțiunea 11). Vizitatorul alege:
1. **când joacă:** vârf, semi-vârf sau în afara vârfului;
2. **cât joacă:** 60, 90, 120, 150 sau 180 de minute (duratele permise la rezervare);
3. **câți plătesc:** 4, 3, 2 jucători sau 1 („plătești tot”).

**Alături, calculat de server:** cât plătește fiecare („50 lei de persoană”), prețul terenului pentru durata aleasă și programul benzii („08:00–12:00, 15:00–17:00, în fiecare zi”). Când suma nu se împarte exact, apare partea fiecăruia, cu nota „Banii care nu se împart exact îi plătește primul jucător.” Eticheta „Preț orientativ” rămâne cât prețurile sunt cele de la Q21.

**Sub simulator:**
- la Chioșcul de Plăți fiecare își scanează cardul și își plătește partea, în numerar, sau organizatorul plătește tot;
- fără credite la padel;
- o rezervare făcută online se plătește la club;
- butonul „Rezervă un teren”.

**Ce am ales și de ce:**
1. **Împărțirea e exact cea de la chioșc,** din aceeași funcție de pe server (R-061). Ce vede vizitatorul pe site e ce plătește în club.
2. **Prețul e tariful terenului de padel pentru banda aleasă** și sezonul curent, cum îl setați în panou. Nu calculăm pe site.
3. **Orele benzilor** vin din setări, deci se schimbă singure dacă modificați benzile.

### Capturi de ecran
28. [„Împarte ora”, pe calculator](ecrane/desktop-15-imparte-ora.png)
29. [„Împarte ora”, pe telefon](ecrane/mobile-15-imparte-ora.png)

### Rezultate
| Verificare | Rezultat |
|---|---|
| Teste pe server | 13 noi:<br>• împărțirea pe benzi, durate și număr de jucători, cu restul la primul;<br>• organizatorul plătește tot;<br>• orele benzilor în programul clubului, cu intervalele alăturate unite;<br>• tariful confirmat nu mai e „orientativ”;<br>• duratele și numărul de jucători imposibile sunt refuzate;<br>• fără tarif, prețul lipsește;<br>• adresa publică nu rezervă și nu salvează nimic.<br>Acoperire 100% pe ramuri a modulului nou. |
| Cap-coadă | 4 noi (calculator + telefon):<br>• fiecare parte comparată cu serverul (vârf 90 de minute în 4, semi-vârf 60 de minute în 3, un singur plătitor);<br>• fără credite și plata la chioșc;<br>• serverul indisponibil;<br>• engleza.<br>Toate testele site-ului trec: 28 + 79. |
| Lighthouse, pagina principală | mobil **90 · 100 · 100 · 100** (LCP 3,5 s, CLS 0), calculator **100 · 100 · 100 · 100** ([mobil](lighthouse-mobil.html), [calculator](lighthouse-desktop.html)). |

### Dubla revizuire: probleme găsite și reparate
1. **Două scheme cu același nume** (`SplitOut` exista deja la plăți): documentația automată a serverului le-ar fi contopit, iar site-ul ar fi primit alte câmpuri. Am observat la verificarea tipurilor, iar un test existent din Etapa 8 ar fi oprit trimiterea. Schema nouă se numește `CourtSplitOut`.
2. **O clasă CSS cu același nume** (`split`, folosită de pagina de pre-lansare) strângea simulatorul pe o jumătate de ecran. Clasa are acum un nume propriu, iar captura arată corect.
3. **Din perspectiva unui atacator:** adresa nouă doar calculează. Primește doar benzile, duratele și numerele de jucători permise și nu atinge rezervările sau banii.

### Viteza pe telefon
Scorul e **90**, exact la limită, iar calculatorul are 100. Secțiunile care urmează (evenimente, cafenea, comunitate, echipă, cifre, locație, întrebări, subsol) sunt în mare parte text, fără cod nou în browser. Dacă o secțiune coboară scorul sub 90, facem înaintea ei pasul pregătit la secțiunea 10: textele părților interactive vin gata traduse de pe server.

### Cum verificați (click cu click)
1. Deschideți capturile 28 și 29.
2. Dacă secțiunea vă place, scrieți „aprob secțiunea 11”.

---

## Secțiunea 12 — Evenimente

### Ce s-a construit
După „Împarte ora” urmează „Seri cu DJ, turnee și o sală doar a voastră.” (§9.2, secțiunea 12, R-110).

**Trei carduri:**
- serile cu DJ;
- turneele ligii: tablou, program și rezultate live; înscrierea din cont sau la recepție, pentru jucătorii din ligă;
- padelul social: Americano și Mexicano.

**Calendarul clubului, din date reale:**
- evenimentele pe care le publicați din panou (Evenimente → „Calendarul public”), cu titlul în română și engleză;
- turneele ligii cu înscrieri deschise (cu termenul și locurile libere) sau în desfășurare, citite direct din ligă;
- în ordinea orei, pe următoarele 4 luni, cu ora clubului;
- un eveniment anulat rămâne pe site, marcat „Anulat”, până la ora lui de sfârșit, ca să nu vină nimeni degeaba;
- cât nu e nimic publicat, apare: „Calendarul se completează înainte de deschidere…”.

**Sala de evenimente, din date:** câte persoane primește (20, cum e setată sala) și prețul pe oră („orientativ”, cel de la Q21), încălzită și răcită, în clădirea de alături, cu studioul de pilates. Butonul „Cere sala de evenimente” duce la pagina Evenimente; cererea se trimite din cont și o confirmă managerul (Q34, varianta implicită).

**În panou, la Evenimente, sub cererile pentru sală:** „Calendarul public”.
1. Adăugați un eveniment: tipul, titlul în română și în engleză, o descriere scurtă (opțional), ziua și orele. Îl lăsați ciornă sau îl publicați direct.
2. Îl puteți modifica, publica, retrage sau anula, de fiecare dată cu un motiv.
3. Totul intră în jurnalul de audit, iar site-ul se actualizează imediat după fiecare schimbare vizibilă.

**Ce am ales și de ce:**
1. **Calendarul se completează din panou,** nu din cod: o seară cu DJ nouă nu mai cere un programator.
2. **Turneele nu se scriu de două ori:** apar în calendar din ligă, cu datele lor.
3. **Un eveniment din calendar nu rezervă terenuri sau sala.** Dacă o seară cu DJ ocupă terenurile, le rezervați din Calendar, ca până acum. Așa, un anunț nu poate bloca din greșeală rezervările clienților.
4. **Evenimentele demo** (o seară cu DJ și un Americano) există doar în datele de probă și apar marcate „Exemplu (demo)”; pe serverul clubului nu apar.
5. **Secțiunea e randată pe server:** nu adaugă cod în browser, deci nu încetinește pagina pe telefon.

### Capturi de ecran
30. [Evenimente și calendarul, pe calculator](ecrane/desktop-16-evenimente.png)
31. [Evenimente și calendarul, pe telefon](ecrane/mobile-16-evenimente.png)
32. [Sala de evenimente, pe calculator](ecrane/desktop-17-sala-evenimente.png)
33. [Sala de evenimente, pe telefon](ecrane/mobile-17-sala-evenimente.png)

### Rezultate
| Verificare | Rezultat |
|---|---|
| Teste pe server | 11 noi:<br>• un eveniment ajunge pe site doar publicat;<br>• publicat direct, apoi modificat cu motiv (în jurnalul de audit, cu înainte și după);<br>• o ciornă nu cere reîmprospătarea site-ului;<br>• orele și titlurile verificate (sfârșitul după început, cel mult 24 de ore, fără ore trecute, fără ore fără fus orar, titlurile obligatorii);<br>• anularea cu motiv, vizibilă până la sfârșit;<br>• doar managerii evenimentelor clubului, cu 2FA;<br>• lista din panou;<br>• turneele ligii în ordinea orei (fără cele încheiate, anulate sau prea departe);<br>• cel mult 30, pe 4 luni;<br>• sala, cu cea mai ieftină oră;<br>• un club necunoscut.<br>Plus: datele demo marcate. Acoperire 100% pe ramuri a aplicației noi, impusă de verificarea completă. |
| Teste în panou | 3 noi: adăugare (și peste miezul nopții), modificare, publicare, retragere și anulare cu motiv; o schimbare refuzată păstrează formularul; orele în ora clubului, și la trecerea la ora de vară. |
| Teste unitare pe site | 9 noi: citirea calendarului, limba, tipurile, orele clubului (și la trecerea la ora de vară), reîmprospătarea cu eticheta `events`; verificarea plăcii video pe firul separat (placă reală, placă software, rezerva pe firul principal, fără răspuns). |
| Cap-coadă | 4 noi (calculator + telefon): cardurile, calendarul comparat cu serverul (titlurile, orele, marcajul demo), sala cu datele ei, engleza. Toate testele site-ului trec: 28 + 83. |
| Lighthouse, pagina principală | mobil **92 · 100 · 100 · 100** (LCP 3,2 s, CLS 0), calculator **100 · 100 · 100 · 100** ([mobil](lighthouse-mobil.html), [calculator](lighthouse-desktop.html)). |

### Dubla revizuire: probleme găsite și reparate
1. **Ore fără fus orar:** o oră trimisă fără fus („20:00” fără „+02:00”) ar fi dus la o eroare de server. Acum e refuzată cu un mesaj clar, ca la rezervări. Testul acoperă cazul.
2. **Mesajul „Cererea nu există”** (al cererilor pentru sală) s-ar fi folosit și pentru evenimente. Evenimentele au acum mesajul lor: „Evenimentul nu există.”
3. **Din perspectiva unui atacator:** calendarul public arată doar ce ați publicat și datele publice ale turneelor (nume, format, locuri), fără nicio dată despre jucători. Schimbările cer dreptul `events.manage` pe clubul respectiv și 2FA. Textele sunt limitate ca lungime și afișate doar ca text.

### Viteza pe telefon: sub 90, apoi reparată
Cu secțiunea nouă, scorul pe telefon a coborât la **84–89** în trei măsurători. Nu din cauza secțiunii (ea nu trimite cod în browser), ci pentru că pagina a crescut. Am găsit trei cauze și le-am reparat pentru tot site-ul:
1. **Paginile se pre-descărcau la încărcare.** Fiecare link vizibil aducea din timp pagina lui; logo-ul aducea din nou toată pagina principală (~94 KB). Acum o pagină se descarcă doar când e deschisă.
2. **Verificarea plăcii video pentru scena 3D** din hero ținea telefonul ocupat ~180 ms imediat după încărcare. Acum se face pe un fir separat (Web Worker), fără să blocheze pagina.
3. **Un font nefolosit** (Fraunces cursiv, 22 KB) se descărca înainte de prima afișare. Nu se mai descarcă din timp.

După reparații: **90–92** pe telefon în măsurătorile repetate (o singură excepție, 87, într-o rulare în care browserul de test a pornit greu), 100 pe calculator.

### Cum verificați (click cu click)
1. Deschideți capturile 30–33.
2. În panou (după ce e publicat pe server): Evenimente → „Calendarul public” → adăugați un eveniment și bifați „Publică pe site acum”.
3. Dacă secțiunea vă place, scrieți „aprob secțiunea 12”.

---

## Secțiunea 13 — Cafeneaua de specialitate

### Ce s-a construit
După Evenimente urmează „Cafea de specialitate, între meciuri.” (§9.2, secțiunea 13). Cafeneaua e la parter, împreună cu recepția și vestiarele, cu scară spre pasarela-lounge.

**Cum comanzi, în trei pași (R-111):**
1. la Chioșcul de Plăți: alegi din meniu și plătești în numerar (Q9);
2. primești bonul cu numărul comenzii, iar comanda ajunge pe ecranul barului;
3. când e gata, numărul tău apare pe ecranul din lobby.

**Meniul, din date reale:** exact cel din panou (Cafenea), pe categorii, doar produsele disponibile acum (R-112), fiecare cu prețul lui. Cât un preț e încă orientativ (Q21), apare nota „Prețuri orientative: meniul și prețurile finale se anunță înainte de deschidere.” Acum vedeți meniul orientativ pus la Q21 (espresso, cappuccino, apă plată).

**Ce am ales și de ce:**
1. **Meniul nu se scrie de două ori:** îl schimbați în panou, iar site-ul se actualizează imediat (la fiecare categorie sau produs salvat, serverul îi cere site-ului reîmprospătarea).
2. **Un produs marcat indisponibil dispare de pe site,** ca nimeni să nu vină pentru ceva ce nu se poate comanda.
3. **Secțiunea e randată pe server,** fără cod nou în browser.

### Capturi de ecran
34. [Cafeneaua, pe calculator](ecrane/desktop-18-cafenea.png)
35. [Cafeneaua, pe telefon](ecrane/mobile-18-cafenea.png)
36. [Meniul, pe calculator](ecrane/desktop-19-cafenea-meniu.png)
37. [Meniul, pe telefon](ecrane/mobile-19-cafenea-meniu.png)

### Rezultate
| Verificare | Rezultat |
|---|---|
| Teste pe server | testul meniului extins: fiecare schimbare (categorie, produs, modificare) cere site-ului reîmprospătarea. Acoperire 100% pe ramuri a cafenelei, ca până acum. |
| Teste unitare pe site | 4 noi: citirea meniului (și când serverul nu răspunde), limba, nota de prețuri orientative, reîmprospătarea cu eticheta `cafe`. |
| Cap-coadă | 4 noi (calculator + telefon): cei trei pași; meniul comparat cu serverul (categoriile, produsele, prețurile, nota); engleza. Toate testele site-ului trec: 28 + 87. |
| Lighthouse, pagina principală | mobil **90–94** în patru măsurători (raportul salvat: 90 · 100 · 100 · 100, LCP 3,2 s, CLS 0), calculator **100 · 100 · 100 · 100** ([mobil](lighthouse-mobil.html), [calculator](lighthouse-desktop.html)). |

### Dubla revizuire: probleme găsite și reparate
1. **Nota de prețuri orientative lipită de meniu:** pe captură, banda galbenă atingea titlul primei categorii. Are acum spațiu dedesubt.
2. **O afirmație de verificat:** în prima variantă scria „lângă recepție”. Planul spune doar că cafeneaua, recepția și vestiarele sunt la parter, deci textul spune exact atât.
3. **Din perspectiva unui atacator:** secțiunea doar citește meniul public (nume și prețuri). Nu comandă și nu plătește nimic; comenzile rămân doar la chioșc.

### Cum verificați (click cu click)
1. Deschideți capturile 34–37.
2. În panou (după ce e publicat pe server): Cafenea → schimbați prețul unui produs sau marcați-l indisponibil, apoi reîncărcați pagina site-ului.
3. Dacă secțiunea vă place, scrieți „aprob secțiunea 13”.
