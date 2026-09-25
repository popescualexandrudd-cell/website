# Ce mai ai de completat

Tot ce apare pe site ca **[DE COMPLETAT]** e o informație pe care nu am inventat-o: trebuie să vină
de la club. Se completează în două feluri:

- **înainte de prima pornire**, în `config/club.yml` (se încarcă automat la prima pornire pe
  server, sau local cu `npm run db:reset`);
- **oricând după aceea, din panoul de administrare** (`/admin`). Tabloul de bord arată câte texte
  mai sunt marcate, iar în Conținut fiecare listă are eticheta „de completat” la elementele
  neterminate.

Pentru un alt club decât Elite Tenis Club, pornește de la [`SABLON.md`](SABLON.md). Pentru SEO,
brand și marketing (Google Business, recenzii, decizia despre domeniu, echipa reală de antrenori),
vezi [`docs/SEO-MARKETING.md`](docs/SEO-MARKETING.md), secțiunea 11.

## 1. Fotografii și video-uri reale (cel mai important)

Site-ul nu folosește nicio imagine de stoc sau generată: până încarci fotografiile și video-urile
clubului, locul lor arată un teren desenat în linii și o notă „[DE COMPLETAT]”. Toate se încarcă
din **Media** (fotografii până la 10 MB, video-uri până la 500 MB și 3 minute), apoi se aleg în
câmpul potrivit.

| Ce | Format recomandat | Unde se alege în admin |
| --- | --- | --- |
| **Video-ul de deschidere** a paginii principale: antrenamente reale la club (grupă de juniori, un schimb de mingi, terenurile) | orizontal, 1920 × 1080, 10–20 de secunde, fără text pe imagine; sunetul nu se aude | Setări → Deschiderea paginii principale → Video-ul de deschidere |
| Fotografia de deschidere (se vede până se încarcă video-ul și pe telefoanele cu economisire de date) | orizontal, minimum 2400 px lățime | Setări → Deschiderea paginii principale → Fotografia de deschidere |
| Logoul clubului: **pus deja** (logoul rotund „Club Sportiv Elite Tenis”, din `config/assets`); din el se fac și pictogramele site-ului. Un fișier mai clar (PNG sau SVG de la grafician) se poate încărca oricând | PNG cu fundal transparent, cel puțin 800 px | Setări → Identitatea clubului → Logoul |
| **Fotografia fiecărui antrenor** pe teren | vertical 4:5, minimum 1200 × 1500 px | Conținut → Echipa de antrenori → Fotografia |
| Un video scurt cu antrenorul la lucru (opțional) | orizontal, 10–30 de secunde | Conținut → Echipa de antrenori → Video |
| Fotografia terenurilor (secțiunea „Zgură, tot anul” și pagina Clubul) | vertical 4:5 sau orizontal 3:2 | Conținut → Antetele paginilor → Clubul |
| Fotografii pentru fiecare program (Inițiere, Competiție, Amatori) | orizontal 16:10 | Conținut → Programe de pregătire → Fotografie |
| Fotografii pentru fiecare grupă a academiei de juniori | orizontal 3:2 | Conținut → Grupele academiei de juniori → Fotografie |
| **Galeria**: fotografii și video-uri de la antrenamente, turnee, pe terenuri | orice format; primele 6 apar pe pagina principală | Conținut → Galerie foto și video |

Fotografiile și video-urile cu copii se publică **doar cu acordul scris al părinților** (bifa din
Galerie). La încărcare, din fișiere se șterg datele ascunse (locația GPS, modelul telefonului).

**Deja pe site**, din materialele clubului: fotografia de pe podium (galerie, „Turnee”, și sus pe
pagina „Palmares”) și grupa de copii pe zgură (galerie, „Grupe”). Clubul le-a publicat deja, așa că
au intrat cu bifa de acord a părinților: **confirmă că aveți acordul** sau debifează-le din
Conținut → Galerie.

**Cele două video-uri de prezentare** (linkurile mp3tourl.com) nu s-au putut descărca de aici
(serverul de lucru nu are acces la acel site). Descarcă-le pe calculator și încarcă-le din
**Media**: primul ca video de deschidere (Setări → Deschiderea paginii principale), al doilea în
Galerie. Site-ul le convertește singur pentru telefon și desktop.

## 2. Echipa de antrenori

Antrenorul principal, Popescu Alexandru Daniel, are deja parcursul, formarea, specializările și
limbile vorbite, doar din informațiile primite. Au rămas:

| Ce | În admin | În `club.yml` |
| --- | --- | --- |
| Fotografia (vezi secțiunea 1) | Conținut → Echipa de antrenori | — |
| Instituția care a eliberat atestatul de formare psihopedagogică | Conținut → Certificări și diplome | `antrenori[0].certificari[3].emitent` |
| Anii: licența UNEFS, certificarea de arbitru FRT, atestatul psihopedagogic (opțional; goi = nu apar) | Conținut → Certificări și diplome → Anul | `antrenori[0].certificari[].an` |
| **Ceilalți antrenori ai academiei**, dacă sunt: nume, rol, titulatură, parcurs, fotografie | Conținut → Echipa de antrenori → Adaugă un antrenor | `antrenori[]` |
| **De confirmat: antrenorii de pe site-ul actual al clubului** (elitetenisclub.ro): Vlad Moșteanu (acolo, antrenor principal), Cristian Tănase (antrenor de performanță), Doru Bolinu, Dragoș Popeangă. Sunt adăugați **nepublicați**: verifică scrierea numelor, rolurile (cine e antrenorul principal), acordul fiecăruia, apoi completează parcursul și fotografia și bifează „Activ” | Conținut → Echipa de antrenori | `antrenori[].publicat` |

## 3. Academia de juniori

Grupele sunt construite pe etapele ITF „Play and Stay” (minge roșie, portocalie, verde, galbenă),
cu vârstele recomandate. **Confirmă sau corectează** vârstele și completează pentru fiecare grupă:

| Ce | În admin | În `club.yml` |
| --- | --- | --- |
| Zilele și orele antrenamentelor | Conținut → Grupele academiei de juniori → Zile și ore | `academie_juniori.grupe[].zile_ore` |
| Antrenamente pe săptămână și durata lor | aceeași pagină | `sedinte_pe_saptamana`, `durata_min` |
| Taxa lunară (gol = „la cerere”) | aceeași pagină | `taxa_lunara_ron` |
| Numărul maxim de copii în grupă | aceeași pagină | `locuri` |
| Rezultatele sportivilor la turnee, cu acordul părinților | Conținut → Rezultate la turnee | — |

Cererile de evaluare trimise de părinți ajung în **Evaluări și așteptare** și pe email.

## 4. Contact și social media

| Ce | În admin | În `club.yml` |
| --- | --- | --- |
| WhatsApp (opțional; doar cifre, cu 40 în față) | Setări → Contact | `contact.whatsapp` |
| Instagram, Facebook, TikTok (opțional) | Setări → Contact | `contact.instagram` etc. |

## 5. Locația și terenurile

| Ce | În admin | În `club.yml` |
| --- | --- | --- |
| Coordonatele pentru hartă (latitudine, longitudine) | Conținut → Locații | `locatii[].coordonate` |
| Cum ajungi (parcare, transport) | Conținut → Locații → Cum ajungi | — |
| Nocturna pe terenurile în aer liber (da/nu) | Conținut → Terenuri | `terenuri[1].nocturna` |
| Racordare rachete și însoțire la turnee: confirmă și descrie, sau șterge | Conținut → Facilități și servicii | `servicii_incluse` |

## 6. Prețuri și program

| Ce | În admin | În `club.yml` |
| --- | --- | --- |
| Tariful pe oră pentru fiecare tip de lecție | Conținut → Tipuri de lecții | `lectii[].tarif_ora_ron` |
| Pachetele: numele, prețul | Conținut → Prețuri și pachete | `pachete` |
| Oferta pentru prima lecție (ex. „evaluare de 30 de minute, gratuită”) | Setări → Rezervări | `rezervari.prima_lectie` |
| Intervalele în care se primesc rezervări online (acum: programul de lucru) | Disponibilitate | `program_lucru` |
| Tarifele de închiriere: **puse din afișul clubului** (vară, de la 1 mai: afară 40/80 lei, în sală 50/80 lei, weekend 50/80 lei, ziua 08–17 / seara 17–01), iarna cu 10 lei mai mult pe oră, plus oferta cu mingile Dunlop în weekend. Completează data de la care încep tarifele de iarnă, dacă vreți să apară | Setări → Program de lucru → Tarifele de închiriere | `inchiriere.tarife` |
| Programul clubului: pus **zilnic 08:00–01:00**, din afișul cu tarifele clubului; corectează dacă diferă | Setări → Programul clubului | `program_club.zilnic` |
| Nocturnă pe terenurile în aer liber (da/nu) | Conținut → Terenuri | `locatii[0].terenuri[1].nocturna` |

## 6b. Povestea clubului și turneele (verifică faptele)

Povestea de pe prima pagină și de pe „Despre” folosește doar ce spune public clubul și calendarele
FRT și Tenis10. Confirmă sau corectează din Conținut → Secțiunile paginii principale → „Povestea
clubului”:

- **2013**: anul în care s-au deschis primele 4 terenuri în aer liber (din prezentarea clubului pe
  platformele de rezervare); anul sălii acoperite nu e public, deci nu apare;
- **peste 10 ani** de colaborare cu școli și grădinițe din București și Ilfov;
- turneele găzduite: Cupa Elite Pantelimon și Cupa Elite Tenis (FRT), Cupa Elite Tenis Challenge
  și Super-Turneul Campionilor (Tenis10). Pentru fiecare ediție nouă: Conținut → Turnee → datele și
  linkul de înscriere, ca să apară la „Turnee care urmează” și în Google.

## 6c. Funcții noi: carduri cadou, liga amatorilor, palmares

| Ce | Unde |
| --- | --- |
| Prețul cardurilor cadou cu lecții se calculează din **tariful pe oră** al lecției; până îl completezi, pe card scrie „Prețul ți-l spunem la telefon” | Conținut → Tipuri de lecții |
| Primul sezon al ligii: numele, datele, formatul și regulile (grupe, cum se joacă un meci, taxa, cine rezervă terenul) | Conținut → Liga: sezoane |
| Rezultatele academiei pentru **Palmares** (pentru copii doar prenumele și inițiala, cu acordul scris al părinților) | Conținut → Rezultate la turnee |
| **WhatsApp**: site-ul vechi are butonul „Mesaj WhatsApp!”. Scrie numărul (probabil tot 0722 501 748) și apar butoanele de WhatsApp pe tot site-ul | Setări → Contact → WhatsApp |
| Pagina „Ofertă pentru copii” de pe site-ul vechi: oferta pentru copii e acum pe „Academia de juniori”; dacă există o ofertă anume (preț, perioadă), adaug-o acolo | Conținut → Antetele paginilor → Academia |

## 7. Date legale și paginile legale

| Ce | Unde apare | În admin |
| --- | --- | --- |
| Forma de organizare (PFA, SRL, club sportiv), denumirea legală, CUI, nr. Registrul Comerțului, sediul | subsol, termeni, confidențialitate | Setări → Date legale |
| Furnizorul serverului și furnizorul de email | Politica de confidențialitate | Conținut → Pagini legale |
| Dacă un adult trebuie să rămână la bază în timpul lecțiilor copiilor mici | Termeni și condiții | Conținut → Pagini legale |
| Însoțirea la turnee (întrebarea „Pregătiți și pentru turnee?”) | Întrebări frecvente | Conținut → Întrebări frecvente |
| **Verificarea de către un jurist** a celor trei pagini legale (sunt ciorne), apoi bifa „verificat” | tablou de bord | Conținut → Pagini legale |

## 8. Recenzii și articole

| Ce | Detalii |
| --- | --- |
| **Recenziile de pe site** | Au intrat cele două recenzii complete de pe elitetenisclub.ro (Adrian M., Cristian). Alte două sunt tăiate pe site-ul vechi: sunt ciorne nepublicate, cu „[DE COMPLETAT]” (Conținut → Recenzii); completează textul întreg și numele, apoi publică-le. |
| **Nota de pe Google** | Apare 4,5 din 257 de recenzii (prima pagină, subsol, asistentul). Actualizeaz-o din când în când în Setări → Recenzii Google. |
| **Linkul „Scrie o recenzie”** | Din Google Business Profile → „Cere recenzii” → copiază linkul și pune-l în Setări → Recenzii Google. Până atunci, butoanele duc la club pe Google Maps. Apoi tipărește codul QR din admin → Coduri QR pentru recepție. |
| **Articolele din Sfaturi** | 3 ciorne; citește-le, adaptează-le și publică-le din Conținut → Articole. |

## 9. Pe server

| Ce | Unde |
| --- | --- |
| Domeniul și serverul | `DEPLOY.md`, pașii 1–3 |
| Datele de email (SMTP) și adresa pentru notificări | `.env`, `DEPLOY.md` |
| Opțional: Umami, Turnstile, backup în afara serverului | `DEPLOY.md` |
