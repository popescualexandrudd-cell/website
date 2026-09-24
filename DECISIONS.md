# Decizii de proiect

Acest fișier păstrează planul de design și fiecare decizie luată fără să întreb, cu motivul ei.
Ordinea: întâi planul vizual (scris înainte de cod), apoi deciziile tehnice, în ordinea în care au apărut.

---

## Partea I. Planul de design

### 1. Principiul

„Jocul se construiește." Pagina principală e o expoziție în zece săli. Fiecare sală are o singură
pictură, un singur gând și aceeași minge aurie. Mingea e singurul element care se mișcă între săli;
tot restul stă pe loc și se schimbă prin dizolvare, zoom sau mască, legate strict de scroll.

Ce am verificat față de secțiunile 3–5 înainte de cod:

| Tentație de șablon | Ce fac în loc |
| --- | --- |
| Etichetă cu majuscule deasupra fiecărui titlu („PROGRAME") | Nicio etichetă. Indexul din stânga spune deja unde ești. |
| Grilă de carduri pentru programe | Bandă orizontală cu picturi mici, fiecare cu legenda dedesubt, ca într-o sală de muzeu. Pe mobil, listă editorială. |
| Numere 01, 02, 03 decorative | Numerotare doar în „Cum lucrăm", pentru că e o secvență reală. |
| Săgeată lipită de textul butonului („Rezervă →") | Butoanele spun doar acțiunea. Direcția o dă poziția. |
| Fade-up la fiecare secțiune | Textul apare numai în scenele fixate, legat de scroll, ca parte din coregrafie. Paginile interioare nu au animații de apariție. |
| Gradient decorativ de fundal | Singurul gradient e cel al mingii (auriu, radial). Voalul de sub text e o pată de pergament, nu un gradient de efect. |
| Hero cu „Bun venit" | Scena 1 începe direct cu o afirmație despre învățare. |
| Monospace pentru etichete | Nu. Două familii, atât: Cormorant Garamond și Hanken Grotesk. |

### 2. Tokens

```
Culori                          Rol
--color-pergament  #ECE3CF      fundal pagini interioare, scene-schiță
--color-pergament-adanc #E2D5B8 fundal secundar (liste, câmpuri)
--color-cerneala   #1D1A15      text principal
--color-cerneala-2 #4A4338      text secundar (contrast 7,6:1 pe pergament)
--color-ultramarin #1846C4      scene de cer, linkuri, focus
--color-cer        #9CC0EC      nori, fundaluri secundare
--color-aur        #C9A13B      mingea, detalii rare (niciodată text pe pergament: 1,9:1)
--color-aur-deschis #F4DC8A     capătul luminos al gradientului
--color-aur-inchis #6E5214      capătul umbrit al gradientului
--color-zgura      #9E4A28      exclusiv informații despre terenuri (4,75:1 pe pergament)
--color-noapte     #0B1B4D      cerul din scena 10 (derivat din ultramarin)
```

Contraste verificate (WCAG 2.2, text normal ≥ 4,5:1):

- cerneală pe pergament: 13,5:1
- pergament pe ultramarin: 6,1:1
- ultramarin pe pergament (linkuri): 6,1:1
- cerneală pe cer `#9CC0EC`: 8,9:1
- pergament pe cer: 1,5:1, deci interzis; pe cer deschis textul e mereu cerneală
- zgură pe pergament: 4,75:1
- aur pe cerneală (butonul-minge din bara mobilă): 7,1:1

Tipografie, scală modulară 1,333, bază 18 px (17 px sub 768 px):

```
--step--1  13,5 px   index scene, note, metadate
--step-0   18 px     corp (interlinie 1,6, max 65ch)
--step-1   24 px     subtitluri, lead
--step-2   32 px     titluri de secțiune în paginile interioare
--step-3   42,6 px   titluri de pagină pe mobil
--step-4   56,8 px   titluri de pagină pe desktop
--step-5   75,7 px   titlurile scenelor pe desktop
```

Display: Cormorant Garamond 300/400/500 + italic, tracking −0,015em la corpuri mari.
Text: Hanken Grotesk 400/500. Butoanele: Hanken 500, 15–16 px, fără majuscule.
Italicul caligrafic (Cormorant italic 300, cu `font-feature-settings: "swsh", "salt"` unde fontul le are)
apare o singură dată: titlul scenei 9.

### 3. Grila

Desktop (≥ 1024 px): 12 coloane, margine exterioară `clamp(24px, 4vw, 64px)`, șanț 24 px.
Coloana 1 e rezervată indexului de scene (fix, stânga). Textul scenelor stă în coloanele 2–12,
aliniat la stânga, în spațiul negativ al picturii.

Tabletă (768–1023 px): 8 coloane, indexul se ascunde, rămâne linia de progres.

Mobil (< 768 px): 4 coloane, margine 20 px. Scenele se stivuiesc: imaginea 9:16 ocupă ecranul,
textul stă în treimea de jos peste un voal de pergament sau în continuarea imaginii.

Pozițiile posibile ale textului (câmpuri editabile în admin, per scenă, separat desktop/mobil):
`STANGA_SUS, STANGA_CENTRU, STANGA_JOS, DREAPTA_SUS, DREAPTA_CENTRU, DREAPTA_JOS, CENTRU_SUS, CENTRU, CENTRU_JOS`.
Stânga = coloanele 2–6, dreapta = coloanele 8–12, centru = coloanele 4–9.

### 4. Interfața permanentă

```
┌───────────────────────────────────────────────────────────────────────┐
│ (M)                                             Rezervă    Meniu      │  monogram · buton · meniu
│                                                                       │
│ Deschiderea ─                                                         │
│ Împreună                                                              │  index: numele scenelor,
│ Filozofia                                                             │  o linie verticală de progres,
│ Metoda                                                                │  scena curentă în cerneală plină,
│ Programe                                                              │  restul la 60% opacitate
│ ...                                                                   │
└───────────────────────────────────────────────────────────────────────┘
```

UI-ul își schimbă tonul (cerneală sau pergament) după scena curentă, prin `data-tone` pe `<html>`.
Meniul e un overlay pe pergament, cu linkuri mari în Cormorant 400, câte unul pe rând.
Pe mobil, după prima scenă, apare jos o bară fixă: „Rezervă” (cerneală plină) și „WhatsApp”.

### 5. Scenele, una câte una

Legendă: `▓` zonă încărcată a picturii, `●` mingea, `░` voal local de pergament, `T` text.
Coordonatele mingii sunt procente din imagine; ele sunt câmpuri editabile (`ballX`, `ballY`, `ballSize`),
ca mingea călătoare să aterizeze exact peste mingea pictată când se schimbă imaginea.

**Scena 1 · Deschiderea** · tranziție de ieșire: zoom lent spre minge

```
Desktop 1440×900                                   Mobil 390×844
┌─────────────────────────────────────────────┐    ┌──────────────┐
│ (M)                          Rezervă  Meniu │    │(M)     Meniu │
│ index                         ▓▓▓▓▓▓        │    │    ▓▓▓▓▓     │
│      T Tenisul se învață     ▓▓▓▓▓▓▓▓       │    │   ▓▓▓▓▓▓▓    │
│      T lovitură cu lovitură. ▓▓ ●▓▓▓▓       │    │   ▓▓●▓▓▓▓    │
│      t Nume, antrenor...     ▓▓▓▓▓▓▓▓▓      │    │   ▓▓▓▓▓▓▓    │
│      [Rezervă o lecție]       ▓▓▓▓▓▓▓       │    │░T Tenisul se░│
│                                ▓▓▓▓▓        │    │░t Nume, ... ░│
└─────────────────────────────────────────────┘    │░[Rezervă]   ░│
 text: STANGA_CENTRU, cerneală pe tencuială caldă   └──────────────┘
 minge: 64%, 50%                                     text: CENTRU_JOS
```

**Scena 2 · Împreună** · ieșire: zoom prin minge, spre albastru

```
┌─────────────────────────────────────────────┐    ┌──────────────┐
│                                             │    │              │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ ● ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓      │    │▓▓▓▓▓ ● ▓▓▓▓▓ │
│ ▓▓▓ mâna matură   mâna tânără ▓▓▓▓▓         │    │▓▓▓▓▓▓▓▓▓▓▓▓▓ │
│                                             │    │              │
│      T Eu aduc metoda.                      │    │ T Eu aduc    │
│      T Tu aduci răbdarea.                   │    │ T metoda...  │
│      t Progresul se vede...                 │    │ t Progresul  │
└─────────────────────────────────────────────┘    └──────────────┘
 text: STANGA_JOS · minge 50%, 42%                    text: CENTRU_JOS
```

**Scena 3 · Filozofia** · mingea se compune din puncte halftone; ieșire: norii trec prin cadru

```
┌─────────────────────────────────────────────┐    ┌──────────────┐
│      ☁           ☁                          │    │  ☁      ☁    │
│      T Un joc bun e făcut        · · ·      │    │     ·:●:·    │
│      T din lucruri mici.       · :●: ·      │    │              │
│      t Priza. Pasul de...        · · ·      │    │T Un joc bun  │
│            ☁                ☁               │    │t Priza. ...  │
└─────────────────────────────────────────────┘    └──────────────┘
 text: STANGA_CENTRU, pergament pe ultramarin · minge 60%, 44%
```

**Scena 4 · Metoda** · două picturi (schele, apoi pergamentul); ieșire: pergamentul umple ecranul

```
┌─────────────────────────────────────────────┐    ┌──────────────┐
│ ░░░░░░░░░░░░░░░░░         ▓▓▓▓▓▓▓▓▓▓        │    │   ▓▓▓●▓▓▓    │
│ ░T Cum lucrăm    ░      ▓▓▓  ●  ▓▓▓▓        │    │   ▓▓▓▓▓▓▓    │
│ ░1 Evaluare ...  ░     ▓▓▓▓▓▓▓▓▓▓▓▓▓        │    │T Cum lucrăm  │
│ ░2 Plan ...      ░      ▓▓ schele ▓▓        │    │1 Evaluare    │
│ ░3 Antrenament   ░      ▓▓▓▓▓▓▓▓▓▓▓         │    │2 Plan        │
│ ░4 Verificare    ░                          │    │3 ...  4 ...  │
└─────────────────────────────────────────────┘    └──────────────┘
 text: STANGA_CENTRU, pe voal; pașii apar pe rând, legat de scroll
```

**Scena 5 · Programele** · bandă orizontală fixată pe pergament; mingea sare între picturi

```
┌─────────────────────────────────────────────┐    ┌──────────────┐
│ T Pentru cine   ┌────┐  ┌────┐  ┌────┐  ┌── │    │T Pentru cine │
│                 │ ▓● │  │ ▓▓ │  │ ▓▓ │  │ ▓ │    │┌───┐ Mini-   │
│                 │ ▓▓ │  │ ▓● │  │ ▓▓ │  │ ▓ │    ││▓● │ tenis   │
│                 └────┘  └────┘  └────┘  └── │    │└───┘ 4–7 ani │
│                 Mini-   Grupe   Adulți      │    │┌───┐ Grupe   │
│                 tenis   copii   începători  │    ││▓▓ │ copii   │
│                 4–7 ani 8–16    60 min      │    │└───┘ ...     │
│                 de la…  de la…  de la…      │    │              │
└─────────────────────────────────────────────┘    └──────────────┘
 scroll vertical → mișcare orizontală a benzii       listă verticală, fără fixare
```

**Scena 6 · Terenul** · liniile terenului se desenează; schița devine mozaic; ieșire: dizolvare

```
┌─────────────────────────────────────────────┐    ┌──────────────┐
│    ┌──────────┬──────────┐    T Unde jucăm  │    │ ┌────┬────┐  │
│    │  ┌───────┼───────┐  │    t Zgură: 4    │    │ │  ┌─┼─┐  │  │
│    │  │       ●       │  │    t Hard: 2     │    │ │  │ ● │  │  │
│    │  └───────┼───────┘  │    t Nocturnă... │    │ └──┴─┴─┴──┘  │
│    └──────────┴──────────┘    Vezi facilit. │    │T Unde jucăm  │
└─────────────────────────────────────────────┘    └──────────────┘
 text: DREAPTA_CENTRU · informațiile de teren în zgură
```

**Scena 7 · Prima lecție** · același mozaic, cadru mai larg; ieșire: mască de pensulă spre cer

```
┌─────────────────────────────────────────────┐    ┌──────────────┐
│                           ┌──────────────┐  │    │ ┌──────────┐ │
│ T Prima lecție este       │ ▓▓▓▓▓▓▓▓▓▓▓▓ │  │    │ │ ▓▓▓●▓▓▓▓ │ │
│ T o evaluare.             │ ▓▓▓▓▓●▓▓▓▓▓▓ │  │    │ └──────────┘ │
│ t [prima lecție] Vedem... │ ▓▓▓▓▓▓▓▓▓▓▓▓ │  │    │T Prima lecție│
│ Vezi prețurile            └──────────────┘  │    │t ...         │
└─────────────────────────────────────────────┘    └──────────────┘
 mozaicul se micșorează la ~62% și se așază la dreapta; text STANGA_CENTRU
```

**Scena 8 · Locurile** · nori în parallax; ieșire: apare curcubeul

```
┌─────────────────────────────────────────────┐    ┌──────────────┐
│  ☁                              ▓▓●▓▓       │    │      ▓▓●▓▓   │
│      T Lucrez cu puțini elevi.  ▓●▓▓▓●      │    │      ▓▓▓▓▓   │
│      t Ca fiecare să primească   ▓▓▓        │    │       ▓▓▓    │
│      t Locuri libere în mai: 7  ▓▓▓▓▓       │    │T Lucrez cu   │
│                     ☁            ▓▓▓        │    │t Locuri: 7   │
└─────────────────────────────────────────────┘    └──────────────┘
 text: STANGA_CENTRU, cerneală pe cer deschis
```

**Scena 9 · Întrebările** · curcubeu, apoi ramuri; textul curge liber peste fundalul fix

```
┌─────────────────────────────────────────────┐    ┌──────────────┐
│ ▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │    │░░░░░░░░░░░░░░│
│ ▓▓●▓▓▓▓▓░ T Întrebat înainte ░▓▓▓●▓▓▓▓▓▓▓▓  │    │░T Întrebat  ░│
│ ▓▓▓▓▓▓▓▓░   de prima lecție  ░▓▓▓▓▓▓▓▓▓▓▓▓  │    │░+ Ce echip. ░│
│ ▓▓▓▓▓▓▓▓░ + Ce echipament... ░▓▓▓▓▓▓▓▓▓▓▓▓  │    │░+ De la ce  ░│
│ ▓▓▓▓▓▓▓▓░ + De la ce vârstă  ░▓▓▓▓▓▓▓▓●▓▓▓  │    │░„recenzie”  ░│
└─────────────────────────────────────────────┘    └──────────────┘
 text: CENTRU, pe o coloană de pergament; singurul titlu în italic caligrafic
```

**Scena 10 · Constelația** · cerul se întunecă; mingea devine stea

```
┌─────────────────────────────────────────────┐    ┌──────────────┐
│        ✦ · · ✦                              │    │   ✦ · ✦ ·    │
│      ✦       · ●    T Următoarea lovitură   │    │ ✦      ●     │
│   ✦            ·    T e a ta.               │    │T Următoarea  │
│  ▓▓                 [program ▾]             │    │[program ▾]   │
│ ▓▓▓▓ figura         [10:00][11:10][17:00]   │    │[10:00][11:10]│
│ ▓▓▓▓▓               tel · WhatsApp · email  │    │tel · WhatsApp│
└─────────────────────────────────────────────┘    └──────────────┘
 text: DREAPTA_CENTRU, pergament pe noapte
```

### 6. Mișcarea

- Scenele au un „stage” lipit (`position: sticky`) cu straturile de imagine suprapuse;
  textele sunt în fluxul normal al documentului, peste stage. Asta ține textul accesibil:
  ordinea de tab e ordinea de citire, nimic nu e ascuns în straturi invizibile.
- Mingea călătoare e un strat fix. În interiorul unei scene stă exact peste mingea pictată
  și e aproape invizibilă; în tranziții preia rolul și zboară spre mingea scenei următoare.
- Tranzițiile sunt un tip editabil (`Scene.transition`): `DIZOLVARE`, `ZOOM_LENT`, `ZOOM_MINGE`,
  `NORI`, `PERGAMENT`, `MASCA_PENSULA`, `CURCUBEU`, `NOAPTE`. Fiecare e o funcție care primește
  stratul care iese, stratul care intră și poziția mingii.
- Singura animație autonomă: norii derivă lent (CSS, 90–140 s pe ciclu).
- `prefers-reduced-motion`: fără stage, fără minge, fără shader; fiecare scenă e imagine statică
  urmată de text.
- Sub 768 px: fără pinning, fără shader, fără minge călătoare; imaginile 9:16 se dizolvă simplu.

### 7. Paginile interioare

```
┌─────────────────────────────────────────────┐
│ (M)                          Rezervă  Meniu │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │  pictura-antet, 16:9 tăiată la ~55vh
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
│                                             │
│   T Programe                                │  titlu --step-4, coloanele 2–8
│   t intro pe o coloană îngustă              │
│   ─────────────────────────────────────     │
│   Mini-tenis              4–7 ani · 45 min  │  listă editorială: rânduri cu filet
│   Descriere scurtă...     de la 250 lei     │  subțire, nu carduri
│   ─────────────────────────────────────     │
└─────────────────────────────────────────────┘
```

---

## Partea a II-a. Decizii tehnice

1. **Next.js 16.3.6** (ultima stabilă la instalare), React 19, App Router, Server Actions.
   `middleware.ts` se numește acum `proxy.ts` în Next 16; acolo stau i18n și CSP cu nonce.
2. **TypeScript 5.9.3**, nu 6.0 sau 7.0. TypeScript 7 (portul nativ) nu are încă API-ul pe care îl
   folosesc typescript-eslint și verificarea de tipuri din Next; 6.0 schimbă valori implicite
   (`types: []`) și e la limita suportului typescript-eslint (`<6.1`). 5.9 e ultima versiune pe care
   tot ecosistemul o suportă fără rezerve.
3. **ESLint 9**, nu 10: `eslint-plugin-react` (inclus în `eslint-config-next`) nu e compatibil cu 10.
4. **Prisma 7.10** cu `@prisma/adapter-pg` (clientul fără motor Rust). Eticheta `latest` a CLI-ului
   indica un RC 8.0; am fixat 7.10.0, ultima versiune stabilă.
5. **Autentificare proprie** în loc de Better Auth / Auth.js. Auth.js nu permite sesiuni în baza de date
   cu furnizorul Credentials (forțează JWT), iar Better Auth aduce tabele și fluxuri de care nu avem
   nevoie (cont, verificare email, OAuth). Implementarea urmează modelul recomandat după retragerea
   Lucia: token aleator de 32 de octeți în cookie `httpOnly`, `secure`, `sameSite=lax`, stocat în
   baza de date doar ca SHA-256; parole argon2id (`@node-rs/argon2`); sesiune regenerată la fiecare
   login; blocare temporară după încercări greșite.
6. **Constrângerea de excludere** folosește `tstzrange("startsAt", "blockedUntil")`, unde
   `blockedUntil = endsAt + pauza dintre lecții` la momentul rezervării. Cu `endsAt` simplu, două cereri
   simultane ar putea lăsa două lecții lipite, fără pauză; așa, pauza e garantată de baza de date.
   Constrângerea se aplică doar lecțiilor exclusive (fără `groupScheduleId`) în stările active.
   În plus, crearea rezervărilor ia un `pg_advisory_xact_lock`, ca verificarea capacității grupelor
   să fie și ea sigură la cereri simultane.
7. **Engleza folosește căi traduse** (`/en/programs`, `/en/pricing`), nu căile românești sub `/en`,
   pentru SEO și pentru că un vizitator englez citește adresa.
8. **Modele adăugate** față de secțiunea 8: `LegalPage` (paginile legale sunt conținut editabil,
   cu versiune și marcajul „De verificat de un jurist"), `PageHeader` (titlul, introducerea și
   pictura-antet ale fiecărei pagini interioare, ca antrenorul să poată schimba orice text și orice
   imagine), `RateLimit` (limitare de rată în Postgres, comună aplicației și worker-ului).
9. **Configurația din secțiunea 0** stă în `config/antrenor.yml`, citită de seed. Orice valoare care
   încă are paranteze pătrate devine `[DE COMPLETAT]`. Seed-ul creează doar ce lipsește (nu suprascrie
   ce ai editat în admin); `npm run db:reset` reconstruiește totul din fișier.
10. **Prețurile lipsă** sunt `NULL` în baza de date și se afișează ca `[DE COMPLETAT]`; nu pun un preț
    inventat. JSON-LD omite prețul când lipsește.
11. **Node 22 LTS** în Docker, aceeași versiune ca în mediul de dezvoltare și în CI.
12. **Playwright 1.56.1**, fixat pe versiunea browserelor preinstalate în mediul de lucru; în CI se
    instalează browserul potrivit automat.
13. **„Locuri libere în [luna curentă]: N"** numără intervalele libere de lecție individuală de 60 de
    minute rămase în luna curentă, fără suprapuneri și cu pauza inclusă, plus locurile libere din
    grupe. Numărul e cinstit doar dacă disponibilitatea din admin reflectă timpul deschis pentru
    elevi noi, nu tot programul de lucru; asta e explicat în `GHID-ADMIN.md`.
14. **Grupele** au un câmp `membersCount` (elevii obișnuiți, întreținut de antrenor). Locuri libere la o
    ședință = capacitate − membri − cereri active pentru acea ședință.
15. **Butoanele din emailul antrenorului** (confirmă / refuză) duc la o pagină cu token semnat HMAC,
    valabil 7 zile, care cere o apăsare de confirmare (POST). Un GET nu schimbă nimic, pentru că
    scanerele de email deschid automat linkurile.
16. **Fișierele încărcate** stau în volumul `media`, servit de Caddy direct (`file_server`, fără
    execuție). În dezvoltare le servește o rută Next care citește același director.
17. **Paginile publice se randează la cerere** (datele vin din Postgres, editate din admin), cu
    `React.cache` pentru deduplicare. Build-ul Docker nu are nevoie de baza de date.
18. **Previzualizarea** folosește `draftMode()` din Next: din admin pornești previzualizarea și vezi
    site-ul cu ciornele și elementele inactive, cu o bandă „Previzualizare" sus.
19. **Harta** e un iframe OpenStreetMap încărcat doar la click (nu cere cont, nu setează cookie-uri de
    marketing), cu link spre Google Maps pentru navigație.
20. **`config/antrenor.yml` are în plus câmpul `localitate`** la locație: titlurile SEO locale
    („Antrenor de tenis în [localitate]") au nevoie de oraș separat de adresa completă.
21. **Valorile opționale** din configurație („[opțional: …]", „[url sau gol]") rămân goale, nu devin
    `[DE COMPLETAT]`: un link de Instagram „de completat" n-ar avea sens pe site.
22. **Serviciile condiționate** („[Racordare rachete, dacă e cazul]") apar cu numele lor și cu
    descrierea `[DE COMPLETAT]`, ca antrenorul să le confirme sau să le șteargă. Nu le prezint ca fapte.
23. **Orarul grupelor din seed este o propunere** (marți/joi 17:00 mini-tenis etc.), în intervalul de
    lucru din configurație. E listat în `CONTENT-TODO.md` ca de verificat.
24. **`npm run db:reset`** folosește `prisma migrate reset`. Prisma 7 refuză să ruleze această comandă
    când detectează un agent AI fără acordul explicit al utilizatorului. Am verificat echivalentul pe
    o bază nouă: `migrate deploy` + seed rulat de două ori (a doua rulare nu creează nimic).
25. **Stripe nu este implementat**: configurația are `plata_online_stripe: false`. Un comutator fără
    modul în spate ar fi fost un stub. Limitarea și pașii de adăugare sunt în raportul final.
26. **Pictura scenei 3 (`03-cer`) nu conține mingea.** În scena 3 mingea se compune pe site din
    puncte halftone (shader). O minge pictată ar concura cu ea. În variantele mobilă și statică,
    aceeași minge e desenată în CSS peste pictură. Promptul din `docs/DIRECTIE-ARTISTICA.md` e ajustat.
27. **Terenul din scenele 6–7 e vertical și centrat** (vedere de sus, lungimea pe verticală, 80% din
    înălțimea picturii). Așa schița, mozaicul și liniile desenate pe scroll se suprapun exact, iar
    textul are loc de o parte și de alta.
28. **Tranzițiile sunt generice**: fiecare tip (`DIZOLVARE`, `ZOOM_LENT`, `ZOOM_MINGE`, `NORI`,
    `PERGAMENT`, `MASCA_PENSULA`, `CURCUBEU`, `NOAPTE`) funcționează între oricare două scene, deci
    antrenorul poate schimba tipul sau ordinea scenelor din admin fără cod.
29. **Imaginile din stage se descarcă doar în modul cinematic** (`<source media>` cu interogarea
    cinematică și un pixel transparent în rest): pe mobil și cu reduced-motion nu se descarcă nimic
    în plus. GSAP, Lenis și shader-ul se încarcă dinamic, tot doar în modul cinematic.
30. **Suprapunerile SVG** (liniile terenului, constelația, curcubeul, masca de pensulă) folosesc
    `viewBox` 2560×1440 cu `preserveAspectRatio="xMidYMid slice"`, adică exact aceeași încadrare ca
    `object-fit: cover` a picturilor 16:9.
31. **„Locuri libere în septembrie: 81"** cu datele din seed: disponibilitatea din seed e tot programul
    de lucru (07–21). Numărul devine realist când antrenorul setează în admin doar timpul liber pentru
    elevi noi (vezi decizia 13).
