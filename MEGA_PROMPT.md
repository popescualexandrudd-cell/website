# MEGA-PROMPT — JUNGLE PADEL · Sistem digital complet (pentru Claude Code)

> Versiune document: 1.0 · Data: 26 septembrie 2026 · Limba de lucru: română (cod, identificatori și commit-uri în engleză; toate textele pentru clienți, personal și proprietar în română, cu traduceri).
> Acest document este SURSA DE ADEVĂR a proiectului. Rezumă integral conversația de planificare cu proprietarul, inclusiv fiecare decizie, fiecare preferință și fiecare ambiguitate rămasă deschisă. Nu omite nimic din el. Când ceva lipsește sau e neclar, ÎNTREABĂ, nu presupune în tăcere.

---

## 0. CUM FOLOSEȘTI ACEST DOCUMENT

### 0.1 Pentru proprietar (om)
1. Creează un folder gol pe calculator, de exemplu `jungle-padel`.
2. Pune acest fișier în folder cu numele `MEGA_PROMPT.md`.
3. Deschide Claude Code în acel folder și scrie: „Citește integral MEGA_PROMPT.md și începe cu Etapa 0. Nu scrie cod de aplicație până nu îți aprob Etapa 0.”
4. Răspunde la întrebările pe care ți le pune. Aprobă fiecare etapă înainte să treacă la următoarea.
5. Videoul cu site-ul clubului de tenis nu trebuie atașat: ideea lui e descrisă în secțiunea 9.1. Dacă vrei, pune capturi de ecran în `docs/01-viziune-si-business/inspiratie/` (doar ca inspirație, nu pentru copiere).

### 0.2 Pentru Claude Code (primele acțiuni obligatorii)
1. Citește acest document de la cap la coadă, de două ori, înainte de orice acțiune.
2. Inițializează un repository git și structura de foldere din secțiunea 4.4.
3. Împarte acest document în fișiere de documentație (secțiunea 4.5) și creează `CLAUDE.md` în rădăcină: un rezumat operațional al regulilor de lucru, al arhitecturii și al deciziilor, pe care îl actualizezi la fiecare etapă, ca orice sesiune viitoare să poată continua proiectul fără pierderi de context.
4. Creează `docs/00-management/INTREBARI_DESCHISE.md` cu toate întrebările din secțiunea 17, fiecare cu varianta implicită propusă, și `docs/00-management/PROGRES.md`.
5. Prezintă proprietarului, în română simplă: planul Etapei 0, întrebările cele mai urgente (cele care blochează primele etape) și ce ai nevoie de la el. Apoi AȘTEAPTĂ aprobarea.
6. Nu livra niciodată totul dintr-odată. Lucrezi pe etape și, pentru website, secțiune cu secțiune (secțiunea 16).

---

## 1. ROLUL TĂU

Ești simultan, la cel mai înalt nivel profesional:
- **Arhitect software și senior developer full-stack** (Python/Django, TypeScript/React/Next.js, PostgreSQL, sisteme în timp real, integrare hardware).
- **Inginer QA și de testare automată** (unit, property-based, integrare, end-to-end, simulări, încărcare, securitate, accesibilitate).
- **Inginer de securitate și specialist GDPR** (cu limitarea explicită că documentele legale trebuie revizuite de un avocat).
- **Inginer DevOps / SRE** (deploy pe server propriu, backup, monitorizare, recuperare după dezastru).
- **Product manager și designer UX/UI** (experiențe de tip „simulator”, chioșcuri tactile, ecrane de afișaj).
- **Specialist SEO** (în mesajele proprietarului apare „CEO”; înseamnă SEO: optimizare pentru motoarele de căutare) și **analist de business cu gândire de CEO** (strategie, prețuri, KPI, creștere).
- **Strateg de marketing, branding, promovare și vânzări.**
- **Mentenanța pe termen lung**: proprietarul NU are programator. Tu construiești și tu întreții sistemul, în sesiuni succesive. Scrie totul astfel încât o sesiune viitoare (sau un programator angajat ulterior) să înțeleagă instant ce, de ce și cum.

### 1.1 Principii de lucru (obligatorii)
1. **Verifici de două ori orice funcție înainte să o livrezi.** Pentru fiecare modul: (a) îl scrii; (b) îl rulezi și îl testezi automat; (c) faci o revizuire logică „cap-coadă” a fluxului real (ce se întâmplă cu un client real, pas cu pas, inclusiv erorile); (d) a doua revizuire, din perspectiva unui atacator și a unui caz-limită; (e) abia apoi livrezi.
2. **Fișiere complete.** Niciodată cod trunchiat, „...”, „restul rămâne la fel” sau TODO-uri ascunse în codul de producție. Dacă ceva depinde de o informație lipsă (preț, model de hardware), faci o configurare explicită, cu valoare implicită sigură, marcată `DE_CONFIRMAT` în documentație și vizibilă în panoul de admin.
3. **Organizare pe foldere, nu un singur fișier.** Fiecare aplicație are folderul ei, README, `.env.example`, Dockerfile, instrucțiuni de rulare și de deploy separate (secțiunea 4.4). Proprietarul vrea „foldere multe, cu tot ce e nevoie”, nu „un index cu totul în el”.
4. **Nu presupui în tăcere.** Orice ambiguitate intră în `INTREBARI_DESCHISE.md` cu varianta implicită, iar tu o semnalezi la finalul etapei.
5. **Sistem propriu, unic, fără dependență de platforme terțe** (fără Playtomic, fără SaaS de rezervări). Codul, datele și logica sunt ale clubului. Excepții inevitabile, toate prin interfețe interschimbabile (adaptoare): procesatorul de plăți online, casa de marcat fiscală, certificatele Apple/Google Wallet, furnizorul de email, furnizorul modelului AI, eventual un furnizor de SMS. Preferă biblioteci open-source auto-găzduite.
6. **Explică proprietarului în română simplă.** La finalul fiecărei etape: ce ai făcut, cum verifică el (pași concreți, click cu click), ce urmează, ce decizii are de luat.
7. **Calitate „fără erori”.** Standardul e: teste automate verzi, acoperire mare pe logica critică (liga și banii la 100% ramuri), lint și type-check curate, zero avertismente ignorate, jurnal de audit pe tot ce ține de bani, scoruri și date personale.
8. **Bani = numere întregi în bani (RON × 100).** Niciodată float pentru sume. Fus orar unic `Europe/Bucharest`, cu trecerile de oră (DST) tratate și testate.

---

## 2. CONTEXTUL PROIECTULUI (business)

### 2.1 Locația și terenul
- Adresa: **Șoseaua Biruinței, lângă Selgros Pantelimon** (Pantelimon, Ilfov, zona de est a Bucureștiului).
- Teren de **3.300 m²**, cu **deschidere la două străzi**. Posibilă extindere până la **~3.500 m²**.

### 2.2 Ce se construiește
- **Hala principală „Jungle Padel”**: 4 terenuri de padel **închise, customizate**, sală **încălzită și răcită**, cu recepție, vestiare, **cafenea de specialitate** și o **zonă la 3 m înălțime (mezanin) pentru vizualizarea terenurilor**. Boxe audio, petreceri cu DJ.
- **Clădire mică de Pilates** (maxim cât un teren de padel): **4 aparate Reformer la început, ulterior până la 6**. Încălzită și răcită.
- **Mini sală de evenimente** (maxim cât un teren de padel) pentru petreceri de **15–20 de persoane**. Încălzită și răcită.
- **Traseu de mini parkour pentru copii**, în exterior, neacoperit, utilizabil doar când temperaturile permit. **Pe site NU apare la lansare** (se activează după deschiderea padelului).
- **Alee** de acces pe lângă traseul de parkour, spre padel și înapoi.
- **Parcare**: **18 locuri în spate + 10 locuri în față** (28 în total).
- **Teren de tenis** pe acest amplasament: **încă nedecis** (depinde de extinderea terenului). Sistemul trebuie să poată adăuga ulterior resurse noi (terenuri, săli) din admin, fără cod nou.

### 2.3 Clubul de tenis existent (sinergie)
- Proprietarii au deja un club de tenis: **Clubul Tenis Elite, Pantelimon** (din 2013, 8 terenuri de zgură, 4 acoperite iarna, peste 250 de recenzii Google, programe pentru copii și adulți, conform site-ului lor actual).
- Clubul de tenis va fi folosit pentru promovare, atragere de clienți pentru padel și clienți pentru tenis.
- Prețuri tenis comunicate: **120 RON/oră închiriere teren**; **~240 RON/oră tenis în interior pe timpul iernii**; **vara mai ieftin**. (Vezi întrebarea deschisă Q20: sistemul gestionează și terenurile clubului Tenis Elite, adică mai multe locații? Proiectează de la început suport pentru **mai multe locații**.)

### 2.4 Calendar și resurse
- **Deschiderea, cu inaugurare: martie 2027** (aproximativ 6 luni de acum).
- **Nu există programator.** Tu construiești și întreții.
- **Server propriu** (vezi Q22 pentru detalii). Domeniul urmează să fie cumpărat.
- **Logo, culori și fonturi nu sunt stabilite**; se stabilesc în următoarele ~6 luni. Designul trebuie construit pe „design tokens” interschimbabile (secțiunea 12.4).

### 2.5 Obiectivul de business
Crearea unei **comunități de sportivi** care vin și joacă de plăcere: padel (atracția principală), tenis, pilates, plus atracții conexe: cafenea, evenimente, parc pentru copii. Totul **digitalizat complet, cu AI**, cu o **ligă de padel de tip MMR** care creează dinamică și îi face pe oameni să revină.

---

## 3. CONCEPTUL „JUNGLE PADEL” (pentru conținut, design și funcții)

- Tematica: **Jungle Padel**. Palmieri, **plante care coboară din tavan**, **lumini spectaculoase**, design modern, estetic, care atrage oamenii. Muzică, boxe, seri cu DJ.
- Experiența: nu doar închiriezi un teren, ci îți petreci seara în club (sport + cafenea + socializare + evenimente).
- Propuneri de concept discutate (NECONFIRMATE, de prezentat ca opțiuni, vezi secțiunea 18): terenuri botezate cu nume de animale (Jaguar, Tucan, Gorila, Anaconda), un teren „center court” panoramic spre mezanin pentru finale și transmisiuni, scene de lumină programate (mod „zi” pentru joc, mod „Jungle Night” pentru petreceri), sunet reglabil pe zone, lounge pe mezanin cu ecrane, automatizarea luminilor și climatizării în funcție de rezervări, panouri fotovoltaice, acces 24/7 cu ușă smart.
- Note tehnice de construcție transmise deja proprietarului (nu sunt sarcini software, dar pot apărea în conținut sau FAQ): înălțime liberă minimă 6 m deasupra terenurilor (recomandat 8–10 m); plantele de deasupra terenurilor trebuie să fie în afara zonei de joc și, ideal, stabilizate sau artificiale; spațiul pentru un teren de tenis (~600–670 m²) probabil nu încape doar cu extinderea de 200 m²; verificări POT/CUT și normativ de parcare; verificarea mărcii „Jungle Padel” la OSIM/EUIPO.

---

## 4. ARHITECTURA SISTEMULUI

### 4.1 Principiul de bază
- **Website-ul și nucleul central (backend) sunt baza funcțională a întregului sistem și singura sursă de adevăr.** Toate celelalte aplicații sunt „ferestre” spre aceleași date, conectate live: chioșcul de ligă, chioșcul de plăți, ecranele de la terenuri, ecranele din lobby/cafenea/mezanin, afișajul cafenelei și panoul de admin.
- Nicio aplicație client nu ține date „adevărate” local. Excepție controlată: jurnalul local de numerar al chioșcului de plăți (secțiunea 8.4), sincronizat obligatoriu cu serverul.
- **Clienții de la distanță (website, telefon) pot doar să vizualizeze liga.** Nu pot introduce și nu pot modifica niciun scor. Pot, în schimb, să-și creeze cont, să rezerve, să cumpere pachete (când plățile online sunt active), să-și vadă progresul.
- **Scorurile se introduc exclusiv la chioșcul de ligă din club.** Regula se aplică pe server, nu doar în interfață (secțiunea 12.1).
- **AI-ul este conectat la toate sistemele, dar cu permisiuni limitate** (secțiunea 10): poate citi date autorizate, propune, recomanda, redacta și face rezervări în numele unui client autentificat. Nu atinge niciodată scoruri, rating, clasamente, bani sau date GDPR.
- Totul este conectat live: rezervările, datele ligii, jucătorii care urmează, orele. Orice validare de scor se reflectă instant pe site, pe ecrane și pe chioșcuri.

### 4.2 Componente
1. **Backend central (API + logică de business)**: conturi, rezervări, prețuri, plăți și registru contabil intern, abonamente/pachete, antrenori, pilates, prezențe, ligă, turnee, evenimente, cafenea, recompense, recomandări, notificări, AI, conținut (CMS), traduceri, dispozitive, audit, feature flags.
2. **Motorul ligii** (pachet Python pur, fără Django, testabil izolat): rating MMR, LP, ranguri, sezoane, reguli anti-abuz, simulări.
3. **Website public + zona de cont (PWA)**: site de tip „simulator” (secțiunea 9), multilingv, cu liga live, rezervări și configurator de pachete.
4. **Panou de admin**: control total asupra oricărei date și setări (secțiunea 8.6).
5. **Chioșc Ligă** (aparat fizic 1): scanare carduri, înscriere în ligă cu formular GDPR, introducere și confirmare scor, clasamente, provocări, check-in.
6. **Chioșc Plăți** (aparat fizic 2): check-in, plată rezervări (integral sau împărțit), taxe, abonamente, produse de cafenea, numerar cu rest, bon fiscal.
7. **Ecrane la fiecare teren** + **ecrane de lobby / cafenea / mezanin** (afișaj live).
8. **Afișajul cafenelei** (listă de comenzi venite de la chioșcul de plăți).
9. **Hardware Bridge**: serviciu local pe fiecare aparat (scanner QR, acceptor și reciclator de numerar cu rest, imprimantă fiscală, imprimantă de bonuri), cu drivere interschimbabile și simulatoare pentru dezvoltare.
10. **Serviciul de carduri și Wallet**: legitimații cu cod QR, Apple Wallet și Google Wallet, fișier de tipar pentru cardul fizic.
11. **Stratul AI**: asistent, matchmaking, notificări inteligente, Meciul zilei, rapoarte, copilot pentru admin, detecție de anomalii.
12. **Notificări**: email + telefon (notificări push din aplicația web; SMS opțional, vezi Q17). **Fără WhatsApp la lansare.**

### 4.3 Stack tehnic (decizie inițială, documentată ca ADR în Etapa 0)
- **Backend**: Python 3.12+, **Django 5** + Django REST Framework (sau Django Ninja; alege și justifică în ADR), **PostgreSQL 16+**, **Redis** (cache, pub/sub), **Django Channels / WebSockets** pentru date live, **Celery + Celery Beat** pentru sarcini programate (notificări, expirări, decay, AI, rapoarte). Schemă OpenAPI generată automat.
- **Frontend**: TypeScript. **Next.js** (App Router, SSR/SSG, esențial pentru SEO) pentru website și zona de cont; **React + Vite** pentru admin, chioșcuri, ecrane și afișajul cafenelei. Client API generat din OpenAPI. Componente UI și design tokens partajate.
- **Hardware Bridge**: Python (asyncio), rulează local pe aparat, expune un WebSocket pe `localhost` cu mesaje semnate către aplicația de chioșc din browser. Jurnal local SQLite, append-only, pentru evenimentele de numerar.
- **Chioșcuri și ecrane**: browser în mod kiosk pe tot ecranul (implicit Linux + Chromium; documentează și varianta Windows), cu pornire automată, watchdog și ecran de „serviciu indisponibil” când lipsește conexiunea.
- **Infrastructură**: Docker + Docker Compose pe serverul propriu, reverse proxy cu TLS automat (Caddy sau Nginx + Let's Encrypt), backup automat criptat, monitorizare auto-găzduită (de exemplu Uptime Kuma + un colector de erori auto-găzduit), analytics auto-găzduit fără cookie-uri (de exemplu Umami sau Plausible CE).
- **Calitate**: `ruff` + `mypy` (strict pe motorul ligii și pe bani), `pytest` + `hypothesis`, ESLint + Prettier + `tsc --strict`, Vitest, **Playwright** (end-to-end), k6 sau Locust (încărcare), `axe` (accesibilitate), pre-commit hooks, CI local rulabil cu o singură comandă.

### 4.4 Structura de foldere (monorepo; fiecare aplicație poate fi rulată și pusă pe domeniul ei separat)
```
jungle-padel/
├── CLAUDE.md                      # memoria operațională a proiectului (menținută la zi)
├── MEGA_PROMPT.md                 # acest document (nu se modifică; modificările merg în docs/)
├── README.md                      # prezentare + pornire rapidă pentru proprietar
├── docs/
│   ├── 00-management/             # PROGRES.md, INTREBARI_DESCHISE.md, CALENDAR.md, CHANGELOG.md
│   ├── 01-viziune-si-business/
│   ├── 02-reguli-business/        # reguli cu ID-uri R-xxx (secțiunea 5)
│   ├── 03-liga/                   # specificația completă a ligii + rapoarte de simulare
│   ├── 04-arhitectura/            # diagrame, ADR-uri (decizii tehnice numerotate)
│   ├── 05-api/                    # OpenAPI + ghid
│   ├── 06-date/                   # model de date, dicționar de date, retenție
│   ├── 07-securitate-gdpr-legal/  # politici, formular GDPR, registru de prelucrări, DPIA
│   ├── 08-deploy-si-mentenanta/   # runbook-uri, backup/restore, incidente, actualizări
│   ├── 09-hardware/               # chioșcuri, scannere, numerar, fiscal, ecrane
│   ├── 10-seo/
│   ├── 11-marketing/
│   ├── 12-branding/
│   ├── 13-vanzari/
│   ├── 14-regulament-public/      # regulamentul clubului, afișat pe site și la recepție
│   └── 15-instruire-personal/     # ghiduri pentru recepție, antrenori, manager
├── apps/
│   ├── backend/                   # Django (API, admin tehnic de rezervă, sarcini, WebSockets)
│   ├── web/                       # Next.js: website public „simulator” + cont client (PWA)
│   ├── admin/                     # panoul de admin complet (React)
│   ├── kiosk-league/              # chioșcul de ligă
│   ├── kiosk-payments/            # chioșcul de plăți
│   ├── court-screens/             # ecrane teren + lobby/cafenea/mezanin
│   └── cafe-display/              # afișaj comenzi cafenea
├── packages/
│   ├── league-engine/             # Python pur: rating, LP, ranguri, sezoane, simulări
│   ├── design-tokens/             # culori, tipografie, spațiere (interschimbabile)
│   ├── ui/                        # componente React partajate
│   ├── api-client/                # client TypeScript generat din OpenAPI
│   └── i18n/                      # cataloage de traduceri (ro, en, es, it, zh, ...)
├── services/
│   └── hardware-bridge/           # drivere + simulatoare: scanner, numerar, fiscal, imprimantă
├── deploy/
│   ├── compose/                   # docker-compose pe medii (dev, staging, prod)
│   ├── proxy/                     # Caddy/Nginx, subdomenii, TLS
│   ├── backup/                    # scripturi backup/restore + test de restaurare
│   ├── monitoring/
│   └── kiosk-os/                  # scripturi de configurare a aparatelor (mod kiosk, pornire automată)
├── scripts/                       # setup local, seed date demo, rulare toate testele, simulare ligă
└── tests/
    ├── e2e/                       # Playwright: fluxuri complete între aplicații
    ├── load/
    └── security/
```
Fiecare folder din `apps/`, `packages/` și `services/` conține: `README.md` (ce face, cum rulezi local, cum testezi, cum faci deploy, variabile de mediu), `.env.example`, `Dockerfile` (unde e cazul), teste proprii.

### 4.5 Documentația derivată din acest prompt
În Etapa 0, împarte conținutul acestui document în `docs/` (fiecare secțiune în folderul potrivit), păstrând ID-urile regulilor. `MEGA_PROMPT.md` rămâne neschimbat ca referință istorică. Orice decizie nouă se scrie ca ADR sau ca regulă nouă, cu dată și cu sursa („confirmat de proprietar la data X”).

### 4.6 Domenii și subdomenii (numele domeniului: `DE_CONFIRMAT`, notat `<domeniu>`)
- `www.<domeniu>`: website + cont client
- `api.<domeniu>`: API
- `admin.<domeniu>`: panou de admin (acces restricționat, 2FA)
- `kiosk-liga.<domeniu>`, `kiosk-plati.<domeniu>`, `ecrane.<domeniu>`, `cafe.<domeniu>`: accesibile doar pentru dispozitive înregistrate (secțiunea 12.1)
- `status.<domeniu>`: pagina de stare (opțional)

---

## 5. REGULI DE BUSINESS CONFIRMATE (cu ID-uri pentru trasabilitate în cod și teste)

> Convenție: fiecare regulă are un ID `R-xxx`. Testele care o verifică menționează ID-ul în nume sau docstring. Regulile marcate „(Q..)” au o parte încă neclară, cu varianta implicită descrisă aici și întrebarea în secțiunea 17.

### 5.1 Conturi, identitate, validare
- **R-001** Fiecare persoană care joacă, se antrenează sau intră în ligă are cont propriu. Contul se creează online (website) sau asistat la recepție.
- **R-002** Date la înregistrare: nume, prenume, email (verificat), telefon, data nașterii (pentru verificarea vârstei), limba preferată, acordurile legale. Opțional: poză doar pentru uz intern (nu publică).
- **R-003** **Chestionarul de nivel** se completează la crearea contului (online sau la chioșc). Rezultatul (nivel estimat 1.0–7.0) e **validat de un antrenor** în admin înainte de prima participare în ligă (secțiunea 6.4).
- **R-004** Adminul vede, pentru fiecare utilizator: data creării contului, data verificării emailului, data validării nivelului și de către cine, data și versiunea acordului GDPR și pe ce dispozitiv s-a semnat, data intrării în ligă, toate rezervările, plățile, prezențele, istoricul din ligă, notificările trimise și jurnalul de audit. („Vom putea vedea cine și-a făcut cont, când a validat, toate detaliile despre el.”)
- **R-005** Fiecare utilizator are un cont personal în care își vede progresul: nivelul, rangul, LP, istoricul meciurilor, prezențele, abonamentul, sesiunile rămase, plățile, cardurile, insignele, recompensele.
- **R-006** **Minori**: NU sunt acceptați în ligă (liga e 18+, verificat după data nașterii). O ligă separată de juniori ar fi posibilă doar cu acordul părinților: modul pregătit, dar DEZACTIVAT (feature flag). Conturi de copii gestionate de părinți pentru antrenamente, fără ligă: vezi Q7.

### 5.2 Liga și GDPR la înscriere
- **R-010** Înscrierea în ligă se face **la chioșcul de ligă**: jucătorul scanează cardul, citește **formularul GDPR complet** (buton dedicat „GDPR”) și **bifează obligatoriu** acordul. Fără bifă, nu se poate înscrie.
- **R-011** Acordul se înregistrează cu: ID utilizator, versiunea textului, hash-ul textului, data și ora, ID-ul dispozitivului, limba afișată. Retragerea acordului e posibilă din cont și are efectul descris în secțiunea 12.2.
- **R-012** **Date publice despre un jucător (site, ecrane, chioșcuri, clasamente): doar nume, prenume, nivel (rang + nivel numeric), puncte (LP) și locul în clasament. Nimic altceva.** Statisticile detaliate se văd doar în contul propriu și de către admin. (Afișarea publică a rezultatelor meciurilor și a „Meciului zilei”: vezi Q30.)

### 5.3 Carduri (legitimații)
- **R-020** Fiecare jucător primește o **legitimație cu cod QR**, emisă din website/sistem, trimisă pe **email**, de unde o poate adăuga în **Apple Wallet** și în **Google Wallet** (ambele confirmate).
- **R-021** **Cardurile fizice le produc proprietarii** („le facem noi de mână”). Sistemul generează fișierul de tipar (PDF la dimensiunea standard de card CR80, 85,60 × 53,98 mm, cu QR, nume și prenume) și o coadă de „carduri de emis” în admin.
- **R-022** Codul QR conține un **token aleatoriu** (nu date personale), revocabil. Card pierdut → blocare instant din cont sau admin → reemitere. Toate cardurile vechi ale unui utilizator devin invalide la reemitere.
- **R-023** Cardul din Wallet se **actualizează automat** (rang, LP) după fiecare meci validat.
- **R-024** **Card fizic nou la promovarea în Diamant**, la care jucătorul „alege de junglă” (o temă sau emblemă din junglă dintr-o listă predefinită). **NU se face card de design personalizat** (proprietarul a refuzat explicit cardul „de design”). Detalii: Q1.
- **R-025** Cardul se folosește peste tot: check-in, intrarea pe teren, prezențe la antrenamente și pilates, ligă, plăți, cafenea.

### 5.4 Check-in și prezențe
- **R-030** **Check-in confirmat**: la sosire, jucătorul scanează cardul (la chioșc sau la un punct de scanare).
- **R-031** **La intrarea pe teren, TOȚI jucătorii sunt obligați să scaneze cardul**, indiferent ce joacă (meci oficial, antrenament, închiriere liberă). La rezervare e suficient să fie trecut un singur jucător (organizatorul). Punctele de scanare (scanner lângă fiecare teren și ecranul lui sau chioșcul central): vezi Q23.
- **R-032** **Prezențe automate** la antrenamente de padel și tenis și la pilates: scanarea cardului la intrare = prezență. **Antrenorii nu trebuie să facă absolut nimic.** Sistemul ține evidența prezențelor pentru fiecare persoană și fiecare sesiune.
- **R-033** Instructorul de pilates și antrenorii își gestionează programul în platformă și își văd prezențele.
- **R-034** Scanarea poate declanșa integrări opționale (luminile sau climatizarea terenului): doar interfață pregătită, dezactivată.

### 5.5 Rezervări
- **R-040** Se poate rezerva online (website/PWA) și la recepție/chioșc, pentru toate componentele: **padel** (atracția principală), **tenis**, **pilates** (clase și ședințe), **lecții individuale cu antrenor** (padel, tenis, reformer), **sala de evenimente**. Parkourul nu apare la lansare.
- **R-041** **Durate: minimum 60 de minute, apoi din 30 în 30 de minute: 60, 90, 120, 150, 180.** Maximum 180. (Q2: e permis 150?) Orele de start pe grilă de 30 de minute.
- **R-042** **Orizontul de rezervare e nelimitat:** se poate rezerva cu oricât timp înainte, fără criterii. („Cu cât avem mai multe rezervări din timp, cu atât mai bine.”) Cum se aplică „prioritatea abonaților” în acest context: Q4.
- **R-043** Suprapunerile sunt imposibile la nivel de bază de date (constrângere de excludere pe intervale de timp în PostgreSQL), nu doar în cod.
- **R-044** Tipul sesiunii se stabilește la rezervare și e afișat pe ecranul terenului: Meci oficial de ligă · Antrenament/amical · Lecție cu antrenor · Turneu · Provocare · Închiriere liberă. (Poate fi schimbat până la check-in: Q29.)

### 5.6 Intervale orare și prețuri
- **R-050** Benzi orare confirmate: **08:00–12:00 semi-vârf**; **12:00–13:00 în afara vârfului**; **15:00–22:00 vârf**. Nedefinite încă: 13:00–15:00, după 22:00, programul de funcționare și weekendul (Q3). Varianta implicită până la confirmare: 13:00–15:00 și 22:00–închidere = în afara vârfului; weekendul identic cu zilele lucrătoare.
- **R-051** **Motor de prețuri configurabil din admin** pe: locație × resursă/sport × sezon (vară/iarnă, cu datele de schimbare configurabile) × bandă orară × durată × tip client (abonat/neabonat, corporate) × tip sesiune (închiriere, lecție, clasă). Prețuri cunoscute: tenis 120 RON/oră închiriere; ~240 RON/oră tenis interior iarna; vara mai ieftin. **Padelul, pilatesul, lecțiile, sala de evenimente și cafeneaua nu au prețuri stabilite:** configurabile, cu valori demo marcate `DE_STABILIT` (Q21).
- **R-052** O rezervare care traversează mai multe benzi se taxează proporțional pe fiecare segment de 30 de minute. Testează trecerile de oră (DST).
- **R-053** Regulile de vârf și de abonament sunt **afișate clar în regulament** (pe site și la recepție) și la momentul cumpărării.

### 5.7 Plăți
- **R-060** **Pentru padel nu există credite.** Se plătește ora (sesiunea) de teren, iar jucătorii **o împart între ei**. La chioșc se încasează ora de padel; există funcția **„Împarte ora cu partenerii”**: fiecare își scanează cardul și își plătește partea. Organizatorul poate plăti și integral.
- **R-061** Împărțirea sumei: în bani întregi, cu restul distribuit determinist (primul participant plătește restul de bani, de exemplu 100,01 / 3). Testat.
- **R-062** **Chioșcul de plăți acceptă, la lansare, doar NUMERAR și dă rest.** Aparatul care se cumpără suportă orice metodă (numerar, POS cu card) și orice software, deci arhitectura are adaptoare pentru POS, activabile ulterior. Banca nu e aleasă încă.
- **R-063** Plata online cu card pe website: procesatorul nu e ales (Q9). Până atunci, rezervările online sunt „plată la locație”, cu datorie urmărită în cont.
- **R-064** **Registru contabil intern (ledger) cu dublă înregistrare**, imutabil: orice mișcare de bani (numerar primit, rest dat, plată, rambursare, credit în cont, voucher, discount, taxă de neprezentare) e o înregistrare nemodificabilă. Corecțiile se fac prin înregistrări inverse, cu motiv și autor.
- **R-065** **Contul clientului are un sold** (credit din anulări eligibile, rambursări, recompense) și poate avea **datorii** (taxe de anulare tardivă sau neprezentare, rezervări neplătite).
- **R-066** Fiecare încasare în numerar la chioșc emite **bon fiscal** prin casa de marcat fiscală integrată (obligație legală în România; modelul se alege la achiziție). Facturi pentru corporate, inclusiv e-Factura (Q26).
- **R-067** Idempotență: orice operație de plată are o cheie unică; o re-trimitere nu poate încasa de două ori.

### 5.8 Anulări și neprezentări (aceleași reguli pentru padel, tenis, pilates, lecții)
- **R-070** Anulare cu **cel puțin 24 de ore înainte** → **eligibil pentru recuperare** (sesiunea de abonament se restituie; la închiriere plătită se acordă credit în cont; rambursare: Q14).
- **R-071** Anulare cu **mai puțin de 24 de ore** înainte → **se plătește**.
- **R-072** **Neprezentare** → **se plătește**. Neprezentare = nicio scanare de card a participanților așteptați până la X minute după start (X configurabil, implicit 15).
- **R-073** **La mai mult de două neprezentări** (adică la a treia), sistemul **anunță în platformă antrenorul responsabil**, care decide. **Implicit, jucătorul nu mai poate rezerva până când antrenorul modifică manual starea.** Fereastra de numărare și cine e „antrenorul responsabil” pentru clienții fără antrenor: Q15.
- **R-074** **Lista de așteptare automată:** când cineva anulează, următorul din listă intră automat și primește notificare. Cazul promovării cu mai puțin de 24 de ore înainte: Q16 (implicit, anularea e gratuită în primele 2 ore de la promovare).

### 5.9 Abonamente și pachete
- **R-080** Sporturi combinabile: **Padel, Tenis, Pilates (Reformer)**. Combinații: doar padel, doar tenis, doar pilates, padel + tenis, padel + pilates, tenis + pilates, **All-in-One** (toate trei).
- **R-081** **Configurator în 3 pași, simplu, fără „1000 de secțiuni”**: (1) alegi sporturile; (2) alegi intensitatea pentru fiecare sport; (3) alegi perioada. Prețul se calculează automat.
- **R-082** Intensități standard: **Start = 4**, **Activ = 8**, **Pro = 12** antrenamente/sesiuni pe lună per sport. **Intensități personalizate** (5, 6, 7, 9...) se aleg într-o **secțiune separată „La cerere”**. Modul de stabilire a prețului și de aprobare: Q12.
- **R-083** Ce reprezintă o sesiune dintr-un abonament: **antrenamente** (lecții cu antrenor, clase de grup, clase de pilates). Închirierea de teren se plătește separat, pe oră, împărțită între jucători (R-060).
- **R-084** Reduceri: **2 sporturi −10%**, **3 sporturi −15%**; **trimestrial −5%**, **anual −15%**. Implicit se aplică multiplicativ: preț = Σ(preț sport × intensitate) × (1 − reducere pachet) × (1 − reducere perioadă). Rotunjire la leu întreg, documentată.
- **R-085** **Sesiunile nefolosite NU se reportează** în luna următoare.
- **R-086** **Abonamentul se poate îngheța 2 săptămâni pe an** (se prelungește corespunzător).
- **R-087** **Start: doar în afara orelor de vârf. Activ și Pro: oricând.** (Q13: intră și semi-vârful la Start?) Regula e afișată clar în regulament și la cumpărare.
- **R-088** **Pachete speciale: doar Corporate** (fără pachete de familie sau studenți): cont de firmă, angajați asociați, facturare pe firmă, rapoarte de utilizare (Q35).
- **R-089** Configuratorul apare pe website și pe chioșcul de plăți. Cumpărarea se face la chioșc (numerar) sau online când plata online e activă.

### 5.10 Antrenori, lecții, clase
- **R-090** Lecții individuale cu antrenor: **padel, tenis, reformer.** Ședințe private, duo și de grup.
- **R-091** Fiecare antrenor are calendar, disponibilitate, tarife (configurabile), lista de clienți, prezențe automate și notificări.
- **R-092** Alertă automată către client (și către antrenor, în platformă) când clientul **nu mai participă la antrenamente** (prag configurabil, implicit 2 săptămâni fără prezență, cu abonament activ).

### 5.11 Pilates Reformer
- **R-100** **4 reformere la început, extensibil la 6** din admin (resurse individuale; opțional, clientul își alege aparatul).
- **R-101** Tipuri de clase: **Începători, Intermediar, Avansat, Ședințe private, Duo, Grup, Reformer pentru jucători de tenis/padel, Reformer pentru mămici** (pre/postnatal). Capacitatea unei clase ≤ numărul de reformere active.
- **R-102** Aceleași reguli de anulare și neprezentare ca la tenis/padel, **cu listă de așteptare automată**: când cineva anulează, următoarea persoană intră automat și primește notificare (email + telefon; WhatsApp NU la lansare, vezi Q18).
- **R-103** Un instructor la lansare; programul și prezențele se gestionează în sistem.

### 5.12 Evenimente, parkour, cafenea
- **R-110** **Evenimentele apar pe site de la lansare** (petreceri cu DJ, turnee, sala de evenimente pentru 15–20 de persoane). **Parkourul NU apare la lansare** (feature flag, activat după deschiderea padelului).
- **R-111** **Cafeneaua vinde prin chioșcul de plăți** („mai simplu: doar în aparat”). Toate vânzările de cafenea apar în chioșcul de plăți și în rapoarte. Comanda ajunge pe afișajul cafenelei, iar numărul comenzii apare pe ecranul din lobby când e gata.
- **R-112** Meniu, prețuri, categorii, disponibilitate și, opțional, stoc: configurabile din admin (Q33).

### 5.13 Recomandări, recompense
- **R-120** **Program „Adu un prieten”**: dacă prietenul adus își face **abonament**, **amândoi primesc câte o oră gratuită de padel** (voucher). Se acordă după prima plată a abonamentului, o singură dată per persoană nouă (unicitate verificată prin email + telefon). Benzile orare în care e valabil voucherul: Q32.
- **R-121** Recompensele de sezon (secțiunea 6.12) se emit ca vouchere sau reduceri în registrul contabil intern.

### 5.14 Notificări
- **R-130** Canale la lansare: **email + telefon** (notificări push din aplicația web; SMS opțional prin adaptor, Q17). **Fără WhatsApp** la lansare (adaptor pregătit, dezactivat).
- **R-131** **Comunitatea**: AI-ul generează mesajele pentru grupul comunității (rezultate, clasamente, evenimente, Meciul zilei), iar echipa clubului le postează (platforma grupului: Q19). Sistemul oferă un ecran în admin cu „mesaje generate, gata de copiat”, cu istoric.

### 5.15 Limbi
- **R-140** **Româna** (implicit) și **engleza** sunt obligatorii și complete la lansare, pe website, cont, chioșcuri, ecrane, emailuri și notificări. **Spaniolă, italiană, chineză (simplificată)** și alte limbi internaționale de uz larg (propunere: franceză, germană; Q25) se pot adăuga fără cod nou, din cataloage de traducere. Traducerile generate cu AI sunt marcate „necesită revizuire” până la aprobare în admin.

---

## 6. LIGA JUNGLE — SPECIFICAȚIE COMPLETĂ

> Cerința proprietarului: o ligă „ca la MMR”, structurată complet și corect, fără erori, pe modelul ligilor mari reale de padel și tenis, pe divizii și clasamente. Bați jucători mai buni → câștigi multe puncte. Pierzi cu jucători mai slabi → pierzi multe puncte. Joci cu cineva de nivel egal → câștig mediu. Resetare la 3 luni, ca nimeni să nu scape prea departe și jocul să rămână dinamic.
> Model: sistemul competitiv din jocuri (MMR ascuns + ranguri vizibile + LP, ca în League of Legends/Valorant), combinat cu ligile reale: niveluri 1.0–7.0 (scala folosită larg în padelul amator), promovare/retrogradare pe divizii, puncte bonus pe fază la turnee (logica clasamentului FIP).
> Toți parametrii de mai jos sunt **configurabili din admin, versionați** și intră în vigoare implicit de la sezonul următor (sau imediat, doar cu confirmare explicită și jurnal de audit).

### 6.1 Ce e activ
- **Doar padel** momentan (tenisul poate primi o ligă ulterior; arhitectura permite „sport” ca dimensiune).
- **Trei clasamente (ladders) separate, fiecare cu propriul MMR, LP și rang:**
  1. **Dublu – individual** (principal): fiecare jucător are rating propriu; partenerii se pot schimba.
  2. **Simplu – individual** (padel 1 vs 1).
  3. **Perechi – dublu**: o pereche (combinație neordonată de doi jucători) are rating propriu, actualizat doar când acei doi joacă împreună. Minimul de meciuri pentru clasamentul final pe perechi: Q31 (implicit 6).
- Un meci de dublu actualizează simultan: ratingul individual (dublu) al celor 4 și ratingul celor 2 perechi.

### 6.2 MMR (rating ascuns) — model bayesian cu incertitudine pentru echipe
- Implementează în `packages/league-engine` un model de tip **Weng-Lin (familia OpenSkill / TrueSkill-like)**: fiecare jucător are `μ` (nivel estimat) și `σ` (incertitudine). Nou-veniții se mișcă repede, veteranii stabil.
- Parametri impliciți: `μ0 = 25`, `σ0 = 25/3`, `β = σ0/2`, `τ = σ0/100` (dinamică), parametri de egalitate pentru rezultatele egale ale meciurilor neterminate.
- Echipa în dublu: `μ_echipă = Σμ`, `σ²_echipă = Σσ²`.
- **Probabilitatea de câștig** (folosită și pentru LP și pentru matchmaking):
  `p_A = Φ( (μ_A − μ_B) / sqrt(n·β² + σ²_A + σ²_B) )`, unde `n` = numărul total de jucători din meci, iar Φ = funcția de repartiție normală standard.
- Implementarea proprie se validează numeric în teste față de o implementare de referință open-source (de exemplu pachetul `openskill`, doar ca dependență de test), cu toleranță documentată.
- Actualizările sunt **ponderate** pentru meciurile neterminate (factorul `w` din 6.6).

### 6.3 Nivelul afișat (1.0–7.0)
- `Nivel = clamp(4.0 + (μ − 25)/5, 1.0, 7.0)`, rotunjit la o zecimală. În perioada de plasare se afișează „Nivel provizoriu”.
- Maparea se calibrează prin simulări (6.17). Documentează în `docs/03-liga/` ce înseamnă fiecare nivel, în cuvinte (de la începător la avansat/competiție).

### 6.4 Intrarea în ligă (jucători noi)
1. **Chestionar de nivel** (online sau la chioșc) → nivel estimat `L0` → `μ_initial = 25 + 5·(L0 − 4)`, `σ` ridicat.
2. **Validarea chestionarului de către antrenor** (în admin: poate ajusta `L0` și, implicit, `σ`).
3. **Acord GDPR la chioșcul de ligă** (R-010).
4. **5 meciuri de plasare** (LP ascuns). După al 5-lea, jucătorul primește rangul corespunzător MMR-ului său, plafonat implicit la **Platină IV** (configurabil); LP pornește de la 0.

### 6.5 Ranguri (confirmat: Bronz → Diamant, cu trepte)
- **Bronz, Argint, Aur, Platină, Diamant**, fiecare cu 4 trepte: **IV → III → II → I**; **100 LP pe treaptă**.
- Deasupra: **Maestru** (LP nelimitat) și titlul **Regele Junglei** = **top 10 Maeștri după LP**, dintre cei eligibili (6.10). Regele Junglei e un titlu calculat dinamic, nu o stare stocată.
- **LP total pentru ordonare**: `index_treaptă × 100 + LP` (Bronz IV = 0 … Diamant I = 1900); Maestru = `2000 + LP`.
- **Promovare**: LP ≥ 100 → treapta următoare, `LP = LP − 100` (surplusul se păstrează). Din Diamant I la 100 LP → Maestru cu 0 LP + surplus.
- **Protecție la promovare**: următoarele **3 meciuri** după o promovare nu pot produce retrogradare (LP nu coboară sub 0).
- **Retrogradare**: LP < 0 (fără protecție) → treapta anterioară, cu **LP = 75**. Bronz IV are podea la 0. Maestru cu LP < 0 → Diamant I, LP 75.
- **Departajare** (egalitate de LP total): nivel (μ) mai mare, apoi mai multe meciuri oficiale jucate în sezon, apoi cine a atins primul acel LP. Ordinea e deterministă și testată.

### 6.6 Calculul LP pentru un meci oficial
Pentru fiecare jucător `j` din echipa `A`:
```
S       = 1 (victorie) | 0 (înfrângere) | 0.5 (egalitate, posibilă doar la meci neterminat)
p       = probabilitatea de câștig a echipei A (6.2), calculată ÎNAINTE de actualizare
ΔLP_raw = K × (S − p)                      K = 40  → egal: +20 / −20
D       = LP_total_așteptat(Nivel_j) − LP_total_curent_j
          LP_total_așteptat = (Nivel − 1.0)/6.0 × 2000   (se calibrează prin simulare)
g       = victorie: clamp(1 + D/1000, 0.75, 1.5)
          înfrângere: clamp(1 − D/1000, 0.75, 1.5)       (MMR peste rang → urci mai repede, pierzi mai puțin)
m_tip   = oficial 1.0 | turneu 1.5 | provocare 1.0 (+ bonus 6.11)
w       = factorul de completare (6.8): 1.0 | 0.75 | 0.5
m_rep   = anti-farming (6.10): 1.0 | 0.5 | 0.25
ΔLP     = rotunjire_standard(ΔLP_raw × g × m_tip × w × m_rep) + bonusuri
clamp:    victorie ∈ [+3, +60]; înfrângere ∈ [−60, −3]; egalitate ∈ [−20, +20]
```
- Rotunjire: la cel mai apropiat întreg, cu .5 departe de zero. O victorie nu poate da niciodată LP negativ, o înfrângere nu poate da niciodată LP pozitiv (test de proprietate).
- Exemple de verificat în teste (K = 40, g = 1, m = 1): echipe egale → ±20; echipa mai slabă (p = 0.24) bate echipa mai bună → +30 / −30; echipa mai bună (p = 0.76) bate echipa mai slabă → +10 / −10.
- În simplu, aceeași formulă. În clasamentul pe perechi, `j` e perechea.
- În meciurile de plasare, LP nu se aplică (doar MMR).

### 6.7 Formatul scorului (confirmat: ca la padelul oficial)
- Seturi până la 6 game-uri, **tie-break la 6–6** (până la 7 puncte, cu diferență de 2), **cele mai bune 2 din 3 seturi**.
- Regula la egalitate (40–40): **configurabilă** (Avantaj / Punct de aur / regula oficială în vigoare). **Verifică regulamentul oficial FIP / Premier Padel curent** înainte de a fixa valoarea implicită și documentează sursa.
- Al treilea set: set complet (implicit, ca în regulamentul oficial) sau super tie-break, configurabil per competiție.
- Validator de scor: acceptă doar scoruri posibile (6–0 … 6–4, 7–5, 7–6 cu tie-break valid; fără set 3 la 2–0; câștigătorul matematic corect). Pentru meciurile neterminate acceptă un set parțial (de exemplu 3–2) marcat explicit „neterminat”.

### 6.8 Meciuri neterminate (confirmat)
- Un meci oficial **contează doar dacă s-a jucat cel puțin un set complet**, cu **puncte reduse proporțional**.
- Câștigătorul unui meci neterminat: echipa cu mai multe seturi complete câștigate; la egalitate, echipa cu mai multe game-uri în total (inclusiv setul parțial); la egalitate totală → egalitate (S = 0.5).
- Factorul `w`: meci complet = **1.0**; 2 seturi complete fără câștigător de meci (1–1) = **0.75**; exact 1 set complet = **0.5**; 0 seturi complete → nu contează (devine antrenament).
- **La turnee, ora nu se termină**: meciul de turneu nu e limitat de durata rezervării și se joacă până la final (w = 1.0).

### 6.9 Fluxul de validare (mașină de stări, pe server)
Stări: `PROGRAMAT → ÎN_DESFĂȘURARE → FEREASTRĂ_SCOR_DESCHISĂ → SCOR_PROPUS → CONFIRMAT_DE_TOȚI → (AȘTEAPTĂ_PLATA) → VALIDAT → APLICAT`, plus stările terminale `DISPUTAT`, `EXPIRAT`, `ANULAT`, `CONVERTIT_ANTRENAMENT`.

1. **Rezervarea există** pentru acel teren și interval, e de tip meci oficial (sau provocare/turneu) și e plătită sau în curs de plată. **Nu se pot introduce meciuri jucate în altă parte.** Se poate juca doar la baza clubului.
2. **Toți jucătorii (4 la dublu, 2 la simplu) au scanat cardul la intrarea pe teren** pentru acea rezervare (R-031).
3. **Fereastra de scor se deschide DOAR după ora de final a rezervării** și rămâne deschisă **30 de minute**. Înainte sau în timpul sesiunii, chioșcul refuză, cu mesaj clar („Scorul se poate introduce între 15:30 și 16:00”). La turnee: fereastra se deschide când meciul e marcat terminat (de jucători sau de directorul turneului) și se închide după 30 de minute (Q28).
4. **Un jucător scanează cardul și introduce scorul.** Ceilalți **scanează fiecare cardul și confirmă** (sau contestă) scorul afișat. **Toți trebuie să confirme**, altfel scorul nu se validează.
5. Orice contestare → `DISPUTAT` → apare în admin pentru soluționare (cu jurnal complet). Neconfirmat de toți până la închiderea ferestrei → `EXPIRAT` (nu contează; adminul poate interveni doar cu motiv scris, auditat).
6. **Validarea scorului se face doar în baza plății:** dacă rezervarea e plătită integral (inclusiv toate părțile din „Împarte ora”) → `VALIDAT`. Altfel → `AȘTEAPTĂ_PLATA` până la termenul configurabil (implicit 24 de ore, Q11), apoi `EXPIRAT`. Plata făcută ulterior la chioșcul de plăți validează automat.
7. `APLICAT`: se calculează MMR și LP, se actualizează rangurile, cardurile Wallet, ecranele, site-ul și chioșcurile în timp real și se trimit notificările.
8. **Validări multiple între sisteme**: fiecare tranziție verifică independent rezervarea (sistemul de rezervări), scanările (sistemul de prezențe), plata (registrul contabil) și dispozitivul (doar chioșcul de ligă înregistrat). Toate verificările sunt logate.

### 6.10 Anti-abuz și eligibilitate
- **Minimum de meciuri** (confirmat: cel puțin unul pe săptămână): pentru clasamentul final și recompense sunt necesare **12 meciuri oficiale pe sezon** (configurabil). Nimeni nu poate veni o singură dată, să-l bată pe cel mai bun și să apară între primii.
- Eligibilitate live pentru top (inclusiv Regele Junglei): `meciuri_oficiale ≥ min(12, săptămâni_complete_scurse_din_sezon)`. Cei sub prag apar marcați „sub minimul de meciuri” și sunt excluși din clasamentul final.
- **Randament descrescător**: în ultimele 7 zile, aceiași jucători exacți (aceiași 4 la dublu sau aceiași 2 la simplu): meciurile 1–2 contează 100%, al 3-lea 50%, al 4-lea și următoarele 25%.
- Maximum de meciuri oficiale pe zi per jucător (implicit 3).
- **Limita de diferență de nivel**: proprietarul nu a înțeles propunerea; explică-i simplu (Q5). Implicit DEZACTIVATĂ: orice meci contează, iar formula dă oricum foarte puține puncte când un favorit clar câștigă.
- **Decay (inactivitate)** pentru Diamant și Maestru: după 14 zile fără meci oficial, de la ziua 15: −5 LP/zi în Diamant, −10 LP/zi în Maestru; poate retrograda, dar nu sub Diamant IV. Notificare cu 3 zile înainte.
- **Detecție de anomalii** (AI + reguli statistice): rezultate alternante suspecte între aceleași grupuri, scoruri extreme repetate, conturi care joacă doar între ele. Semnalează în admin; nu modifică nimic automat.
- Minori excluși (R-006). Fără acord GDPR, nu intri în ligă (R-010).

### 6.11 Provocări directe (confirmat)
- Un jucător (simplu) sau o pereche (dublu) poate provoca un adversar aflat **cu maximum o treaptă peste**.
- Cel provocat are 72 de ore să accepte sau să refuze. Are voie la maximum 2 refuzuri pe sezon (configurabil). Ce se întâmplă la al treilea refuz (implicit: nimic, doar se afișează în contul propriu; opțional: înfrângere tehnică) se configurează din admin și se confirmă cu proprietarul.
- Meciul se programează în cel mult 7 zile, se rezervă și se plătește normal și urmează fluxul 6.9.
- Dacă provocatorul câștigă: **+5 LP bonus**. Provocările apar pe chioșc, pe site (în contul propriu) și ca notificare.

### 6.12 Recompense (confirmat)
- **Top 3 Regii Junglei** la final de sezon: **ore gratuite, mingi și un card special**.
- **10–20% reducere luna următoare la abonament și la meciurile jucate** (rezervări): implicit pentru top 3 din fiecare rang (Q6).
- Motor de recompense configurabil per sezon: tip (voucher oră, discount procentual, produs, card), beneficiari (poziții/ranguri), valabilitate, emitere automată la închiderea sezonului, vizibilitate în cont.
- **Card fizic la promovarea în Diamant**, cu alegerea unei embleme de junglă (R-024).
- Propunere: turneul de final de sezon „Jungle Masters” (cei mai buni din fiecare rang), cu DJ și transmisiune live pe site.

### 6.13 Sezoane
- Durata: **3 luni**, cu date configurabile. Propunere: „Sezonul 0 – Calibrare”, o lună la deschidere, fără premii (Q27).
- **La resetare**: LP = 0 pentru toți; MMR comprimat spre media populației: `μ' = μ̄ + 0.75·(μ − μ̄)`; `σ' = min(σ0, σ + 1.5)`; **3 meciuri de re-plasare**, după care rangul se stabilește din MMR, plafonat la rangul final din sezonul anterior.
- Sezonul încheiat se arhivează (Hall of Fame, clasamente finale, statistici) și rămâne consultabil pe site.

### 6.14 Tipuri de meci
| Tip | MMR | LP | Observații |
|---|---|---|---|
| Oficial de ligă | da | da | fluxul 6.9 |
| Antrenament / amical | nu | nu | statistici doar private |
| Lecție cu antrenor | nu | nu | prezență automată |
| Turneu oficial | da | ×1.5 + bonus pe fază (configurabil: câștigător, finalist, semifinaliști, sferturi) | fără limită de timp; formate: eliminatoriu, grupe + eliminatoriu, Americano, Mexicano, King of the Court, round-robin |
| Provocare | da | da + bonus 5 LP | 6.11 |

- La turnee, **meciurile se selectează de sistem** (tragere la sorți sau tablou generat după rang/nivel), iar adminul le programează pe terenuri. Taxa de participare plătită = condiția de plată pentru validare. Înscrierile, tablourile, programul și rezultatele apar live pe site și pe ecrane.

### 6.15 Gamificare
- **Insigne**: „Ucigaș de giganți” (victorie contra unei echipe cu diferență mare de MMR), „10 victorii la rând”, „Early Bird” (meciuri înainte de ora 10), serii de săptămâni consecutive jucate, „Surpriza săptămânii” (cea mai mare surpriză după MMR), promovări, primul Diamant, Regele Junglei. Configurabile și extensibile din admin.
- **Meciul zilei** (confirmat): ales de AI dintre meciurile oficiale programate azi, cu scor de miză determinist (promovare în joc, duel în top 10, rivalitate, diferență de nivel, provocare) + text de prezentare generat de AI. Afișat pe ecrane, pe site și în grupul comunității. Adminul îl poate schimba. După meci: rezumat generat automat.
- Grafic de evoluție (în contul propriu), istoric de sezoane, parteneri frecvenți, statistici head-to-head (private).

### 6.16 Corectitudine tehnică (obligatoriu)
- **Event sourcing pentru rating**: fiecare meci aplicat produce un eveniment imutabil (valori înainte/după pentru fiecare jucător și pereche). Aplicarea e idempotentă și în ordinea cronologică a finalului de meci.
- Dacă un meci validat e anulat de admin (cu motiv), sistemul **recalculează determinist** întregul sezon de la acel punct (replay) și rezultatul trebuie să fie identic cu o recalculare de la zero (test).
- Concurență: două confirmări simultane nu pot aplica meciul de două ori (blocare pe rândul meciului + cheie de idempotență).

### 6.17 Testele ligii (obligatorii, înainte de orice integrare)
- Teste unitare pentru fiecare regulă (cu ID-ul regulii în nume) și **100% acoperire pe ramuri** în `league-engine`.
- Teste de proprietate (hypothesis): semnul LP, limitele, determinismul, replay = calcul de la zero, nicio promovare dublă, podele și plafoane respectate.
- **Simulare mare**: 500 de jucători cu „nivel real” ascuns, 50.000 de meciuri pe mai multe sezoane. Verifici: corelația Spearman dintre rang și nivelul real ≥ 0,85 după convergență; inflația LP per sezon mărginită; convergența plasărilor; o distribuție rezonabilă pe ranguri (țintă orientativă: Bronz 20%, Argint 25%, Aur 25%, Platină 17%, Diamant 10%, Maestru 3%); efectul resetării. Generează raport HTML sau Markdown în `docs/03-liga/simulari/` și calibrează parametrii pe baza lui.

---

## 7. MODELUL DE DATE (orientativ; detaliază în `docs/06-date/`)
Entități minime: `Location`, `Resource` (teren padel/tenis, sală reformer, aparat reformer, sală evenimente; cu atribute, program, activ/inactiv), `User`, `Profile`, `GuardianLink` (dacă se aprobă conturi de copii), `Consent` (tip, versiune, hash text, dispozitiv, dată, retragere), `LevelQuestionnaire` + `LevelValidation`, `Card` (token, tip: fizic/Apple/Google, stare, emis/blocat), `Booking` (resursă, interval, durată, tip, organizator, stare, preț calculat), `BookingParticipant` (scanare, parte de plată), `CheckIn` / `ScanEvent`, `Attendance`, `NoShow`, `Waitlist`, `Coach`, `CoachAvailability`, `ClassType`, `ClassSession`, `Enrollment`, `PricingRule`, `Season` (preț), `SubscriptionPlan`, `Subscription` (componente pe sport și intensitate, perioadă, înghețări, sesiuni folosite), `CorporateAccount`, `LedgerAccount`, `LedgerEntry`, `Payment`, `CashSession`, `CashEvent`, `FiscalReceipt`, `Invoice`, `Voucher`, `Discount`, `Referral`, `LeagueSeason`, `Ladder`, `RatingState`, `RankState`, `Pair`, `Match`, `MatchTeam`, `SetScore`, `ScoreSubmission`, `ScoreConfirmation`, `Dispute`, `RatingEvent`, `Challenge`, `Tournament`, `TournamentStage`, `Badge`, `BadgeAward`, `Reward`, `Event` (eveniment public), `EventRoomBooking`, `CafeProduct`, `CafeOrder`, `Device` (tip, cheie, locație, ultimul semnal), `ScreenLayout`, `Notification`, `NotificationTemplate`, `AIInteractionLog`, `CommunityPost`, `Translation`, `CmsPage` / `CmsBlock`, `FeatureFlag`, `ConfigVersion`, `AuditLog`.

---

## 8. APLICAȚIILE — SPECIFICAȚII FUNCȚIONALE

### 8.1 Backend central
- API REST versionat (`/api/v1/`) + WebSockets pe canale (clasament, terenuri, ecrane, chioșcuri, cafenea).
- Roluri și permisiuni (RBAC): **Admin** (tot), **Manager** (rapoarte, prețuri, evenimente, sezoane), **Recepție** (rezervări, carduri, asistență la chioșc), **Antrenor/Instructor** (program propriu, clienți, prezențe, deblocări după neprezentări), **Jucător/Client**, **Dispozitiv** (chioșc ligă, chioșc plăți, ecran, cafenea; fiecare cu drepturi minime).
- Sarcini programate: remindere, deschiderea și închiderea ferestrelor de scor, expirări, detectarea neprezentărilor, decay, închiderea sezonului, emiterea recompenselor, rapoarte, jurnale AI, backup-trigger, sănătatea dispozitivelor.
- Jurnal de audit pentru orice modificare a banilor, scorurilor, ligii, datelor personale, prețurilor și configurării.

### 8.2 Chioșcul de Ligă (aparat 1)
- **Ecran de repaus**: clasament live (rotativ între Dublu / Simplu / Perechi), Meciul zilei, Regii Junglei, provocările zilei, mesaj de invitație „Scanează cardul”.
- **După scanare** (sesiune personală, delogare automată după 30 de secunde de inactivitate): nume, rang, LP, nivel, locul în clasament, meciuri jucate în sezon față de minim. Statistici private minime, pentru că ecranul poate fi văzut de alții.
- **Acțiuni**:
  1. **Înscriere în ligă**: buton **GDPR** → formular complet → bifă obligatorie → confirmare (R-010, R-011).
  2. **Introdu scorul**: sistemul găsește automat rezervarea terminată pe care a fost scanat jucătorul, verifică fereastra, scanările și tipul; afișează jucătorii; introducerea set cu set, cu validator; marcaj „neterminat” (6.8).
  3. **Confirmă / Contestă scorul**: pentru ceilalți jucători.
  4. **Provocări**: vezi, acceptă, refuză.
  5. **Check-in** (dacă nu s-a făcut deja).
  6. **Clasamente** complete, cu căutare.
- Mesaje de eroare clare și prietenoase: „Fereastra de scor se deschide la 15:30”, „Rezervarea nu e plătită integral: rest de plată 60 RON la chioșcul de plăți”, „Lipsesc scanările la intrarea pe teren pentru: …”, „Nu ai acord GDPR: înscrie-te mai întâi”.
- UI tactil: butoane mari, contrast ridicat, RO/EN și celelalte limbi, fără tastatură fizică.

### 8.3 Chioșcul de Plăți (aparat 2) — numerar cu rest la lansare
- **Ecran de repaus**: ofertele zilei, meniul cafenelei, „Scanează cardul”.
- **Fluxuri**:
  1. **Check-in** la sosire.
  2. **Plătește rezervarea**, integral sau **„Împarte ora”**: se aleg participanții (prin scanarea cardurilor), sistemul calculează părțile (R-061), fiecare își plătește partea. Se vede în timp real cât mai e de plătit.
  3. **Plătește datorii** (anulări tardive, neprezentări).
  4. **Cumpără abonament** (configuratorul în 3 pași, R-081), înghețare (R-086).
  5. **Cafenea**: meniu, coș, plată → comanda apare pe afișajul cafenelei + bon cu număr de comandă.
  6. **Vouchere și sold**: aplicare voucher, folosirea creditului din cont.
  7. **Bon fiscal** pentru orice încasare (R-066).
- **Numerar**: acceptă bancnote (și monede, dacă aparatul permite), calculează și **dă rest**. Dacă nu are rest suficient, avertizează ÎNAINTE de introducerea banilor („Momentan acceptăm doar suma exactă” sau oferă restul ca credit în cont, doar cu acordul explicit al clientului).
- **Siguranța tranzacției**: fiecare bancnotă acceptată e jurnalizată local înainte de orice alt pas; dacă pica curentul sau conexiunea în mijlocul tranzacției, la repornire tranzacția se reia sau se reconciliază automat; niciun leu nu se pierde fără urmă. Fără conexiune la server, chioșcul **nu începe tranzacții noi** (afișează „temporar indisponibil”).
- **Mod personal (PIN + card de angajat)**: alimentare rest, golire casetă, numărare, reconciliere, rapoarte de închidere de zi (inclusiv raportul Z al casei de marcat), alerte „rest scăzut”, „casetă plină”, „blocaj bancnotă”.
- POS cu card: adaptor pregătit, dezactivat (R-062).

### 8.4 Hardware Bridge (serviciu local pe fiecare aparat)
- Interfețe (clase abstracte) cu **drivere de simulare** complete pentru dezvoltare și teste, plus drivere reale adăugate când se cunosc modelele (Q23):
  - `Scanner`: cititor QR (de obicei USB „tastatură”, HID, sau serial).
  - `CashDevice`: acceptor + reciclator cu rest (protocoale uzuale în industrie: SSP, ccTalk, MDB; nu presupune, verifică modelul cumpărat).
  - `FiscalPrinter`: casă de marcat fiscală (driverul producătorului ales).
  - `ReceiptPrinter`: bonuri nefiscale (ESC/POS).
  - `Display` / `Health`: stare, temperatură, spațiu.
- Comunicare cu aplicația din browser: WebSocket pe localhost, mesaje semnate, cu nonce și anti-replay. Jurnal local append-only (SQLite) pentru evenimentele de numerar, sincronizat și reconciliat cu serverul.
- Scripturi în `deploy/kiosk-os/`: instalare, pornire automată, mod kiosk, watchdog, actualizări, blocarea accesului la sistemul de operare.

### 8.5 Ecranele de la terenuri și cele de lobby/cafenea/mezanin
- **Ecranul fiecărui teren** afișează live:
  - teren, interval orar, durata (60/90/120/150/180), **tipul sesiunii** (meci oficial de ligă, antrenament, lecție, turneu, provocare, închiriere);
  - pentru fiecare jucător: **nume și prenume, rang (de exemplu Diamant II), LP, nivel** (doar câmpurile publice din R-012);
  - timp rămas, următoarea rezervare, eticheta „Meciul zilei” când e cazul;
  - un cod QR spre pagina publică a terenului sau a ligii (doar vizualizare).
- Exemplu (date demo, folosește exact aceste nume în seed):
```
TEREN 4 · 14:00–15:30 · 90 min · MECI OFICIAL DE LIGĂ
Popescu Alexandru Daniel   Diamant II · 67 LP · Nivel 5.2
Moșteanu Rareș             Diamant III · 12 LP · Nivel 5.0
                    vs
[Jucător 3]                Platină I · 88 LP · Nivel 4.8
[Jucător 4]                Diamant IV · 40 LP · Nivel 4.9
Timp rămas: 00:47 · Următorul: 15:30 Antrenament
```
- În repaus: vizual „jungle” animat, clasamente, evenimente, reclame interne.
- **Ecranele de lobby/cafenea/mezanin**: starea tuturor terenurilor, Meciul zilei, clasamente, Regii Junglei, evenimente, numerele comenzilor de cafenea gata de ridicat.
- Rezistență: reconectare automată, ultima stare păstrată, indicator discret de conexiune, fără ecrane goale.

### 8.6 Panoul de admin (control total, „complet funcțional”)
Module: Tablou de bord live (ocupare, încasări, alerte) · Utilizatori (toate detaliile din R-004, validare nivel, blocări/deblocări, carduri) · Calendar rezervări (vizualizare pe resurse, drag & drop, creare/mutare/anulare cu reguli) · Resurse și locații · Prețuri și sezoane de preț · Abonamente, înghețări, corporate · Antrenori și programe · Pilates (clase, capacitate, liste de așteptare) · Prezențe și neprezentări · Liga (configurare versionată, sezoane, dispute, anulări cu recalculare, provocări, turnee cu tablouri și generatoare Americano/Mexicano, recompense, insigne, Meciul zilei) · Plăți și registru (căutare, corecții prin înregistrări inverse, rapoarte) · Numerar și fiscal (sesiuni de numerar, reconcilieri, rapoarte Z) · Cafenea (meniu, prețuri, comenzi, stoc opțional) · Evenimente și sala de evenimente · Notificări (șabloane multilingve, istoric, trimiteri manuale) · Comunitate (mesaje generate de AI, gata de copiat) · AI (setări, limite de cost, jurnale, copilot) · Conținut site (CMS pe secțiuni, SEO pe pagină) · Traduceri (stare pe limbă, aprobare) · Dispozitive (chioșcuri, ecrane, bridge: stare, cheie, repornire, configurare layout) · Feature flags (parkour, teren tenis, ligă juniori, WhatsApp, plăți online, POS) · Rapoarte și exporturi (CSV/Excel/PDF) · Jurnal de audit · Roluri și permisiuni · Stare backup și sistem.
- Securitate: autentificare cu 2FA obligatorie, sesiuni scurte, restricție opțională pe IP.
- Adminul tehnic Django rămâne activ ca „mod de urgență”, doar pentru rolul Admin.

### 8.7 Afișajul cafenelei
- Coadă de comenzi în timp real (număr, produse, ora), stări: nouă → în preparare → gata → ridicată; semnal sonor; numărul ajunge pe ecranele din lobby când comanda e gata.

### 8.8 Carduri și Wallet
- Emitere la crearea contului sau la cerere; email cu butoane „Adaugă în Apple Wallet” și „Adaugă în Google Wallet” + PDF.
- Apple Wallet: pass de tip card (membership), semnat cu certificatul „Pass Type ID” (necesită cont Apple Developer al clubului: Q24), cu serviciul web de actualizare, ca rangul și LP să se schimbe automat.
- Google Wallet: clasă și obiect prin API-ul Google Wallet (cont de emitent al clubului), actualizate la schimbare.
- Card fizic: PDF de tipar CR80 + coada „carduri de emis” (inclusiv cardul de Diamant cu emblema aleasă).

---

## 9. WEBSITE-UL „SIMULATOR”

### 9.1 Ideea (din videoul trimis de proprietar: DOAR INSPIRAȚIE, NU SE COPIAZĂ)
Proprietarul a trimis un video cu site-ul clubului lor de tenis (Clubul Tenis Elite), ca să arate **cum ar trebui să curgă** experiența, nu ce să copiezi. **Nu prelua textele, structura exactă, culorile (verde/lime), imaginile sau componentele.** Ce trebuie reținut ca IDEE:
- Site care **curge frumos în jos, pe secțiuni**, cu multă logică, ca o poveste la scroll.
- Un **hero cinematic** pe tot ecranul (video sau imagini de fundal, titlu mare, două butoane de acțiune) și tranziții de scroll cu text peste imagine.
- **Cifre animate** (contoare), **carduri de program** cu imagini, un **parcurs vizual pe etape** (în video: evoluția copilului pe vârste).
- Elementul central: un **simulator interactiv** („3 întrebări, pasul potrivit”): utilizatorul răspunde prin butoane-pastilă (pentru cine, vârstă, experiență, obiectiv), un element animat (mingea) reacționează, iar la final apare un **card de recomandare** personalizat, cu butoane de acțiune („Înscrie-te”, „Întreabă asistentul”) și „Încearcă din nou”.
- Un **asistent AI** în colțul ecranului, care știe ce a ales utilizatorul în simulator și continuă conversația, cu răspunsuri rapide pe butoane.
- **Formular de conversie** simplu (de exemplu ședințe gratuite de probă), program, **FAQ**, subsol complet.
- Header fix cu meniu, buton „Rezervă” mereu vizibil.

Pentru Jungle Padel, construiește o experiență **originală**, mai ambițioasă, cu identitate de junglă (secțiunea 12.4): mai multe simulatoare, date live, atmosferă nocturnă și luminoasă, premium, modernă.

### 9.2 Secțiunile paginii principale (propunere; se livrează ȘI se aprobă una câte una)
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

### 9.3 Pagini
`/` · `/padel` · `/liga` (clasamente complete pe Dublu/Simplu/Perechi, filtre pe rang, căutare, arhivă de sezoane, fișă publică a jucătorului doar cu câmpurile R-012, regulamentul ligii) · `/rezervari` · `/pachete` · `/tenis` · `/pilates` · `/evenimente` · `/cafenea` · `/corporate` · `/despre` · `/contact` · `/regulament` · `/gdpr` · `/cookies` · `/termeni` · `/blog` (SEO) · `/cont` (tablou personal: progres, rezervări, abonament, plăți, carduri, insigne, provocări, notificări, setări, confidențialitate, export și ștergere date).
Fiecare pagină există în toate limbile active, cu URL-uri localizate (`/ro/...`, `/en/...` etc.).

### 9.4 Reguli de UX, animație, performanță
- Animații la scroll fluide (de exemplu GSAP ScrollTrigger sau Framer Motion), cu varianta **„reduced motion”** complet funcțională.
- Performanță: Lighthouse ≥ 90 pe mobil la toate categoriile; LCP < 2,5 s; CLS < 0,1; imagini optimizate (AVIF/WebP), video comprimat, cu poster.
- Accesibilitate **WCAG 2.2 AA**: contrast, navigare din tastatură, texte alternative, focus vizibil.
- Mobil pe primul loc; PWA instalabilă (cont, rezervări, notificări push).
- Fiecare secțiune e o componentă separată, în fișierul ei, cu conținut din CMS (editabil din admin) și traduceri din catalog.
- Conținutul demo se marchează clar și nu inventează fapte (prețuri, cifre, recenzii) prezentate ca reale.

---

## 10. INTELIGENȚA ARTIFICIALĂ (integrată în tot sistemul)

### 10.1 Arhitectură
- Un modul `ai` în backend, cu **adaptor de furnizor** (implicit API-ul Claude de la Anthropic; modelul se setează prin variabilă de mediu, nu se hardcodează), limită de cost lunară, jurnal pentru fiecare interacțiune (fără date sensibile inutile) și un comutator de oprire globală.
- AI-ul acționează doar prin **unelte (tools) cu permisiuni explicite**, apelând același API intern ca oamenii, cu aceleași validări.
- **Interdicții absolute**: nu introduce, nu modifică și nu validează scoruri; nu modifică rating, LP, ranguri, clasamente; nu mișcă bani, nu acordă reduceri sau vouchere; nu accesează și nu modifică acorduri GDPR; nu dezvăluie date personale ale altor utilizatori.
- Minimizarea datelor trimise furnizorului AI (pseudonimizare unde se poate). Totul documentat în registrul de prelucrări GDPR.

### 10.2 Funcții AI
1. **Asistentul clubului** (website, PWA, opțional chioșcuri): multilingv; răspunde la întrebări (program, prețuri, reguli, ligă); verifică disponibilitatea; **face rezervări** pentru utilizatorul autentificat (plata rămâne conform R-063); recomandă pachete; continuă contextul din simulatoare.
2. **Matchmaking**: propune parteneri și adversari de nivel apropiat (după MMR, disponibilitate, istoric, preferințe), inclusiv pentru meciuri oficiale și provocări, cu explicație în limbaj natural. Scorul de potrivire e calculat determinist; AI-ul doar formulează.
3. **Reactivare**: jucător care n-a mai jucat de X zile → propune parteneri de același nivel și intervale libere; client cu abonament care lipsește de la antrenamente → mesaj personalizat (R-092).
4. **Meciul zilei**: alegere pe baza scorului de miză (6.15), text de prezentare, rezumat după meci.
5. **„Jungle Report” săptămânal** personal: meciuri, evoluție, cel mai bun partener, obiectiv pentru săptămâna viitoare.
6. **Mesaje pentru grupul comunității** (R-131): rezultate, promovări, Regii Junglei, evenimente, Meciul zilei, gata de copiat.
7. **Copilot pentru admin**: întrebări în limbaj natural pe date (de exemplu „cât am încasat din pilates în martie?”), exclusiv pe vederi read-only agregate, cu interogările afișate pentru transparență.
8. **Detecție de anomalii** (scoruri suspecte, abuz, fraudă la numerar): semnalează, nu decide.
9. **Asistent de conținut și SEO**: ciorne de articole, descrieri, traduceri (marcate „de revizuit”).
10. **Sugestii de prețuri dinamice și previziuni** (ocupare, risc de abandon): doar propuneri, aprobate manual.

---

## 11. NOTIFICĂRI (email + telefon; fără WhatsApp la lansare)

Matrice minimă (fiecare cu șablon multilingv editabil în admin și preferințe de opt-out unde legea permite):
confirmare cont și email · validarea nivelului · card emis (cu linkuri Wallet) · confirmare, modificare, anulare rezervare · reminder cu 24 h și cu 2 h înainte · promovare din lista de așteptare · fereastra de scor deschisă · scor propus / de confirmat · scor validat + LP câștigat sau pierdut · promovare / retrogradare în rang · atingerea rangului Diamant (card fizic) · provocare primită / acceptată / refuzată · risc de decay · „îți mai trebuie N meciuri pentru clasamentul final” · finalul sezonului și recompense · Meciul zilei (pentru cei implicați) · inactivitate și propuneri de parteneri · absențe de la antrenamente · taxă de neprezentare / anulare tardivă · blocare de rezervări (și către antrenor) · abonament: cumpărat, expiră, înghețat, sesiuni rămase · voucher primit (recomandare sau recompensă) · evenimente noi · comanda de cafenea gata (pe ecran) · alerte pentru personal (rest scăzut la chioșc, dispozitiv offline, dispută nouă, backup eșuat).

---

## 12. SECURITATE, GDPR, LEGAL ȘI FISCAL (România)

### 12.1 Securitate
- **Scorurile se acceptă EXCLUSIV de la chioșcul de ligă înregistrat**: dispozitiv autentificat cu cheie unică (ideal certificat client / mTLS) + restricție de rețea (rețeaua clubului) + rol „Dispozitiv Ligă”. Orice altă sursă primește refuz, logat.
- Plățile din chioșc: doar de la dispozitivul „Plăți”, prin bridge-ul semnat.
- OWASP Top 10 acoperit: CSRF, XSS, SQLi, SSRF, rate limiting, blocare după încercări eșuate, CSP strict, headere de securitate, validarea tuturor intrărilor, secrete doar în variabile de mediu (niciodată în git), dependențe scanate.
- 2FA pentru toate conturile de personal; principiul privilegiului minim; jurnal de audit imutabil.
- Backup-uri criptate; test de restaurare automat, lunar.

### 12.2 GDPR
- Formular GDPR complet pentru înscrierea în ligă (R-010), politică de confidențialitate, politică de cookies (analytics fără cookies → banner minim), registrul activităților de prelucrare, evaluare DPIA pentru ligă și afișajele publice, perioade de retenție, drepturile persoanei (acces, export, rectificare, ștergere, opoziție, retragerea acordului).
- **Ștergerea contului vs. istoricul ligii**: datele personale se șterg; în istoricul altor jucători rămâne un participant pseudonimizat („Jucător retras”), ca ratingurile să rămână corecte.
- **Toate textele legale se generează ca ciorne profesionale și se marchează explicit: „necesită revizuire de către un avocat/DPO înainte de publicare”.**

### 12.3 Fiscal și comercial
- Bon fiscal pentru încasările în numerar prin casa de marcat fiscală (AMEF) integrată; rapoarte Z; e-Factura pentru facturile către firme (corporate); termeni și condiții de vânzare conforme cu protecția consumatorului. **Tot ce ține de fiscalitate se confirmă cu contabilul clubului** (notează în documentație ce trebuie verificat).

### 12.4 Branding tehnic (design tokens)
- Toate culorile, fonturile, razele, umbrele, spațierile și animațiile vin din `packages/design-tokens`, ca schimbarea identității vizuale (stabilită în următoarele luni) să se facă dintr-un singur loc.
- Propune o identitate provizorie originală, cu tematică de junglă (de exemplu verde-jungle profund, negru nocturn, un accent luminos „neon” inspirat de lumini, nisip cald), **diferită de site-ul clubului de tenis**. Fonturi open-source, găzduite local.

---

## 13. TESTARE ȘI CALITATE (Definition of Done pentru orice livrare)
1. Teste unitare + de integrare + end-to-end (Playwright) pentru fluxurile complete între aplicații: rezervare → check-in → scanare pe teren → meci → scor → confirmări → plată împărțită → validare → LP → ecrane → notificări → Wallet.
2. Motorul ligii: 100% ramuri, teste de proprietate, simulare mare (6.17). Banii: 100% ramuri, teste pe rotunjiri, împărțiri, reversări, idempotență, întreruperi de curent simulate la numerar.
3. Teste de concurență (dublă rezervare, dublă confirmare, dublă plată), teste pe fusul orar și trecerile de oră, teste de încărcare (de exemplu 500 de utilizatori simultani pe site + ecrane conectate), teste de securitate, de accesibilitate și de completitudine a traducerilor (nicio cheie lipsă în RO/EN).
4. Simulatoare hardware pentru toate aparatele, ca totul să poată fi testat fără hardware real.
5. Lint, type-check, formatare: zero erori. Toate testele verzi cu o singură comandă (`scripts/test-all`).
6. **Dublă revizuire logică** (secțiunea 1.1, punctul 1) documentată pe scurt în descrierea fiecărui commit sau etape.
7. Documentația și `CLAUDE.md` actualizate. `CHANGELOG.md` completat.
8. Instrucțiuni pentru proprietar: cum verifică el însuși, pas cu pas.

---

## 14. DEPLOY PE SERVERUL PROPRIU, BACKUP, MONITORIZARE, MENTENANȚĂ
- **Server propriu** (specificații, sistem de operare, locație fizică, IP public, redundanță de internet și curent: Q22). Recomandă UPS, internet de rezervă (de exemplu 4G) pentru chioșcuri și backup off-site.
- Docker Compose pe medii (dev, staging, prod); fiecare aplicație pe subdomeniul ei (4.6); TLS automat; firewall; actualizări de securitate automate pentru sistemul de operare.
- **Backup**: PostgreSQL zilnic + la fiecare oră (incremental / WAL), criptat, cu copie off-site; test automat de restaurare; runbook de recuperare după dezastru, cu obiective RPO/RTO documentate.
- **Monitorizare**: disponibilitate, erori, latență, spațiu pe disc, stare dispozitive (fiecare chioșc și ecran trimite semnal de viață), alerte către personal.
- **Mentenanță** (`docs/08-deploy-si-mentenanta/`): cum se face o actualizare, cum se revine la versiunea anterioară, ce faci dacă un chioșc nu mai merge, cum se schimbă prețurile, cum se deschide un sezon nou, lista verificărilor lunare. Scrise pentru un proprietar non-programator, cu comenzi copiabile.
- Versionare semantică, tag-uri git pentru fiecare etapă aprobată, migrări de bază de date reversibile.

---

## 15. SEO, MARKETING, BRANDING, VÂNZĂRI (livrabile de business)

### 15.1 SEO tehnic (în cod)
- SSR/SSG, URL-uri curate și localizate, `hreflang` pentru toate limbile, `sitemap.xml` pe limbă, `robots.txt`, URL-uri canonice, meta title și description editabile din CMS, Open Graph și Twitter Cards, date structurate schema.org (`SportsActivityLocation`/`LocalBusiness`, `Event`, `Offer`, `FAQPage`, `BreadcrumbList`, `Organization`), Core Web Vitals verzi, imagini cu texte alternative, pagini de eroare 404/500 utile, fără conținut duplicat între limbi.

### 15.2 SEO de conținut și local (în `docs/10-seo/`)
- Cercetare de cuvinte-cheie RO/EN (orientativ: „padel București”, „teren padel București”, „padel Pantelimon”, „padel Ilfov”, „ligă padel București”, „lecții padel”, „pilates reformer Pantelimon”, „tenis Pantelimon”, „padel Bucharest”), hartă de cuvinte-cheie pe pagini, calendar editorial pentru blog (ghiduri: ce e padelul, reguli, echipament, cum funcționează liga, padel vs tenis), strategie Google Business Profile, consistență NAP (nume, adresă, telefon), linkuri din site-ul clubului de tenis, citări locale.

### 15.3 Marketing (în `docs/11-marketing/`)
- Plan de pre-lansare pe 6 luni (până la inaugurarea din martie 2027): pagină de pre-lansare cu listă de așteptare (livrabilă devreme, vezi Etapa 1B), conținut din șantier pentru Instagram și TikTok, conversia membrilor clubului de tenis (clinici „Din tenis în padel”), atragerea firmelor (pachete corporate, ligă corporate), influenceri locali, evenimentul de inaugurare cu DJ, lansarea ligii.
- După lansare: calendar săptămânal de formate (propus: luni liga corporate, marți Ladies Padel, miercuri Americano pe niveluri, joi meciuri mixte + clinică tenis→padel, vineri Jungle Night cu DJ, sâmbătă Padel & Brunch, duminică Family Day + clinică pentru începători, lunar Glow Padel cu lumini UV; de confirmat), campanii de reactivare, programul de recomandare, conținut generat din ligă (Meciul zilei, promovări).
- KPI și tablou de bord: înscrieri în lista de așteptare, conversie în conturi și abonamente, ocupare pe benzi orare, jucători activi în ligă, retenție și abandon, venit per teren, NPS.

### 15.4 Branding (în `docs/12-branding/`)
- Platforma de brand: misiune, valori, personalitate, ton al vocii (RO/EN), promisiune; verificarea disponibilității mărcii „Jungle Padel” (OSIM/EUIPO) și a domeniului; 3 direcții de logo descrise ca brief; palete și fonturi propuse; limbaj vizual de junglă; aplicații: carduri, ecrane, semnalistică, merchandise, uniforme, numele terenurilor (propunere).
- Livrezi brief-uri și direcții. Logo-ul final îl alege proprietarul; sistemul se adaptează prin design tokens.

### 15.5 Vânzări (în `docs/13-vanzari/`)
- Scripturi pentru recepție și telefon, prezentare pentru pachetele corporate, secvențe de email (bun venit, după primul meci, reactivare, reînnoire abonament), oferte de lansare (de confirmat cu proprietarul, fără a promite prețuri nestabilite).

---

## 16. PLAN DE LUCRU PE ETAPE (cu aprobarea proprietarului după fiecare)

> Regulă: fiecare etapă se încheie cu teste verzi, dublă revizuire, documentație la zi, instrucțiuni de verificare pentru proprietar și **aprobare explicită** înainte de următoarea. Website-ul se livrează **secțiune cu secțiune**. Proprietarul preferă să dureze mai mult, dar să aibă logică.

| Etapă | Conținut | Orientativ |
|---|---|---|
| 0 | Citire, repo, `CLAUDE.md`, împărțirea documentației, ADR-uri de stack, întrebări prioritare, plan detaliat, schelet de foldere cu README-uri | oct. 2026 |
| 1A | Fundația backend: conturi, roluri, locații, resurse, audit, i18n, configurare versionată, feature flags, admin de bază | oct. 2026 |
| 1B | Pagina de pre-lansare (listă de așteptare, RO/EN, SEO de bază), pentru marketing timpuriu | oct.–nov. 2026 |
| 2 | Motorul ligii (pachet pur) + simulări + raport de calibrare | nov. 2026 |
| 3 | Rezervări, durate, benzi orare, prețuri, anulări, neprezentări, liste de așteptare, check-in, prezențe | nov. 2026 |
| 4 | Registru contabil, plăți, împărțirea orei, sold și datorii, abonamente și configurator, corporate, vouchere, recomandări, produse de cafenea | nov.–dec. 2026 |
| 5 | Carduri, Apple Wallet și Google Wallet, fișier de tipar, GDPR (formular, acorduri, drepturi) | dec. 2026 |
| 6 | Integrarea ligii: meciuri, fereastra de scor, confirmări, validare prin plată, sezoane, provocări, turnee, recompense, insigne | dec. 2026 |
| 7 | Hardware Bridge + simulatoare + Chioșcul de Ligă | dec. 2026–ian. 2027 |
| 8 | Chioșcul de Plăți (numerar cu rest, fiscal, cafenea) + afișajul cafenelei | ian. 2027 |
| 9 | Ecrane teren + lobby/cafenea/mezanin (timp real) | ian. 2027 |
| 10 | Panoul de admin complet | ian. 2027 |
| 11 | Website-ul „simulator”, secțiune cu secțiune (9.2), paginile (9.3), zona de cont, PWA | ian.–feb. 2027 |
| 12 | Stratul AI complet + notificări | feb. 2027 |
| 13 | SEO final, conținut, documente de marketing, branding și vânzări | în paralel, finalizare feb. 2027 |
| 14 | Deploy pe serverul propriu, securitate, backup, monitorizare, integrarea hardware-ului real la club | feb. 2027 |
| 15 | Beta cu membrii clubului de tenis, teste de încărcare, instruirea personalului, lista de lansare | feb.–mar. 2027 |
| 16 | Inaugurare și go-live, Sezonul 0/1 al ligii, monitorizare intensivă | mar. 2027 |

Calendarul e orientativ: se ajustează în funcție de răspunsurile proprietarului și de livrarea hardware-ului. Dacă o etapă riscă să întârzie lansarea, anunți din timp și propui ce se poate amâna după lansare (de exemplu limbile suplimentare, funcțiile AI secundare), fără a compromite liga, banii și securitatea.

---

## 17. ÎNTREBĂRI DESCHISE (de pus proprietarului; fiecare cu varianta implicită până la răspuns)

Pune-le grupat și în ordinea urgenței (cele care blochează etapa curentă mai întâi), în română simplă, cu exemple. Nu bloca munca: lucrează cu varianta implicită, configurabilă, și marcheaz-o `DE_CONFIRMAT`.

- **Q1 Cardul de Diamant**: ce înseamnă „să alegi de junglă”: o emblemă sau un animal dintr-o listă? Se acordă la prima atingere a rangului Diamant (o dată în viață) sau în fiecare sezon? *Implicit: prima dată, emblemă din listă predefinită, fără design liber.*
- **Q2 Durata de 150 de minute** e permisă (regula „60, apoi din 30 în 30”)? *Implicit: da.*
- **Q3 Programul de funcționare** și benzile pentru 13:00–15:00, după 22:00 și weekend. *Implicit: în afara vârfului; weekend ca în cursul săptămânii.*
- **Q4 Prioritatea abonaților**, dacă rezervarea nu are limită de timp: prioritate pe lista de așteptare, înscriere mai devreme la turnee, altceva? *Implicit: prioritate pe liste de așteptare și la turnee.*
- **Q5 Limita de diferență de nivel** (explicație simplă: „Dacă doi jucători foarte buni joacă împotriva a doi începători, meciul să conteze pentru ligă sau să fie trecut automat ca antrenament?”). *Implicit: contează (fără limită).*
- **Q6 Recompense**: „10–20% reducere luna următoare” e pentru top 3 din fiecare rang sau o alternativă la premiile Regilor Junglei? *Implicit: top 3 din fiecare rang.*
- **Q7 Copiii**: se creează conturi de copii gestionate de părinți, pentru antrenamente, fără ligă? *Implicit: da, modul pregătit, activabil.*
- **Q8 Invitații fără cont** care joacă o închiriere: trebuie să-și facă cont rapid (nume, telefon, email) ca să poată scana la intrarea pe teren? *Implicit: da, cont rapid la chioșc, cu QR temporar.*
- **Q9 Plata online cu card**: ce bancă sau procesator și când? *Implicit: dezactivată; „plată la locație”.*
- **Q10 Recepția** poate încasa numerar în afara chioșcului sau înregistra plăți manuale? *Implicit: doar chioșcul; admin-ul poate înregistra excepții cu motiv, auditat.*
- **Q11 Termenul pentru plată** după introducerea scorului, ca meciul să fie validat. *Implicit: 24 de ore.*
- **Q12 Intensitățile „La cerere”**: le alege clientul singur sau se aprobă și se stabilește prețul de admin? Ce regulă de vârf au? *Implicit: cerere aprobată de admin; sub 8 sesiuni = regula Start.*
- **Q13 Start** poate folosi semi-vârful (08:00–12:00)? *Implicit: da (restricție doar pe 15:00–22:00).*
- **Q14 „Recuperare”** la anularea cu 24 h înainte: pentru închirieri plătite, credit în cont sau rambursare în numerar? Sesiunea de abonament recuperată trebuie folosită în aceeași lună? *Implicit: credit în cont; sesiunea recuperată e valabilă până la finalul perioadei abonamentului.*
- **Q15 Neprezentări**: în ce interval se numără cele „mai mult de două” (90 de zile, sezon, total)? Cine e „antrenorul responsabil” pentru clienții care doar închiriază? *Implicit: 90 de zile; managerul.*
- **Q16 Lista de așteptare**: cine e promovat cu mai puțin de 24 h înainte poate anula gratuit? *Implicit: da, în primele 2 ore de la promovare.*
- **Q17 „Telefon”** la notificări înseamnă notificări push din aplicație, SMS sau ambele? *Implicit: push; SMS pregătit, dezactivat.*
- **Q18 Pilates**: s-a cerut notificare pe WhatsApp la lista de așteptare, dar ulterior „fără WhatsApp”. *Implicit: email + push.*
- **Q19 Grupul comunității** e pe WhatsApp, Facebook, Telegram? AI-ul generează textul, iar echipa îl postează manual? *Implicit: generare + postare manuală.*
- **Q20 Tenis**: sistemul gestionează și terenurile Clubului Tenis Elite (mai multe locații)? Se integrează sau se înlocuiește site-ul existent al clubului de tenis? *Implicit: suport pentru mai multe locații; site-ul de tenis rămâne separat, cu legături reciproce.*
- **Q21 Prețuri**: padel, pilates, lecții, sala de evenimente, meniul cafenelei, datele sezonului de vară și de iarnă. *Implicit: valori demo marcate `DE_STABILIT`.*
- **Q22 Serverul**: sistem de operare, resurse (procesor, memorie, disc), locație (la club sau în centru de date), IP public, UPS, internet de rezervă, cine are acces fizic.
- **Q23 Hardware**: modelele exacte (aparat de numerar cu rest, casa de marcat fiscală, scannere, ecrane, mini-PC-uri); există scanner lângă fiecare teren pentru scanarea la intrare? *Implicit: arhitectură pregătită pentru ambele variante.*
- **Q24 Conturi externe**: Apple Developer (pentru Wallet), emitent Google Wallet, furnizor de email, cheie API pentru AI: cine le creează și pe ce firmă?
- **Q25 Limbi suplimentare** peste RO, EN, ES, IT, ZH (franceză, germană, altele?) și cine revizuiește traducerile.
- **Q26 Datele firmei** (denumire, CUI, adresă, date de contact pentru GDPR) și contabilul (pentru fiscal și e-Factura).
- **Q27 Calendarul sezoanelor** și „Sezonul 0 – Calibrare” la deschidere. *Implicit: da, o lună.*
- **Q28 Turnee**: cine introduce scorul (jucătorii sau un arbitru/director de turneu)? *Implicit: jucătorii, cu confirmare; directorul poate introduce și valida.*
- **Q29 Tipul meciului** se alege la rezervare sau la chioșc? *Implicit: la rezervare, modificabil până la check-in.*
- **Q30 Afișarea publică a rezultatelor** meciurilor și a Meciului zilei intră în acordul GDPR din ligă? *Implicit: da, menționat explicit în formular; de validat cu avocatul.*
- **Q31 Clasamentul pe perechi**: minim de meciuri pentru clasamentul final. *Implicit: 6.*
- **Q32 Voucherul „Adu un prieten”**: valabil în orice bandă orară? *Implicit: în afara vârfului și semi-vârf.*
- **Q33 Cafeneaua**: gestiune de stoc? Meniu? Imprimantă de bonuri la bar? *Implicit: fără stoc la lansare; afișaj la bar.*
- **Q34 Sala de evenimente**: se rezervă online? Pachete și prețuri? *Implicit: cerere de rezervare online, confirmată de manager.*
- **Q35 Pachetele corporate**: structură (număr de angajați, ore incluse, facturare lunară)?
- **Q36 Membri fondatori** (propunere: 100 de locuri cu beneficii la lansare), da sau nu?
- **Q37 Personalul**: câte persoane la recepție, câți antrenori (padel, tenis), roluri?
- **Q38 Propunerile de concept** din secțiunea 18: care se adoptă?

---

## 18. ARHIVA IDEILOR DIN CONVERSAȚIE (starea fiecăreia)

**Confirmate** (deja în reguli): liga MMR cu resetare la 3 luni; ranguri Bronz → Diamant (+ Maestru, Regele Junglei); 5 meciuri de plasare + chestionar validat; clasament individual + pe perechi; simplu și dublu; check-in; Meciul zilei ales de AI; provocări directe; card fizic la Diamant (cu emblemă de junglă, fără design personalizat); gamificare; minim de meciuri pe sezon; validare de către toți jucătorii + prin plată; fereastra de 30 de minute; formatul oficial de scor; meciuri neterminate cu puncte proporționale; turnee fără limită de timp; configurator de pachete în 3 pași; reducerile; înghețarea; regula Start/vârf; doar pachete corporate; plata orei împărțită (fără credite de padel); chioșc de plăți numerar cu rest; cafeneaua prin chioșc; Apple + Google Wallet; notificări email + telefon; RO + EN obligatorii + alte limbi; evenimente vizibile la lansare, parkour mai târziu; pilates cu 4→6 reformere și clasele listate; prezențe automate; server propriu; deschidere în martie 2027.

**Respinse sau înlocuite**: card „de design” personalizat (respins); WhatsApp la lansare (respins); credite pentru orele de padel (înlocuite cu plata orei împărțită); pachete de familie și studenți (respinse, doar corporate); fereastră de rezervare de 7/14 zile (înlocuită cu rezervare fără limită); nume de divizii Liană/Tucan/Panteră/Jaguar (înlocuite cu Bronz → Diamant); platforme terțe de rezervări, de tip Playtomic (respinse: sistem propriu); Google Apps Script (respins: Python și TypeScript).

**Propuse, neconfirmate** (de prezentat ca opțiuni, Q36–Q38): nume de terenuri (Jaguar, Tucan, Gorila, Anaconda); center court panoramic; scene de lumină și sunet pe zone; lounge pe mezanin cu ecrane; automatizarea luminilor și a climatizării după rezervări; panouri fotovoltaice și ventilatoare mari de tavan; acces 24/7 cu ușă smart; camere pe terenuri cu clipuri automate cu cele mai bune puncte și transmisiuni live; pilates „hot” cu infraroșu; Jungle Kids Club (copiii la parkour cu instructor cât joacă părinții); petreceri de copii all-inclusive; tabere de vară; pro shop cu rachete demo; merchandise; comandă de cafenea din teren prin QR; membri fondatori; Sezonul 0; Jungle Masters; formatele săptămânale; clinici „Din tenis în padel”; ligă corporate; turul virtual al clubului pe site.

---

## 19. CHECKLIST FINAL ÎNAINTE DE ORICE LIVRARE
- [ ] Am recitit cerința din acest document și regulile R-xxx atinse de modificare.
- [ ] Codul e complet, fără trunchieri, fără secrete, cu fișiere în folderele corecte.
- [ ] Testele sunt scrise și verzi; lint și type-check curate.
- [ ] Am făcut dubla revizuire logică: fluxul real al unui client, cazurile-limită, perspectiva unui atacator.
- [ ] Am verificat banii (rotunjiri, idempotență), fusul orar, concurența și permisiunile.
- [ ] Traducerile RO/EN sunt complete; textele publice nu afișează mai mult decât permite R-012.
- [ ] README-urile, `CLAUDE.md`, `PROGRES.md`, `CHANGELOG.md` și `INTREBARI_DESCHISE.md` sunt la zi.
- [ ] I-am explicat proprietarului, în română simplă, ce s-a făcut, cum verifică și ce decizii are de luat.
- [ ] Aștept aprobarea înainte de etapa următoare.

**Începe acum cu Etapa 0.**
