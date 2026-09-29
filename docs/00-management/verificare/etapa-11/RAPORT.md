# Raport de verificare — Etapa 11 (site-ul complet, secțiune cu secțiune)

> Branch: `claude/hopeful-euler-rguibn`. Site-ul complet se livrează **secțiune cu secțiune** (§9.2). Acest raport crește cu fiecare secțiune.
>
> **Decizia proprietarului (29.09.2026):** „alege ce crezi că este mai bine doar la această etapă”. În Etapa 11, alegerile de conținut și design le facem noi, după documentație și regulile proiectului, și continuăm secțiune după secțiune. Dumneavoastră vedeți totul aici și ne spuneți oricând ce vreți schimbat.

| Secțiune (§9.2) | Livrată | Starea |
|---|---|---|
| Fundația site-ului complet + **1. Antetul fix** | 29.09.2026 | **aprobată 29.09.2026** |
| 2. Hero „Intră în junglă” | 29.09.2026 | **livrată** |
| 3. Turul clubului la scroll | 29.09.2026 | **livrată** |
| 4. „Acum în club” (live) | 29.09.2026 | **livrată** |
| 5–19 | — | urmează, câte una |

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
