# Ce mai e de făcut din partea clubului

Site-ul este complet: nu mai există texte „[DE COMPLETAT]” pe paginile publice. Lista de mai jos
cuprinde ce poate face doar clubul, pentru ca site-ul să arate și să vândă cât mai bine: materiale
reale (fotografii, video), confirmarea unor fapte și câteva setări. Totul se face din panoul de
administrare (`/admin`), fără programator. Pentru strategia de marketing și SEO, vezi
[`docs/ANALIZA.md`](docs/ANALIZA.md).

> **Important la instalare:** rebrandingul „Clubul Tenis Elite” schimbă structura conținutului
> (programe, tipuri de antrenament, grupe, secțiunile primei pagini). O bază de date creată cu
> versiunea anterioară trebuie **recreată**: local `npm run db:reset`, pe server
> `docker compose down -v` și apoi `docker compose up -d` (vezi `DEPLOY.md`). Conținutul se
> încarcă automat din `config/club.yml` la prima pornire.

## 1. Fotografii și video-uri (cel mai mare câștig)

Pe site sunt deja: logoul clubului, două fotografii reale (grupa de copii pe zgură și podiumul unui
turneu), decupaje din ele pentru cele șase programe și un video de prezentare de 18 secunde,
compus din aceste fotografii. Video-urile originale ale clubului (linkurile mp3tourl.com) și
fotografiile de pe elitetenisclub.ro nu au putut fi descărcate de pe serverul de lucru.

| Ce | Format recomandat | Unde se încarcă |
| --- | --- | --- |
| **Video-ul de prezentare** real (antrenamente, terenurile, sala) — rulează pe fundal pe toate paginile | orizontal, 1920 × 1080, 10–20 s, fără text pe imagine | Media, apoi Setări → Deschiderea paginii principale → Video |
| **Fotografia fiecărui antrenor** (acum apar inițialele pe un teren desenat) | vertical 4:5, minimum 1200 × 1500 px | Conținut → Echipa de antrenori → Fotografia |
| Fotografii proprii pentru fiecare program (acum sunt decupaje din cele două fotografii) | orizontal 16:10 | Conținut → Programe de pregătire → Fotografie |
| Fotografii pentru grupe (minge roșie, portocalie, verde, galbenă) | orizontal 3:2 | Conținut → Grupele clubului → Fotografie |
| Sala acoperită, vestiarele, recepția, sala de fitness | orizontal 3:2 | Conținut → Antetele paginilor → Facilități |
| **Galeria**: 10–20 de fotografii de la antrenamente și turnee | orice format | Conținut → Galerie foto și video |

Fotografiile cu copii se publică doar cu acordul scris al părinților (bifa din Galerie). Cele două
fotografii existente au fost publicate deja de club; **confirmă că aveți acordul** sau debifează-le.
Site-ul convertește singur video-urile pentru telefon (360p), tabletă (720p) și desktop (1080p).

## 2. Echipa de antrenori

Pe site sunt cei șase antrenori ceruți: Vlad Moșteanu (antrenor principal), Popescu Alexandru
Daniel, Croitoru Mihai, Godniac Ana, Arin Hrista și Bogdan. Descrierile sunt scurte și generale,
scrise din perspectiva clubului, fără fapte inventate.

| Ce | Unde |
| --- | --- |
| Numele de familie al lui Bogdan (acum apare doar prenumele) | Conținut → Echipa de antrenori |
| Pentru fiecare: 2–3 fraze de parcurs (de când antrenează, ce grupe are, rezultate) și fotografia | Conținut → Echipa de antrenori |
| Anii pentru licența UNEFS și certificarea de arbitru FRT (Popescu Alexandru Daniel); goi = nu apar | Conținut → Certificări și diplome |

## 3. Fapte de confirmat

| Ce e pe site acum | De unde vine | Unde se corectează |
| --- | --- | --- |
| Clubul există din **2013**, cu primele 4 terenuri în aer liber | prezentarea publică a clubului | Conținut → Secțiunile primei pagini → Povestea noastră |
| **Peste 10 ani** de tenis în școli și grădinițe | prezentarea publică a clubului | aceeași secțiune |
| Turneele găzduite: Cupa Elite Pantelimon, Cupa Elite Tenis (FRT), Cupa Elite Tenis Challenge, Super-Turneul Campionilor (Tenis10) | calendarele FRT și Tenis10 | Conținut → Turnee |
| Grupele: roșie 4–7 ani, portocalie 8–9, verde 9–11, galbenă de la 11 ani | etapele ITF „Play and Stay” | Conținut → Grupele clubului |
| Abonamentele lunare „de la 240 de lei” | site-ul vechi al clubului | Conținut → Grupele clubului → Taxa lunară |
| Tarifele de vară (de la 1 mai): afară 40/80 lei, în sală 50/80 lei, weekend 50/80 lei (07–17 / 17–22) și oferta Dunlop | afișul clubului, adaptat la programul 07:00–22:00 | Setări → Program de lucru → Tarifele de închiriere |
| Nota Google 4,5 din 257 de recenzii | profilul Google al clubului | Setări → Recenzii Google (actualizeaz-o lunar) |

## 4. Setări recomandate

| Ce | De ce | Unde |
| --- | --- | --- |
| **Coordonatele hărții** (latitudine, longitudine ale bazei) | acum butonul „Deschide în Google Maps” caută adresa; cu coordonatele apare harta pe pagină | Conținut → Locații |
| **Linkul „Scrie o recenzie”** din Google Business Profile → „Cere recenzii” | butoanele de recenzie duc direct la formular; tipărești codul QR pentru recepție | Setări → Recenzii Google, apoi Coduri QR |
| Tariful pe oră pentru fiecare tip de antrenament (opțional) | acum apare „Tarif la recepție”; cu tarif, cardurile cadou își calculează singure prețul | Conținut → Tipuri de antrenament |
| Programul exact al fiecărei grupe (opțional) | acum apare „stabilit la înscriere” | Conținut → Grupele clubului |
| Cheia Anthropic (opțional) | asistentul funcționează și fără ea, din răspunsurile clubului; cu ea răspunde liber, tot doar din conținutul site-ului | `.env` pe server: `ANTHROPIC_API_KEY` |
| TikTok (opțional) | apare în subsol lângă Instagram și Facebook | Setări → Contact |

## 5. Campania de iarnă

Banner-ul de pe prima pagină și ofertele de pe paginile Închiriere teren și Prețuri spun „cel mai
mic preț din București” pentru 60 RON/oră. O afirmație de tip superlativ trebuie să poată fi
dovedită (Legea 158/2008 privind publicitatea înșelătoare): păstrați o comparație datată cu
prețurile altor baze (capturi de ecran). La finalul iernii, schimbați sau ascundeți secțiunea din
Conținut → Secțiunile primei pagini → „Campania de iarnă” și tarifele din Setări.

## 6. Pagini legale și pe server

| Ce | Unde |
| --- | --- |
| **Verificarea de către un jurist** a paginilor Confidențialitate, Termeni și Cookie-uri (texte complete, dar nevalidate juridic), apoi bifa „verificat” | Conținut → Pagini legale |
| Domeniul, serverul, emailul (SMTP) și adresa pentru notificări | `DEPLOY.md` |
| Opțional: statistici Umami, protecție Turnstile, backup în afara serverului | `DEPLOY.md` |
