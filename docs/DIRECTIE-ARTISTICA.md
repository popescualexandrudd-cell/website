# Direcția artistică: zgură, tipografie de academie, 3D

Site-ul arată ca o academie de tenis: culorile terenului de zgură, titluri în majuscule condensate,
o scenă 3D în timp real pe pagina principală și fotografii reale acolo unde contează. Documentul
spune ce e fiecare element și, mai ales, **cum să faci fotografiile** care completează designul.

## Paleta

| Culoare | Cod | Unde |
| --- | --- | --- |
| Nisip | `#F6EFE6` | fundalul paginilor |
| Nisip adânc | `#ECDFCD` | secțiunile alternante |
| Zgură | `#B94C22` | butoane, accente, secțiunea „Filozofia” |
| Zgură adâncă | `#9A3D19` | linkuri, etichete mici pe fond deschis |
| Cărămidă închisă | `#2A130B` | antet, subsol, secțiunile închise |
| Galben cald | `#F2B134` | linii decorative, cifre mari pe fond închis |
| Galbenul mingii | `#D9E453` | puncte de listă, pictograma site-ului |

Textul mic de pe zgură e mereu crem, iar galbenul nu se folosește pentru text mic pe fond deschis:
altfel contrastul nu ajunge la nivelul AA.

## Tipografia

- **Titluri**: Barlow Condensed, 700, majuscule. Scurte: două-trei rânduri pe desktop.
- **Text**: Inter. Paragrafe de 2–4 fraze, fără jargon inutil, dar cu termenii corecți de
  specialitate (lanț kinetic, obiectiv operațional, periodizare).
- **Etichetele** de deasupra titlurilor: Inter 600, majuscule spațiate, cu o linie galbenă.

## Scena 3D

- **Pagina principală**: un meci pe zgură, la lumina de după-amiază. Doi jucători schimbă mingi cu
  traiectorii calculate fizic (efect liftat, ricoșeu pe zgură, urme de minge și praf), cu serviciu,
  schimburi și punct câștigător; camera schimbă unghiul la fiecare punct.
- **Laboratorul tehnic** (secțiunea „Metoda”): același teren, un singur jucător care repetă
  dreapta, reverul sau serviciul cu încetinitorul. Vizitatorul oprește mișcarea, alege faza și
  rotește camera.
- **Jucătorii sunt manechine biomecanice**, nu personaje fotorealiste. Oameni care să pară filmați
  cer modele scanate și animații înregistrate cu motion capture, realizate de un artist 3D; pentru
  un astfel de proiect, brief-ul ar porni de la cele trei lovituri de mai sus și de la dimensiunile
  terenului din `components/court3d/engine/court.ts`.
- Pe dispozitive fără accelerare grafică, la „economisire date” sau dacă WebGL lipsește, apare
  desenul static al terenului; conținutul paginii rămâne complet.

## Fotografiile tale

Designul are loc rezervat pentru fotografii reale. Până le încarci, locurile lor arată un teren
desenat în linii (și, la fotografia ta, nota „[DE COMPLETAT]”).

### 1. Fotografia ta pe teren (cea mai importantă)

Apare în secțiunea „Antrenorul” de pe pagina principală și pe „Despre mine”.

- **Format vertical 4:5**, minimum **1200 × 1500 px** (ideal 1600 × 2000).
- **Pe zgură**, ca fotografia să continue culorile site-ului. Fundal liniștit: gardul verde, cerul
  sau terenul, fără alte persoane.
- **Lumină**: dimineața devreme sau spre apus, cu soarele din lateral; evită amiaza (umbre dure pe
  față) și contre-jourul puternic.
- **Cadru**: de la genunchi în sus sau întreg, cu racheta în mână; privirea spre cameră sau spre
  teren. Lasă puțin spațiu deasupra capului.
- **Unde o încarci**: admin → Conținut → Profilul antrenorului → **Fotografia ta**. Scrie și
  descrierea (de exemplu „Alexandru Daniel Popescu pe terenul de zgură de la Elite Tennis Club”).

### 2. Fotografii pentru programe (opționale)

Câte una pentru fiecare program, **format orizontal 16:10** (minimum 1600 × 1000 px) pe pagina
principală și 4:5 pe pagina programului; aceeași fotografie se decupează automat din centru, deci
subiectul trebuie să stea la mijloc. Admin → Conținut → Programe → „Fotografie (opțională)”.

### 3. Fotografii pentru antetele paginilor (opționale)

**Orizontal 3:2**, minimum 1600 px lățime: terenul, baza sportivă, o lecție. Admin → Conținut →
Antetele paginilor.

### 4. Galerie

Lecții, grupe, turnee, terenuri. Fotografiile cu copii se publică doar cu acordul scris al
părinților (bifa „Acord” din admin).

### Tratamentul cald

La încărcare poți bifa **„Aplică tratamentul cald”**: culori ușor mai calde și granulație fină, ca
fotografii făcute în lumini diferite să arate unitar pe paleta de zgură. Nu îl folosi pe fotografii
deja editate.
