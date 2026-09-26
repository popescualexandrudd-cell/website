# Analiza completă — Clubul Tenis Elite

Documentul adună, într-un singur loc, analiza de marketing, brand, design, SEO, tehnică și
performanță a site-ului Clubului Tenis Elite, rezultatele verificărilor făcute la livrare și ce
urmează. Cifrele de performanță sunt măsurate pe build-ul de producție; unde nu există date
măsurabile (volume de căutare, conversii), documentul o spune explicit, în loc să le inventeze.

Înlocuiește vechiul `docs/SEO-MARKETING.md`, scris pentru varianta „academie”.

---

## 1. Pe scurt

| Domeniu | Stare | Ce contează |
| --- | --- | --- |
| Brand | **Clubul Tenis Elite**, vocea clubului, fără brand personal și fără „academie” | un singur nume peste tot: site, Google, rețele, recepție |
| Oferte | Iarna: teren 60 RON/oră; copiii: 2 ședințe gratuite | vizibile în primul ecran, pe Programe, Închiriere și Prețuri |
| SEO | 100/100 în Lighthouse pe toate paginile testate; date structurate complete | lipsesc încă: profilul Google verificat cu link de recenzie, coordonatele, fotografiile reale |
| Performanță | desktop 99/100; telefon 85–92/100 în laborator, LCP real ~0,3–1,3 s | pagina se încarcă cu 0,6 MB (față de 3 MB înainte) |
| Accesibilitate | 100/100 Lighthouse, axe fără erori pe 21 de pagini | video cu buton de pauză, fără animații la „reduce motion” |
| Bune practici | 100/100 (CSP strict, fără avertismente) | HTTPS, HSTS, fără scripturi terțe fără acord |
| Teste | 114 unitare și de integrare, 21 end-to-end, 8 dispozitive × 13 pagini | niciun eșec la livrare |
| Risc principal | afirmația „cel mai mic preț din București” | trebuie să poată fi dovedită (secțiunea 8) |

---

## 2. Brand și poziționare

### 2.1 Identitatea

- **Numele**: „Clubul Tenis Elite”, folosit identic în titluri, subsol, date structurate, emailuri
  și asistent. Denumirea legală (Asociația Club Sportiv Elite Tenis, CUI 33026880) apare doar în
  subsol și în paginile legale. Variantele vechi („Elite Tenis Club”, „Club Sportiv Elite Tenis”)
  sunt declarate ca `alternateName` în datele structurate, ca Google să le lege de același club.
- **Descriptorul**: „Club de tenis · Pantelimon”: spune ce e și unde, în 4 cuvinte.
- **Promisiunea**: „Experiență de elită în lumea tenisului.” (titlul primei pagini).
- **Vocea**: clubul vorbește la persoana întâi plural („Te așteptăm”, „antrenorii clubului”), cald
  și concret; adulții sunt abordați direct („Cât ai jucat până acum?”), părinții despre copil.
- **Cei patru piloni** („Ce face diferența”): *Zgură totală* (toate cele 8 terenuri, 4 acoperite),
  *De la mingea roșie la turnee* (drumul complet al copilului), *Turnee acasă* (FRT și Tenis10 pe
  terenurile clubului), *De dimineața până seara* (07:00–22:00, zilnic). Sunt diferențiatorii reali
  față de concurență și trebuie repetați în toate materialele.

### 2.2 Poziționarea față de concurență

Concurența directă din zonă și din estul Bucureștiului (din cercetarea făcută la proiectare):
bazele din Pantelimon–Dobroești și sectorul 3 (zona Mega Mall), cluburile pentru copii din sectorul
2, bazele de tip Daimon, Sud Arena, Triumf, Terra Sport, Tenis Club Primăverii. Prețul mediu al unei
ore de teren în București se situează în jurul a 80 RON; unele baze anunță 45–60 RON în anumite
intervale.

Poziția recomandată: **clubul complet de zgură din estul Bucureștiului**: nu cel mai ieftin teren
(o cursă pe preț se pierde ușor), ci singurul loc din zonă unde un copil începe la 4 ani cu mingea
roșie și ajunge să joace turnee oficiale pe aceleași terenuri, iar adulții au zgură acoperită
iarna, ligă și parteneri de joc. Oferta de iarnă de 60 RON e o **ușă de intrare**, nu identitatea.

### 2.3 Recomandări de brand

1. Același nume și aceeași descriere pe Google Business Profile, Facebook, Instagram, afișe:
   „Clubul Tenis Elite — Club de tenis · Pantelimon”.
2. Fotografii proprii cu oamenii clubului (copii cu acordul părinților, antrenori, adulți la joc):
   sunt cel mai puternic semnal de încredere; imaginile de stoc slăbesc un brand local.
3. Un semn vizual constant: bila galbenă și verdele închis al clubului (#16351b / #3a7a1e),
   deja aplicate pe site, în emailuri și pe cardurile cadou.

---

## 3. Marketing

### 3.1 Pâlnia de vânzare, așa cum e construită pe site

| Etapă | Pe site | Măsurare |
| --- | --- | --- |
| Atenție | video-ul clubului, banner-ul campaniei de iarnă în primul ecran | Umami / Analytics (cu acord) |
| Interes | „3 întrebări, pasul potrivit”, programele, drumul roșu → galben | clicuri pe programe |
| Încredere | nota Google 4,5 (257 de recenzii), recenzii, turnee, palmares, antrenori | — |
| Acțiune | rezervare online, cerere de teren, înscrierea copilului la 2 ședințe gratuite, WhatsApp, telefon | fiecare cerere păstrează sursa (UTM, reclamă, căutare) |
| Fidelizare | card cadou, liga amatorilor, partener de joc, newsletter, invitație automată la recenzie | admin → Campanii |

### 3.2 Cele două oferte

- **Campania de iarnă: 60 RON/oră** pentru orice teren de zgură. Apare în banner-ul de sub video,
  pe Închiriere teren și pe Prețuri, cu textul cerut de club.
- **2 ședințe gratuite pentru copii** la grupele de inițiere, fără obligații, cu echipament
  asigurat. Apare în banner, pe Programe (secțiunea „Oferta de bun venit”), în asistent și în
  formularul de înscriere.

### 3.3 Calendar de campanii propus

| Perioadă | Mesaj | Canale |
| --- | --- | --- |
| Octombrie–martie | „Zgură acoperită, 60 RON/oră” | Google Ads pe „închiriere teren tenis”, Facebook/Instagram local (5–10 km) |
| Septembrie și ianuarie | „Copilul tău începe tenisul: 2 ședințe gratuite” | școlile și grădinițele partenere, Facebook părinți, afiș la recepție |
| Aprilie–mai | Tabere de vară și liga amatorilor | newsletter, Instagram, turneele clubului |
| Noiembrie–decembrie | Card cadou „Oferă un antrenament de tenis” | Instagram, newsletter, recepție |
| Tot anul | Team building pentru firme | LinkedIn, contact direct cu firmele din zonă |

Fiecare reclamă folosește un link generat din admin → Campanii (etichete UTM), ca să vezi câte
rezervări și înscrieri a adus.

### 3.4 Google Business Profile (cel mai important canal local)

1. Verifică profilul, cu numele „Clubul Tenis Elite”, categoria principală „Club de tenis” și
   secundare „Teren de tenis”, „Școală de sport”.
2. Programul 07:00–22:00, telefonul 0722 501 748, adresa Bulevardul Biruinței 19/21, linkul către
   site.
3. 20+ fotografii reale: terenurile, sala, vestiarele, grupele, turneele.
4. O postare pe săptămână (oferta de iarnă, turneele, taberele).
5. Linkul „Scrie o recenzie” pus în admin → Setări → Recenzii Google, apoi codul QR tipărit la
   recepție. Site-ul trimite automat invitația după primul antrenament.

### 3.5 Indicatori de urmărit lunar

Rezervări online, cereri de teren, înscrieri ale copiilor, mesaje (toate în admin, cu sursa), nota
și numărul de recenzii Google, pozițiile pentru cuvintele cheie din secțiunea 4.

---

## 4. SEO

### 4.1 Cercetarea cuvintelor cheie

Metoda: căutările reale ale părinților și jucătorilor din București–Ilfov, sugestiile Google,
titlurile concurenților și paginile care apar pe primele poziții. Volumele exacte nu sunt
disponibile fără un instrument plătit (Google Keyword Planner cu cont de reclame activ, Ahrefs,
Semrush); prioritatea de mai jos combină intenția de cumpărare cu concurența observată.

| Grup | Cuvinte cheie | Intenție | Pagina țintă | Prioritate |
| --- | --- | --- | --- | --- |
| Local, marcă | clubul tenis elite, elite tenis club, tenis pantelimon | navigațională | prima pagină | foarte mare |
| Închiriere | închiriere teren tenis bucurești, teren tenis ieftin bucurești, teren tenis acoperit iarna, teren zgură bucurești, închiriere teren tenis pantelimon | tranzacțională | Închiriere teren | foarte mare |
| Copii | cursuri tenis copii bucurești, tenis copii 4 ani, minitenis bucurești, lecții tenis copii sector 2 / sector 3 | tranzacțională | Programe (#grupe, #inscriere) | foarte mare |
| Adulți | lecții tenis adulți bucurești, antrenor tenis bucurești, tenis începători adulți | tranzacțională | Programe → Amatori / Inițiere | mare |
| Zonă | tenis voluntari, tenis dobroești, tenis sector 3, tenis cernica | locală | prima pagină, Contact | mare |
| Sezon | tabără tenis copii vara, team building tenis | tranzacțională | Programe → Tabere / Team building | medie |
| Competiție | turnee tenis copii bucurești, tenis10, turnee FRT juniori | informațională | Turnee | medie |
| Informațional | la ce vârstă începe copilul tenisul, pantofi tenis zgură, tenis iarna | informațională | Sfaturi (6 articole) | medie |
| Cadou | card cadou tenis, voucher tenis | tranzacțională | Card cadou | mică, sezonieră |

### 4.2 Ce este implementat pe site

- **Titluri și descrieri** unice pe fiecare pagină, cu cuvântul cheie la început și marca la
  sfârșit (ex. „Închiriere teren tenis Pantelimon: zgură, 60 lei/oră iarna · Clubul Tenis
  Elite”); descrierile au sub 160 de caractere, ca Google să le afișeze întregi.
- **Un singur H1** pe pagină (verificat automat pe 13 pagini × 8 dispozitive).
- **Date structurate** (JSON-LD): `SportsClub` + `SportsActivityLocation` cu adresă, program,
  catalog de oferte și denumirea legală (fără nota Google: Google nu acceptă ca un club să-și
  declare singur ratingul, iar steluțele apar oricum din profilul Google Business); `Person` pentru fiecare antrenor; `FAQPage`;
  `Service` pentru programe și închiriere; `ItemList` de cursuri pentru grupe; `Article` pentru
  sfaturi; `BreadcrumbList` pe paginile interioare.
- **Adrese curate** în română (`/inchiriere-teren`, `/programe/initiere`) și traduse în engleză
  (`/en/court-hire`), cu `hreflang` și `canonical` pe fiecare pagină.
- **Redirecționări permanente (308)** de la paginile vechi (`/academie`, `/despre`,
  `/programe/analiza-biomecanica` și echivalentele în engleză), ca linkurile vechi să nu se piardă.
- **Sitemap** (80 de adrese, fără paginile vechi), `robots.txt` (admin și paginile private
  excluse), `/llms.txt` pentru asistenții AI (ChatGPT, Perplexity, Gemini) cu datele clubului.
- **Imagini** AVIF/WebP în 5 mărimi, cu text alternativ; video fără sunet, cu poster.
- **Viteză și Core Web Vitals**: vezi secțiunea 6.

### 4.3 SEO local: ce trebuie făcut în afara site-ului

1. Google Business Profile complet (secțiunea 3.4): cel mai mare impact pentru „tenis
   pantelimon” și „închiriere teren tenis” în hartă.
2. Aceleași date (nume, adresă, telefon) în directoare: Waze, Apple Maps (Business Connect),
   Bing Places, platformele de rezervare de terenuri pe care apare clubul, Facebook.
3. Linkuri locale: primăria Pantelimon, școlile și grădinițele partenere, FRT și Tenis10 (pagina
   turneelor găzduite), presa locală din Ilfov.
4. Recenzii noi constant (țintă: 5–10 pe lună), cu răspuns la fiecare.

### 4.4 Plan de conținut (Sfaturi)

Un articol pe lună, legat de un cuvânt cheie din tabel: „Cât costă tenisul pentru copii în
București”, „Tenis iarna: zgură acoperită sau hard?”, „Cum alegi racheta pentru copilul de 5 ani”,
„Primul turneu Tenis10: ce trebuie să știe părinții”, „Tenis pentru adulți începători: primele 10
ore”. Fiecare articol trimite spre o pagină de conversie (înscriere, rezervare, închiriere).

---

## 5. Design și experiența utilizatorului

- **Meniu** de 5 intrări sus (Programe, Închiriere teren, Turnee, Echipa, Contact) și 8 în subsol
  (plus Facilități, Prețuri, Galerie), conform cerinței; meniul complet se deschide din „Meniu”.
- **Video-ul clubului pe fundal** în antetul fiecărei pagini, cu text alb peste un voal verde
  închis; pe telefon se încarcă o variantă de 360p (0,5 MB), iar video-ul pornește abia după ce
  pagina s-a încărcat.
- **Drumul roșu → portocaliu → verde → galben**, simetric, cu linii care se estompează între
  mingi (orizontal pe ecrane late, vertical pe telefon), grupat în „Minitenis” și „Juniori și
  seniori”.
- **„3 întrebări, pasul potrivit”**: adulții sunt întrebați direct (Niciodată / Câteva lecții /
  Joc regulat / Joc turnee; Nu joc turnee / progres / Să joc turnee), copiii prin părinte.
- **Pagina antrenorului** scurtă: rol, descriere, un singur bloc „Parcurs”.
- **Butoane fixe pe telefon** (Rezervă, WhatsApp) și asistentul clubului, care apare pe telefon
  abia după primul ecran, ca să nu acopere butoanele.
- Verificat pe iPhone 14, iPhone SE, Pixel 7, Galaxy S9+, iPad (portret și peisaj), laptop 1366 și
  monitor 1920: fără derulare laterală, fără imagini lipsă, fără erori în consolă.

**Limita actuală**: fotografiile. Există logoul, două fotografii reale și un video compus din ele;
antrenorii apar cu inițiale. Fotografiile reale ale clubului sunt cea mai mare îmbunătățire
posibilă a designului și a conversiei (vezi `CONTENT-TODO.md`).

---

## 6. Tehnic și performanță

### 6.1 Lighthouse (build de producție)

| Pagina | Telefon (Perf / Acces. / Bune pr. / SEO) | Desktop |
| --- | --- | --- |
| Prima pagină | 92 / 100 / 100 / 100 | 99 / 100 / 100 / 100 |
| Programe | 85 / 100 / 100 / 100 | 99 / 100 / 100 / 100 |
| Închiriere teren | 86 / 100 / 100 / 100 | 99 / 100 / 100 / 100 |
| Turnee | 84 / 100 / 100 / 100 | 99 / 100 / 100 / 100 |
| Antrenor | 85 / 100 / 100 / 100 | 99 / 100 / 100 / 100 |
| Contact | 85 / 100 / 100 / 100 | 99 / 100 / 100 / 100 |

Pe telefon, scorul de laborator simulează un procesor de 4 ori mai lent și o rețea 4G lentă.
Timpul real măsurat până la cel mai mare element (LCP) este de 0,3–1,3 s, iar deplasarea
conținutului (CLS) este 0. Scorul Google pentru vizitatorii reali (Core Web Vitals, după 28 de
zile de trafic) se bazează pe aceste valori reale.

### 6.2 Optimizări făcute la livrare

| Optimizare | Efect |
| --- | --- |
| Video-ul pornește după încărcarea paginii; pe telefon 360p | prima încărcare: de la ~3 MB la 0,6 MB |
| Biblioteca de validare (Zod) scoasă din paginile publice | JavaScript: de la 270 KB la 180 KB |
| Doar traducerile folosite în browser sunt trimise paginii | ~14 KB mai puțin pe fiecare pagină |
| Secțiunile de jos ale primei pagini se calculează doar când se apropie | randare inițială mai ușoară |
| Imagini AVIF/WebP pe mărimi, fonturi locale cu `font-display: swap` | fără blocarea textului |
| CSP strict cu nonce, fără avertismente în Chrome | Bune practici 100 |

### 6.3 Rezistența la trafic

Măsurat pe un singur nucleu de procesor: **26–37 de pagini pe secundă** (50 de vizitatori
simultani, zero erori), adică aproximativ **90.000–130.000 de pagini pe oră**. Fotografiile,
video-urile și fișierele statice nu trec prin aplicație: le servește direct Caddy, cu cache de un
an. Formularele și asistentul au limite pe vizitator. Pentru un club, chiar și o campanie virală
rămâne mult sub această capacitate.

Dacă va fi nevoie de mai mult (ex. reclame naționale): un server cu 4 procesoare și 4 GB RAM și o a
doua instanță a aplicației în `docker-compose.yml`, cu Caddy împărțind traficul; codul nu trebuie
schimbat.

### 6.4 Securitate și date personale

HTTPS automat cu HSTS, CSP strict, cookie-uri de sesiune securizate, parole cu hash, limite la
autentificare, baza de date neexpusă, backup zilnic 14 zile; GDPR: acord explicit în formulare,
versiunea politicii salvată cu fiecare acord, ștergerea datelor clientului din admin, scripturi de
măsurare doar după acordul din banner, fotografii cu minori doar cu acordul părinților.

### 6.5 Asistentul clubului

Funcționează **fără cheie AI**: răspunde din datele clubului (prețuri, program, oferte, grupe,
antrenori, adresă, tabere, card cadou etc.) și, dacă nu știe, trimite la telefon. Cu o cheie
Anthropic în `.env`, răspunde liber, tot doar din conținutul publicat. Verificat automat (inclusiv
accesibilitatea ferestrei) la fiecare rulare a testelor.

---

## 7. Accesibilitate

100/100 în Lighthouse și zero erori axe (WCAG 2.2 AA) pe 21 de pagini: contrast verificat pentru
culorile clubului, navigare din tastatură, legătură „Sari la conținut”, etichete pe toate
câmpurile, mesaje de eroare anunțate, video cu buton de pauză (WCAG 2.2.2), animațiile oprite
pentru cine are „reduce motion”.

---

## 8. Riscuri și recomandări juridice

1. **„Cel mai mic preț din București”** (textul cerut pentru campania de iarnă): o afirmație
   superlativă trebuie să fie adevărată și dovedibilă (Legea 158/2008 privind publicitatea
   înșelătoare și comparativă). În cercetare au apărut baze care anunță 45–60 RON/oră în anumite
   intervale. Recomandare: păstrați o comparație datată a prețurilor (capturi de ecran) sau
   înlocuiți cu o formulare sigură, de ex. „Unul dintre cele mai bune prețuri din București: 60
   RON/oră pe zgură acoperită”. Textul se schimbă din admin, fără programator.
2. **Fotografiile cu copii**: doar cu acordul scris al părinților (bifa din Galerie).
3. **Paginile legale** sunt complete, dar trebuie validate de un jurist înainte de lansare.
4. **Rezultatele sportivilor minori**: doar prenumele și inițiala, cu acord (aplicat automat).

---

## 9. Ce s-a verificat la livrare

| Verificare | Rezultat |
| --- | --- |
| TypeScript strict, ESLint, Prettier | fără erori |
| Teste unitare și de integrare (Vitest) | 114 trecute |
| Teste end-to-end (Playwright): rezervare, rezervare dublă simultană, confirmare, anulare, închiriere, înscrierea copiilor, card cadou, ligă, parteneri, asistent, accesibilitate | 21 trecute (unul sărit intenționat: banner-ul de cookie-uri, fără servicii de măsurare configurate) |
| 8 dispozitive × 13 pagini: derulare laterală, imagini, H1, erori în consolă | fără probleme |
| Audit de text pe 120 de pagini (RO și EN): „[DE COMPLETAT]”, „academie”, numele vechi, „biomecanică”, orele vechi, brand personal | niciun rezultat pe paginile publice |
| Diacritice corecte (ș, ț cu virgulă) în tot codul | verificat automat |
| Redirecționările vechi, sitemap, robots, llms.txt, JSON-LD | corecte |

Limită de mediu: pe serverul de lucru există doar Chromium, deci Safari (iPhone, iPad, Mac) a fost
verificat prin emularea dimensiunilor și a comportamentului tactil, nu pe motorul WebKit real. Se
recomandă o verificare rapidă pe un iPhone real după publicare.

---

## 10. Următorii pași, în ordinea impactului

1. Fotografiile și video-ul real al clubului, fotografiile antrenorilor (`CONTENT-TODO.md`, 1–2).
2. Google Business Profile complet, cu linkul de recenzie în admin și QR-ul la recepție.
3. Decizia despre formularea „cel mai mic preț din București” (secțiunea 8).
4. Validarea paginilor legale de către un jurist.
5. Publicarea pe domeniul elitetenisclub.ro (`DEPLOY.md`), apoi înregistrarea în Google Search
   Console și trimiterea sitemap-ului.
6. Coordonatele hărții și numele de familie al antrenorului Bogdan.
7. Un articol pe lună și 5–10 recenzii noi pe lună.
