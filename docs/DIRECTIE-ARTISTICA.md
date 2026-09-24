# Direcția artistică: picturile site-ului

Site-ul folosește acum imagini provizorii (compoziții SVG simple, cu paleta și așezarea corecte).
Documentul de față descrie picturile finale: ce trebuie să arate fiecare, cum se numește fișierul,
ce dimensiuni are și unde stă textul peste ea. Promptul se folosește în generatorul de imagini
ales (Midjourney, DALL·E, Firefly, Stable Diffusion) sau ca brief pentru un ilustrator.

## Cum înlocuiești o imagine

1. Salvezi pictura în `art-src/` cu **numele exact** din tabel și extensia `.jpg`, `.png` sau `.webp`
   (de exemplu `art-src/01-deschiderea.jpg`).
2. Varianta pentru telefon (9:16) se numește la fel, cu `-mobil` la final
   (`art-src/01-deschiderea-mobil.jpg`). Dacă lipsește, scriptul decupează automat centrul picturii
   desktop, deci punctul focal trebuie să fie în treimea din mijloc.
3. Rulezi `npm run images` (local) sau `./scripts/deploy.sh` (pe server, după ce ai pus fișierele
   în git). Scriptul produce AVIF și WebP pe mai multe mărimi, plus previzualizarea neclară.

Alternativ, din admin: Conținut → Scenele paginii principale → „Imagine încărcată”. O imagine
încărcată din admin înlocuiește pictura din setul de mai jos doar pentru scena respectivă.

## Reguli comune

- **Dimensiuni**: scenele au desktop **2560 × 1440** (16:9) și mobil **1080 × 1920** (9:16).
  Programele: **1200 × 1500** (4:5). Norii: **1600 × 900**, fundal transparent (PNG).
- **Fără text, logo-uri, semnături sau ramă** în imagine.
- **Mingea aurie** e singurul obiect modern și singurul punct cu adevărat luminos. Pe site, o minge
  desenată în cod „călătorește” între scene și se așază exact peste mingea din pictură; poziția ei
  se reglează din admin (Conținut → Scene → „Mingea aurie”), deci pictura nu trebuie potrivită la
  pixel, dar mingea trebuie să fie **rotundă, întreagă și nesuprapusă**.
- **Zona textului** din tabel trebuie să fie liniștită (fără detalii, contrast scăzut). Pe mobil,
  textul stă întotdeauna în treimea de jos, peste o trecere lină spre culoarea pergamentului.
- **Paleta**: pergament `#ECE3CF`, cerneală `#1D1A15`, ultramarin `#1846C4`, cer `#9CC0EC`,
  aur `#C9A13B`, zgură `#9E4A28`, noapte `#0B1B4D`. Picturile pot fi mai bogate, dar să nu iasă
  din această familie de culori.
- **Stilul comun**, adăugat la finalul fiecărui prompt:

  > Italian Renaissance oil painting, 16th century, soft chiaroscuro, muted earthy palette with
  > ultramarine sky, fine canvas texture and subtle craquelure, museum quality, calm and dignified,
  > one luminous gold tennis ball as the focal point, no text, no logos, no modern objects other
  > than the tennis ball.

- **Drepturi**: folosește doar imagini generate de tine, comandate cu cesiune de drepturi sau opere
  aflate sigur în domeniul public (trecute în `CREDITS.md` cu sursa). Nimic de pe alte site-uri.

## Scenele paginii principale

Pozițiile sunt în procente din lățimea (x) și înălțimea (y) picturii desktop, măsurate din colțul
din stânga sus.

### 01-deschiderea · scena 1 „Deschiderea”

- Fișiere: `01-deschiderea.jpg` (2560×1440), `01-deschiderea-mobil.jpg` (1080×1920)
- Text: desktop **stânga, la mijloc** (primele 5 din 12 coloane, x 8–45%); mobil jos.
- Punct focal: mingea la **x 64%, y 50%**, în mâna tânărului, la nivelul pieptului.
- Prompt: *Side profile portrait of a young man in an ochre Renaissance doublet, holding a small
  glowing gold tennis ball at chest height and an antique wooden jeu de paume racquet, plain warm
  plaster wall behind him, generous empty space on the left third* + stilul comun.
- Mobil: aceeași scenă încadrată vertical; mingea în treimea de sus, la x ~60%.

### 02-impreuna · scena 2 „Împreună”

- Fișiere: `02-impreuna.jpg`, `02-impreuna-mobil.jpg`
- Text: desktop **stânga jos**; mobil jos.
- Punct focal: mingea **exact în centru (x 50%, y 42%)**, între cele două mâini. Tranziția de după
  este un zoom prin minge, deci mingea trebuie să fie clară și bine conturată.
- Prompt: *Close-up of two hands, one weathered older hand and one young hand, passing a gold
  tennis ball between them, plain parchment-colored background, soft side light* + stilul comun.

### 03-cer · scena 3 „Filozofia”

- Fișiere: `03-cer.jpg`, `03-cer-mobil.jpg`
- Text: desktop **stânga, la mijloc**, text deschis la culoare; mobil jos.
- **Ajustare față de promptul inițial: fără minge în pictură.** În această scenă, mingea se
  formează pe site din puncte aurii (efect de rastru animat), la x 60%, y 44%. O minge pictată
  ar concura cu efectul. Zona din jurul acestui punct trebuie să fie cer liber.
- Prompt: *Deep ultramarine sky with scattered soft white cumulus clouds, vast empty space, clear
  open area slightly right of center, no objects* + stilul comun, **fără** „one luminous gold
  tennis ball as the focal point”.
- Norii pictați pot fi puțini: peste pictură se mișcă și norii separați `nor-01…05`.

### 04-schele și 04b-pergament · scena 4 „Metoda”

- Fișiere: `04-schele.jpg`, `04-schele-mobil.jpg`, `04b-pergament.jpg`, `04b-pergament-mobil.jpg`
- Text: desktop **stânga, la mijloc**; mobil jos.
- Punct focal 04-schele: mingea mare în construcție la **x 66%, y 46%**, ocupând ~24% din lățime.
- Punct focal 04b-pergament: planul terenului, desfășurat în jumătatea dreaptă; a doua imagine
  apare prin tranziția „pergament”, deci compozițiile trebuie să aibă aceeași linie a orizontului.
- Prompt 04-schele: *Craftsmen in classical tunics building a giant gold tennis ball on wooden
  scaffolding with ropes and ladders, bright blue sky, fresco style* + stilul comun.
- Prompt 04b-pergament: *A classical figure unrolling a large parchment showing a sepia ink
  architectural plan of a tennis court, wooden scaffolding around, blue sky* + stilul comun.

### 05-program-… · scena 5 „Programele” și paginile programelor

Scena 5 folosește `textura-pergament` ca fundal; ilustrațiile programelor apar pe cartonașele
din banda orizontală și în capul paginii fiecărui program.

- Fișiere (1200×1500, 4:5, fără variantă de mobil): `05-program-mini-tenis.jpg`,
  `05-program-juniori.jpg`, `05-program-adulti.jpg`, `05-program-performanta.jpg`,
  `05-program-video.jpg`, `05-program-tabere.jpg`
- Punct focal: subiectul în **centru**, mingea în jumătatea de sus. Marginile de jos pot fi
  acoperite de numele programului.

| Fișier | Prompt (+ stilul comun) |
| --- | --- |
| `05-program-mini-tenis` | *A small child in simple Renaissance clothes holding a short wooden racquet, bouncing a gold tennis ball in a sunny courtyard* |
| `05-program-juniori` | *Two young players in period clothing rallying on a terracotta clay court inside a stone courtyard, gold tennis ball mid-air* |
| `05-program-adulti` | *An adult learning a forehand while an older master gently guides his arm, courtyard with arches* |
| `05-program-performanta` | *An athlete mid-serve, body stretched upward, gold tennis ball at the peak of the toss, dramatic sky* |
| `05-program-video` | *A master and a student studying sequential drawings of a racquet swing pinned on a wooden board* |
| `05-program-tabere` | *A group of young players sitting in the shade of a tree beside a clay court, gold tennis balls in a woven basket* |

„Lecție individuală”, „Lecție în doi” și „Grupe copii și juniori” refolosesc ilustrațiile de mai sus;
fiecare program poate primi o fotografie proprie din admin.

### 06-schita-teren și 06b-mozaic · scenele 6 „Terenul” și 7 „Prima lecție”

- Fișiere: `06-schita-teren.jpg`, `06-schita-teren-mobil.jpg`, `06b-mozaic.jpg`, `06b-mozaic-mobil.jpg`
- **Ajustare: terenul e desenat vertical și centrat**, văzut de sus, cu lungimea pe verticală,
  ocupând **80% din înălțimea** picturii (dreptunghiul terenului: x 40–60%, y 10–90% pe desktop).
  Pe site, liniile terenului se desenează animat exact peste schiță, iar schița trece în mozaic;
  cele două imagini trebuie să aibă terenul în aceeași poziție și la aceeași mărime.
- Text: scena 6 **dreapta, la mijloc** (coloanele 9–12); scena 7 **stânga, la mijloc**. Pe mobil, jos.
- Punct focal 06b-mozaic: mingea **exact în centrul terenului (x 50%, y 50%)**, mică (~2% din lățime).
- Prompt 06: *Sepia ink technical drawing of a tennis court seen from directly above on aged
  parchment, court drawn vertically in the center, construction lines, compass marks, a few tiny
  workmen with tools* + stilul comun.
- Prompt 06b: *Top-down view of a tennis court designed as a Renaissance marble mosaic courtyard,
  court drawn vertically in the center, terracotta clay tones and ivory lines, geometric borders,
  a gold tennis ball exactly at the center* + stilul comun.

### 08-pom · scena 8 „Locurile”

- Fișiere: `08-pom.jpg`, `08-pom-mobil.jpg`
- Text: desktop **stânga, la mijloc** (zona liberă din stânga); mobil jos.
- Punct focal: mingea pe care o culege tânăra, la **x 72%, y 30%**. Urmează tranziția „curcubeu”.
- Prompt: *Young woman in a pale blue classical dress reaching up to pick gold tennis balls from a
  small tree in a terracotta urn, blue sky with clouds, empty space on the left* + stilul comun.

### 09-curcubeu și 09b-ramuri · scena 9 „Întrebările”

- Fișiere: `09-curcubeu.jpg`, `09-curcubeu-mobil.jpg`, `09b-ramuri.jpg`, `09b-ramuri-mobil.jpg`
- Text: **în centru**, peste un voal discret; întrebările frecvente și recenziile stau aici, deci
  centrul trebuie să fie calm.
- Punct focal 09-curcubeu: mingea la **x 50%, y 52%**, cu curcubeul în arc deasupra.
- Prompt 09: *A single gold tennis ball in a pale blue sky with a soft rainbow arc behind it* +
  stilul comun.
- Prompt 09b: *Dense branches with green leaves and many gold tennis balls hanging like fruit, blue
  sky showing through, a calm open area in the center for text* + stilul comun.

### 10-constelatie · scena 10 „Constelația”

- Fișiere: `10-constelatie.jpg`, `10-constelatie-mobil.jpg`
- Text și formularul de rezervare: desktop **dreapta, la mijloc**, text deschis la culoare; mobil jos.
- Punct focal: steaua cea mai strălucitoare (mingea) la **x 42%, y 26%**; linia constelației
  urmează arcul unei mingi care trece peste teren, în jumătatea stângă. Pe site, liniile
  constelației se desenează animat peste pictură.
- Prompt: *Night ultramarine sky, a classical figure in a white robe pointing up at a constellation
  whose star lines trace the arc of a tennis ball flying over a court, figure and court on the left
  half, the right half is calm dark sky* + stilul comun.

### Texturi și nori

| Fișier | Dimensiuni | Prompt |
| --- | --- | --- |
| `textura-pergament.jpg` (+ `-mobil`) | 2560×1440 / 1080×1920 | *Seamless aged parchment texture, warm, subtle fibers, no stains, no text* |
| `nor-01.png` … `nor-05.png` | 1600×900, fundal transparent | *Single painted white cumulus cloud isolated on a transparent background (PNG), for parallax layers* + stilul comun, fără minge |

Norii se folosesc în scenele 3, 8 și 9, în trei planuri care se mișcă la viteze diferite.

## Paginile interioare

Capul fiecărei pagini refolosește una dintre picturi (alegerea se schimbă din admin, Conținut →
Antetele paginilor). Opțional, se pot folosi gravuri și picturi istorice cu jeu de paume aflate
sigur în domeniul public (The Met Open Access, Rijksmuseum, Wikimedia Commons cu licență PD);
fiecare se trece în `CREDITS.md` cu sursa și licența.

## Fotografiile antrenorului

Fotografiile reale (portret, lecții, terenuri) se pun în `art-src/foto/` și primesc automat o
gradare caldă și un grain fin, ca să stea bine lângă picturi. Din admin, aceeași prelucrare se
aplică bifând „Aplică tratamentul cald” la încărcare. Portret recomandat: vertical 4:5, lumină
naturală laterală, fundal simplu, fără ochelari de soare.

Fotografiile cu copii se publică doar cu acordul scris al părinților (bifat în admin, Galerie).
